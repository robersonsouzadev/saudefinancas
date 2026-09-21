import pg from 'pg';
import path from 'path';
import fs from 'fs';

const { Client } = pg;

function maskUuid(id) {
  if (!id || typeof id !== 'string') return id;
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export async function runPreflight(dbUrl, options = {}) {
  const isSilent = options.silent || false;
  const privateReportPath = options.privateReportPath || null;
  const allowEmpty = options.allowEmpty ?? (
    process.env.ALLOW_EMPTY_SCHEMA === 'true' || 
    process.argv.includes('--allow-empty')
  );

  const log = (...args) => {
    if (!isSilent) console.log(...args);
  };

  log('================================================================================');
  log('     PREFLIGHT AUDITORIA TEMPORAL READ-ONLY DE BANCO DE DADOS (VITA SAÚDE)      ');
  log('================================================================================\n');

  let client;
  try {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  } catch (connErr) {
    log(`[FATAL OPERATIONAL ERROR] Falha ao conectar ao banco de dados: ${connErr.message}`);
    return { exitCode: 3, error: `Conexão recusada: ${connErr.message}` };
  }

  try {
    // 1. Verificação de sessão e fuso horário
    const tzRes = await client.query('SHOW TIMEZONE');
    const dbTz = tzRes.rows[0]?.TimeZone || tzRes.rows[0]?.timezone || 'UNKNOWN';
    log(`- Sessão PostgreSQL ativa: TimeZone = ${dbTz}`);

    // 2. Verificação de existência e compatibilidade estrutural do Schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));

    // Caso A: Banco totalmente vazio (zero tabelas no schema public)
    if (existingTables.size === 0) {
      if (allowEmpty) {
        log('[INFO] Modo explícito --allow-empty autorizado e verificado: banco de dados sem tabelas (bootstrap inicial).');
        log('[RESULTADO]: SUCESSO (Exit Code 0). Banco novo vazio comprovado. Deploy autorizado.');
        return {
          exitCode: 0,
          status: 'EMPTY_BOOTSTRAP_VERIFIED',
          deterministicCount: 0,
          heuristicCount: 0,
          violations: [],
          warnings: [],
        };
      } else {
        log('[FATAL OPERATIONAL ERROR] Schema incompatível: O banco de dados está vazio (0 tabelas), mas a flag explícita --allow-empty não foi especificada.');
        log('[RESULTADO]: ERRO OPERACIONAL / SCHEMA INCOMPATÍVEL (Exit Code 3). Para bootstrap inicial, execute com --allow-empty.');
        return {
          exitCode: 3,
          error: 'SCHEMA_INCOMPATIBLE_EMPTY_WITHOUT_FLAG',
        };
      }
    }

    // Caso B: Verificação estrita de tabelas obrigatórias do módulo Wearables
    const requiredTables = ['ImportedFile', 'WorkoutActivity', 'SyncExecution'];
    const missingTables = requiredTables.filter((t) => !existingTables.has(t));
    if (missingTables.length > 0) {
      log(`[FATAL OPERATIONAL ERROR] Schema incompatível: Tabelas obrigatórias ausentes no banco: ${missingTables.join(', ')}.`);
      log('[RESULTADO]: SCHEMA INCOMPATÍVEL (Exit Code 3). O banco possui tabelas, mas não contém a estrutura esperada para auditoria.');
      return {
        exitCode: 3,
        error: `SCHEMA_INCOMPATIBLE_MISSING_TABLES: ${missingTables.join(', ')}`,
      };
    }

    // Caso C: Verificação estrita de colunas temporais obrigatórias
    const columnsRes = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1)
    `, [requiredTables]);

    const tableColumns = new Map();
    for (const r of columnsRes.rows) {
      if (!tableColumns.has(r.table_name)) {
        tableColumns.set(r.table_name, new Set());
      }
      tableColumns.get(r.table_name).add(r.column_name);
    }

    const requiredColumns = {
      ImportedFile: ['createdAt', 'processingStartedAt', 'processedAt', 'processingDurationMs'],
      WorkoutActivity: ['startedAt', 'finishedAt'],
      SyncExecution: ['startedAt', 'completedAt'],
    };

    const missingColumns = [];
    for (const [table, cols] of Object.entries(requiredColumns)) {
      const existingCols = tableColumns.get(table) || new Set();
      for (const col of cols) {
        if (!existingCols.has(col)) {
          missingColumns.push(`${table}.${col}`);
        }
      }
    }

    if (missingColumns.length > 0) {
      log(`[FATAL OPERATIONAL ERROR] Schema incompatível: Colunas temporais obrigatórias ausentes: ${missingColumns.join(', ')}.`);
      log('[RESULTADO]: SCHEMA INCOMPATÍVEL (Exit Code 3). O banco não possui as colunas necessárias para auditoria temporal.');
      return {
        exitCode: 3,
        error: `SCHEMA_INCOMPATIBLE_MISSING_COLUMNS: ${missingColumns.join(', ')}`,
      };
    }

    // 3. Execução das Auditorias Temporais nos dados
    const deterministicViolations = [];
    const heuristicWarnings = [];
    const privateDetails = [];

    // --- CHECK 1: ImportedFile processingStartedAt < createdAt ---
    const check1 = await client.query(`
      SELECT id, "createdAt", "processingStartedAt"
      FROM "ImportedFile"
      WHERE "processingStartedAt" IS NOT NULL AND "processingStartedAt" < "createdAt"
    `);
    for (const r of check1.rows) {
      deterministicViolations.push({
        table: 'ImportedFile',
        constraint: 'chk_imported_file_processing_started_at',
        id: maskUuid(r.id),
        detail: `processingStartedAt (${r.processingStartedAt.toISOString()}) < createdAt (${r.createdAt.toISOString()})`,
      });
      privateDetails.push({ rule: 'chk_imported_file_processing_started_at', id: r.id, ...r });
    }

    // --- CHECK 2: ImportedFile processedAt < createdAt ---
    const check2 = await client.query(`
      SELECT id, "createdAt", "processedAt",
             EXTRACT(EPOCH FROM ("createdAt" - "processedAt")) as diff_seconds
      FROM "ImportedFile"
      WHERE "processedAt" IS NOT NULL AND "processedAt" < "createdAt"
    `);
    for (const r of check2.rows) {
      const diffSec = Number(r.diff_seconds || 0);
      const isLikelyUtcMinus4 = diffSec >= 13800 && diffSec <= 15000; // 4h ± 10min
      deterministicViolations.push({
        table: 'ImportedFile',
        constraint: 'chk_imported_file_processed_at',
        id: maskUuid(r.id),
        detail: `processedAt (${r.processedAt.toISOString()}) < createdAt (${r.createdAt.toISOString()}) [Divergência: ${(diffSec / 3600).toFixed(2)}h${isLikelyUtcMinus4 ? ' - PADRÃO UTC-4 DETECTADO' : ''}]`,
      });
      privateDetails.push({ rule: 'chk_imported_file_processed_at', id: r.id, isLikelyUtcMinus4, ...r });
    }

    // --- CHECK 3: ImportedFile processingDurationMs < 0 ---
    const check3 = await client.query(`
      SELECT id, "processingDurationMs"
      FROM "ImportedFile"
      WHERE "processingDurationMs" IS NOT NULL AND "processingDurationMs" < 0
    `);
    for (const r of check3.rows) {
      deterministicViolations.push({
        table: 'ImportedFile',
        constraint: 'chk_imported_file_duration_positive',
        id: maskUuid(r.id),
        detail: `processingDurationMs (${r.processingDurationMs}) < 0`,
      });
      privateDetails.push({ rule: 'chk_imported_file_duration_positive', id: r.id, ...r });
    }

    // --- CHECK 4: WorkoutActivity finishedAt < startedAt ---
    const check4 = await client.query(`
      SELECT id, "startedAt", "finishedAt"
      FROM "WorkoutActivity"
      WHERE "finishedAt" IS NOT NULL AND "finishedAt" < "startedAt"
    `);
    for (const r of check4.rows) {
      deterministicViolations.push({
        table: 'WorkoutActivity',
        constraint: 'chk_workout_activity_finished_at',
        id: maskUuid(r.id),
        detail: `finishedAt (${r.finishedAt.toISOString()}) < startedAt (${r.startedAt.toISOString()})`,
      });
      privateDetails.push({ rule: 'chk_workout_activity_finished_at', id: r.id, ...r });
    }

    // --- CHECK 5: SyncExecution completedAt < startedAt ---
    const check5 = await client.query(`
      SELECT id, "startedAt", "completedAt"
      FROM "SyncExecution"
      WHERE "completedAt" IS NOT NULL AND "completedAt" < "startedAt"
    `);
    for (const r of check5.rows) {
      deterministicViolations.push({
        table: 'SyncExecution',
        constraint: 'chk_sync_execution_completed_at',
        id: maskUuid(r.id),
        detail: `completedAt (${r.completedAt.toISOString()}) < startedAt (${r.startedAt.toISOString()})`,
      });
      privateDetails.push({ rule: 'chk_sync_execution_completed_at', id: r.id, ...r });
    }

    // --- CHECK 6 (Heurística): Registros sem violação determinística mas com createdAt no futuro ---
    const check6 = await client.query(`
      SELECT id, "createdAt"
      FROM "ImportedFile"
      WHERE "createdAt" > (timezone('UTC', NOW()) + INTERVAL '5 minutes')
    `);
    for (const r of check6.rows) {
      heuristicWarnings.push({
        table: 'ImportedFile',
        category: 'HEURISTIC_FUTURE_TIMESTAMP',
        id: maskUuid(r.id),
        detail: `createdAt (${r.createdAt.toISOString()}) está mais de 5 minutos no futuro em relação ao relógio UTC do banco.`,
      });
      privateDetails.push({ rule: 'HEURISTIC_FUTURE_TIMESTAMP', id: r.id, ...r });
    }

    // Emissão do relatório público sanitizado
    log('--------------------------------------------------------------------------------');
    log('                   SUMÁRIO DA AUDITORIA TEMPORAL (READ-ONLY)                    ');
    log('--------------------------------------------------------------------------------');
    log(`- Violações Determinísticas Encontradas: ${deterministicViolations.length}`);
    log(`- Alertas Heurísticos Encontrados:       ${heuristicWarnings.length}`);

    if (deterministicViolations.length > 0) {
      log('\n[VIOLAÇÕES DETERMINÍSTICAS - DEPLOY BLOQUEADO]');
      console.table(deterministicViolations);
    }

    if (heuristicWarnings.length > 0) {
      log('\n[ALERTAS HEURÍSTICOS - REQUER REVISÃO OPERACIONAL]');
      console.table(heuristicWarnings);
    }

    // Geração de relatório privado para o DBA se solicitado
    if (privateReportPath && privateDetails.length > 0) {
      fs.writeFileSync(privateReportPath, JSON.stringify(privateDetails, null, 2));
      log(`\n[DBA AUDIT] Relatório irrestrito gravado localmente em: ${privateReportPath}`);
    }

    // Determinação dos códigos de saída:
    // Exit Code 0: zero violações e zero alertas
    // Exit Code 1: violação determinística presente (prevalece sobre alertas)
    // Exit Code 2: somente alertas heurísticos (sem violação determinística)
    let exitCode = 0;
    if (deterministicViolations.length > 0) {
      exitCode = 1;
      log('\n[RESULTADO]: FALHA (Exit Code 1). O banco contém violações determinísticas de invariantes temporais. O prisma migrate deploy DEVE SER INTERROMPIDO.');
    } else if (heuristicWarnings.length > 0) {
      exitCode = 2;
      log('\n[RESULTADO]: ATENÇÃO (Exit Code 2). Alertas heurísticos identificados para análise manual. Nenhuma constraint determinística foi violada.');
    } else {
      exitCode = 0;
      log('\n[RESULTADO]: SUCESSO (Exit Code 0). Banco 100% em conformidade com as constraints temporais. Deploy autorizado.');
    }

    return {
      exitCode,
      deterministicCount: deterministicViolations.length,
      heuristicCount: heuristicWarnings.length,
      violations: deterministicViolations,
      warnings: heuristicWarnings,
    };
  } catch (queryErr) {
    log(`[FATAL OPERATIONAL ERROR] Erro durante execução das queries de preflight: ${queryErr.message}`);
    return { exitCode: 3, error: queryErr.message };
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

// Execução CLI direta
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('preflight_temporal_check.mjs')) {
  const PG_PORT = process.env.PG_PORT || 5434;
  const dbUrl = process.env.DATABASE_URL || `postgresql://vita_staging_app:staging_pass@127.0.0.1:${PG_PORT}/vita_saude_staging?schema=public`;

  runPreflight(dbUrl).then((result) => {
    process.exit(result.exitCode);
  }).catch((err) => {
    console.error('Erro fatal inesperado no CLI:', err);
    process.exit(3);
  });
}
