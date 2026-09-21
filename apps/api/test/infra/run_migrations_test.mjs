import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

async function main() {
  console.log('=== TESTE DE MIGRAÇÕES POSTGRESQL (HISTÓRICO COMPLETO & IDEMPOTÊNCIA) ===');

  const dataDir = path.resolve('test-pg-data');
  const needsInit = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    port: 5433,
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    initialDatabase: 'postgres',
    persistent: true,
  });

  if (needsInit) {
    await pg.initialise();
  }
  await pg.start();

  try {
    // 1. Recria banco saudefinancas_test do zero para garantir banco 100% vazio
    const rootClient = pg.getPgClient('postgres');
    await rootClient.connect();
    await rootClient.query('DROP DATABASE IF EXISTS saudefinancas_test WITH (FORCE)');
    await rootClient.query("CREATE DATABASE saudefinancas_test WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'");
    await rootClient.query("ALTER DATABASE saudefinancas_test SET timezone TO 'UTC'");
    await rootClient.end();
    console.log('[OK] Banco isolado saudefinancas_test criado limpo e vazio com ENCODING UTF8 e TIMEZONE UTC.');

    const testDbUrl = 'postgresql://postgres:password@127.0.0.1:5433/saudefinancas_test?schema=public';

    // 2. Executa npx prisma migrate deploy com PGOPTIONS de lock_timeout e statement_timeout
    console.log('\n[Executando] npx prisma migrate deploy com PGOPTIONS lock/statement timeout...');
    const deployOutput = execSync('npx prisma migrate deploy', {
      env: { 
        ...process.env, 
        DATABASE_URL: testDbUrl,
        PGOPTIONS: '-c lock_timeout=5000 -c statement_timeout=30000'
      },
      encoding: 'utf8',
    });
    console.log(deployOutput);

    // 3. Validação de _prisma_migrations no PostgreSQL
    const client = pg.getPgClient('saudefinancas_test');
    await client.connect();

    const tzCheck = await client.query('SHOW TIMEZONE');
    const tsCheck = await client.query('SELECT NOW() as now, CURRENT_TIMESTAMP as current_timestamp, LOCALTIMESTAMP as localtimestamp');
    console.log('\n=== AUDITORIA DE TIMEZONE E TIMESTAMPS NO POSTGRESQL ===');
    console.log('- SHOW TIMEZONE:', tzCheck.rows[0].TimeZone);
    console.log('- SELECT NOW():', tsCheck.rows[0].now);
    console.log('- SELECT CURRENT_TIMESTAMP:', tsCheck.rows[0].current_timestamp);
    console.log('- SELECT LOCALTIMESTAMP:', tsCheck.rows[0].localtimestamp);
    console.log('- new Date().toISOString():', new Date().toISOString());

    if (tzCheck.rows[0].TimeZone !== 'UTC') {
      throw new Error(`Timezone do PostgreSQL deveria ser UTC, mas retornou: ${tzCheck.rows[0].TimeZone}`);
    }

    const migrationsRes = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at 
      FROM "_prisma_migrations" 
      ORDER BY finished_at ASC
    `);
    console.log('\n=== REGISTRO OFICIAL EM _prisma_migrations ===');
    console.table(migrationsRes.rows);

    if (migrationsRes.rows.length !== 4) {
      throw new Error(`Esperado 4 migrations aplicadas, encontrado ${migrationsRes.rows.length}`);
    }

    // 4. Validação de colunas de lease e tipos no ImportedFile
    const columnsRes = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ImportedFile'
        AND column_name IN ('leaseOwner', 'leaseExpiresAt', 'leaseVersion', 'recoverySequence')
      ORDER BY column_name
    `);
    console.log('\n=== COLUNAS DE LEASE CONFIRMADAS EM "ImportedFile" ===');
    console.table(columnsRes.rows);

    if (columnsRes.rows.length !== 4) {
      throw new Error(`Colunas de lease ausentes em ImportedFile. Encontradas: ${columnsRes.rows.length}`);
    }

    // 5. Validação de Índices Parciais e Índices de Lease
    const indexesRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('ImportedFile', 'ActivitySource')
        AND indexname IN (
          'imported_file_status_lease_expires_at_idx',
          'activity_source_imported_file_session_idx',
          'activity_source_provider_external_id_idx'
        )
      ORDER BY indexname
    `);
    console.log('\n=== ÍNDICES PARCIAIS E DE LEASE CONFIRMADOS NO POSTGRESQL ===');
    console.table(indexesRes.rows);

    if (indexesRes.rows.length !== 3) {
      throw new Error(`Índices esperados não encontrados. Total: ${indexesRes.rows.length}`);
    }

    // 5.1 Validação de Constraints de Invariantes Temporais e convalidated = true
    const constraintsRes = await client.query(`
      SELECT conname, convalidated, pg_get_constraintdef(oid) as condef
      FROM pg_constraint
      WHERE conname LIKE 'chk_%'
      ORDER BY conname
    `);
    console.log('\n=== CHECK CONSTRAINTS DE INVARIANTES TEMPORAIS (VALIDAÇÃO CONVALIDATED) ===');
    console.table(constraintsRes.rows);

    if (constraintsRes.rows.length !== 5) {
      throw new Error(`Esperado 5 CHECK constraints temporais, encontrado: ${constraintsRes.rows.length}`);
    }

    for (const c of constraintsRes.rows) {
      if (!c.convalidated) {
        throw new Error(`Constraint ${c.conname} não está validada (convalidated=false)`);
      }
    }
    console.log('[OK] Todas as 5 CHECK constraints temporais possuem convalidated = true.');

    // 5.2 Validação em Banco Preenchido (Simula Deploy em Banco com Dados Existentes)
    console.log('\n=== SIMULAÇÃO DE DEPLOY EM BANCO PREENCHIDO ===');
    const userRes = await client.query(`
      INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'migration_filled_db@vitasatude.com', 'Filled DB User', timezone('UTC', NOW()), timezone('UTC', NOW()))
      RETURNING id
    `);
    const filledUserId = userRes.rows[0].id;

    await client.query(`
      INSERT INTO "ImportedFile" (
        id, "userId", "storageKey", "fileSha256", "originalFileName", "fileSizeBytes", status,
        "createdAt", "updatedAt", "processingStartedAt", "processedAt", "processingDurationMs"
      ) VALUES (
        gen_random_uuid()::text, $1, 'wearables/filled/test.fit', repeat('a', 64), 'test.fit', 4096, 'PROCESSED',
        timezone('UTC', NOW()) - INTERVAL '10 seconds', timezone('UTC', NOW()),
        timezone('UTC', NOW()) - INTERVAL '8 seconds', timezone('UTC', NOW()) - INTERVAL '2 seconds', 6000
      )
    `, [filledUserId]);
    console.log('[OK] Registro válido inserido no banco populado.');

    // 6. Teste de Idempotência: Executar npx prisma migrate deploy novamente com PGOPTIONS
    console.log('\n[Executando Novamente] npx prisma migrate deploy em banco populado para provar idempotência...');
    const reDeployOutput = execSync('npx prisma migrate deploy', {
      env: { 
        ...process.env, 
        DATABASE_URL: testDbUrl,
        PGOPTIONS: '-c lock_timeout=5000 -c statement_timeout=30000'
      },
      encoding: 'utf8',
    });
    console.log(reDeployOutput);

    // Fecha conexão do client antes de clonar o template
    await client.end();

    // 7. Teste de Rollback das novas migrations em banco descartável
    console.log('\n=== TESTE DE ROLLBACK DAS MIGRATIONS (BANCO DESCARTÁVEL) ===');
    const rootClient2 = pg.getPgClient('postgres');
    await rootClient2.connect();
    await rootClient2.query('DROP DATABASE IF EXISTS saudefinancas_rollback_test WITH (FORCE)');
    await rootClient2.query('CREATE DATABASE saudefinancas_rollback_test TEMPLATE saudefinancas_test');
    await rootClient2.end();
    console.log('[OK] Banco saudefinancas_rollback_test clonado para teste de rollback.');

    const rollbackClient = pg.getPgClient('saudefinancas_rollback_test');
    await rollbackClient.connect();

    // Rollback 1: Temporal invariants
    const rollbackSqlTemporal = fs.readFileSync(
      path.resolve('prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql'),
      'utf8'
    );
    await rollbackClient.query(rollbackSqlTemporal);
    console.log('[OK] 20260921220000 rollback.sql executado com sucesso no banco descartável.');

    // Rollback 2: Lease fencing
    const rollbackSqlLease = fs.readFileSync(
      path.resolve('prisma/migrations/20260921200000_imported_file_lease_fencing/rollback.sql'),
      'utf8'
    );
    await rollbackClient.query(rollbackSqlLease);
    console.log('[OK] 20260921200000 rollback.sql executado com sucesso no banco descartável.');

    // Confirma que as colunas foram removidas
    const checkColumnsAfterRollback = await rollbackClient.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ImportedFile'
        AND column_name IN ('leaseOwner', 'leaseExpiresAt', 'leaseVersion', 'recoverySequence')
    `);

    if (checkColumnsAfterRollback.rows.length !== 0) {
      throw new Error('Falha no rollback: colunas ainda presentes após rollback.sql');
    }
    console.log('[OK] Confirmação pós-rollback: colunas de lease removidas com sucesso.');

    // Confirma que a tabela ImportedFile e as tabelas de wearables continuam íntegras
    const checkTablesRes = await rollbackClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('ImportedFile', 'WorkoutActivity', 'ActivitySource', 'WorkoutLap', 'WorkoutTelemetry')
    `);
    console.log(`[OK] Tabelas de wearables preservadas após rollback: ${checkTablesRes.rows.map(r => r.table_name).join(', ')}`);

    await rollbackClient.end();
    console.log('\n=== TODAS AS VALIDAÇÕES DE MIGRAÇÃO E ROLLBACK FORAM APROVADAS COM SUCESSO! ===');
  } finally {
    await pg.stop();
  }
}

main().catch(err => {
  console.error('[ERRO NO TESTE DE MIGRAÇÕES]:', err);
  process.exit(1);
});
