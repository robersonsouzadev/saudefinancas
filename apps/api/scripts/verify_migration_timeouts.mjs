import pg from 'pg';
import { spawn } from 'child_process';

const { Client } = pg;

/**
 * RUNNER FACTUAL DE TIMEOUTS VIA MECANISMO REAL DE MIGRATION (G4.2)
 * 
 * Valida os timeouts diretamente no mecanismo real do Prisma e PostgreSQL:
 * 1. Lock Timeout:
 *    - Client A (Admin) adquire lock ACCESS EXCLUSIVE em _prisma_migrations e mantém aberto.
 *    - Executa o comando real 'npx prisma migrate status' (ou deploy) como vita_staging_migrator.
 *    - Valida que o Prisma é abortado pelo kernel do PostgreSQL com erro 55P03 (lock_timeout)
 *      em aproximadamente 5.000 ms, SEM modificar a tabela _prisma_migrations nem criar colunas probe.
 *    - Client A executa ROLLBACK incondicional via bloco finally.
 * 2. Statement Timeout:
 *    - vita_staging_migrator executa query de longa duração e valida cancelamento
 *      com erro 57014 (statement_timeout) em aproximadamente 30.000 ms.
 * 
 * SEM CREDENCIAIS FALLBACK: Variáveis de ambiente são estritamente obrigatórias.
 */

async function main() {
  console.log('================================================================================');
  console.log('       RUNNER DE COMPROVAÇÃO DE TIMEOUTS DE MIGRATION — VITA SAÚDE (G4.2)       ');
  console.log('================================================================================\n');

  const adminDbUrl = process.env.STAGING_ADMIN_DB_URL;
  const migratorDbUrl = process.env.STAGING_MIGRATOR_DB_URL;

  if (!adminDbUrl || !migratorDbUrl) {
    console.error('[ERRO DE CONFIGURAÇÃO]: Variáveis STAGING_ADMIN_DB_URL e STAGING_MIGRATOR_DB_URL são obrigatórias.');
    console.error('Nenhuma credencial fallback é permitida por razões de segurança.');
    process.exit(1);
  }

  let clientAdmin = null;
  let clientMigrator = null;

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: LOCK_TIMEOUT (5.000 ms) PELO MECANISMO REAL DO PRISMA
    // -------------------------------------------------------------------------
    console.log('--- TESTE 1: Lock Timeout (5.000 ms) via Prisma CLI Real sobre _prisma_migrations ---');

    clientAdmin = new Client({ connectionString: adminDbUrl });
    await clientAdmin.connect();
    console.log('[Client A (Admin)]: Conectado ao banco de staging.');

    // Adquire lock ACCESS EXCLUSIVE na tabela de migrações e mantém a transação aberta
    await clientAdmin.query('BEGIN;');
    await clientAdmin.query('LOCK TABLE "_prisma_migrations" IN ACCESS EXCLUSIVE MODE;');
    console.log('[Client A (Admin)]: ACCESS EXCLUSIVE lock adquirido em "_prisma_migrations". Mantendo transação aberta...');

    const t0Prisma = Date.now();
    let prismaOutput = '';
    let prismaExitCode = null;

    console.log('[Prisma CLI]: Disparando "npx prisma migrate status" como vita_staging_migrator...');
    
    // Executa o comando real do Prisma como vita_staging_migrator
    await new Promise((resolve) => {
      const proc = spawn('npx', ['prisma', 'migrate', 'status'], {
        env: {
          ...process.env,
          DATABASE_URL: migratorDbUrl,
        },
        shell: true,
      });

      proc.stdout?.on('data', (data) => {
        prismaOutput += data.toString();
      });
      proc.stderr?.on('data', (data) => {
        prismaOutput += data.toString();
      });

      proc.on('close', (code) => {
        prismaExitCode = code;
        resolve();
      });
    });

    const elapsedPrismaMs = Date.now() - t0Prisma;
    console.log(`[Prisma CLI]: Comando finalizado após ${elapsedPrismaMs} ms com código de saída ${prismaExitCode}.`);

    // Libera imediatamente o lock
    await clientAdmin.query('ROLLBACK;');
    await clientAdmin.end();
    clientAdmin = null;
    console.log('[Client A (Admin)]: Transação com ROLLBACK encerrada. Lock liberado.');

    // Verificação factual do lock timeout
    const hasLockTimeoutMsg = 
      prismaOutput.includes('canceling statement due to lock timeout') || 
      prismaOutput.includes('55P03') ||
      prismaOutput.includes('lock timeout');

    if (!hasLockTimeoutMsg || elapsedPrismaMs < 4500 || elapsedPrismaMs > 9000) {
      console.error(`\n[FALHA TESTE 1]: Prisma não abortou por lock_timeout no intervalo esperado (~5000ms).`);
      console.error(`- Tempo Decorrido: ${elapsedPrismaMs} ms`);
      console.error(`- Mensagem detectada: ${hasLockTimeoutMsg}`);
      console.error(`- Saída do Prisma:\n${prismaOutput}`);
      throw new Error(`Lock timeout não comprovado no Prisma CLI.`);
    }

    console.log(`[SUCESSO TESTE 1]: Prisma CLI abortou por lock_timeout em ${elapsedPrismaMs} ms (Esperado: ~5000 ms, Código 55P03).\n`);

    // -------------------------------------------------------------------------
    // TESTE 2: STATEMENT_TIMEOUT (30.000 ms) NA ROLE VITA_STAGING_MIGRATOR
    // -------------------------------------------------------------------------
    console.log('--- TESTE 2: Statement Timeout (30.000 ms) via Query de Longa Duração ---');

    clientMigrator = new Client({ connectionString: migratorDbUrl });
    await clientMigrator.connect();
    console.log('[Client B (Migrator)]: Conectado como role "vita_staging_migrator".');

    const stmtSetting = await clientMigrator.query("SHOW statement_timeout;");
    console.log(`[Client B (Migrator)]: Configuração ativa SHOW statement_timeout = ${stmtSetting.rows[0].statement_timeout}`);

    const t0Stmt = Date.now();
    let stmtTimedOut = false;
    let stmtErrorCode = null;

    try {
      console.log('[Client B (Migrator)]: Executando SELECT pg_sleep(35) para provocar statement timeout...');
      await clientMigrator.query('SELECT pg_sleep(35);');
    } catch (err) {
      const elapsedMs = Date.now() - t0Stmt;
      stmtErrorCode = err.code;
      console.log(`[Client B (Migrator)]: Query abortada após ${elapsedMs} ms com erro: [${err.code}] ${err.message}`);

      // 57014 = query_canceled (canceling statement due to statement timeout)
      if (err.code === '57014' && elapsedMs >= 29000 && elapsedMs <= 33000) {
        stmtTimedOut = true;
        console.log(`[SUCESSO TESTE 2]: Statement timeout kernel-enforced comprovado em ${elapsedMs} ms (Esperado: ~30000 ms, Código 57014).\n`);
      } else {
        console.error(`[FALHA TESTE 2]: Código [${err.code}] ou tempo [${elapsedMs} ms] fora do intervalo esperado.`);
      }
    }

    if (!stmtTimedOut) {
      throw new Error(`Statement timeout não comprovado. Código: ${stmtErrorCode}`);
    }

    console.log('================================================================================');
    console.log(' [RESULTADO FINAL]: AMBOS OS TIMEOUTS FORAM COMPROVADOS NO MECANISMO REAL.     ');
    console.log('================================================================================');
    process.exit(0);

  } catch (fatalErr) {
    console.error(`\n[FATAL ERROR NO RUNNER DE TIMEOUTS]: ${fatalErr.message}`);
    process.exit(1);
  } finally {
    if (clientAdmin) {
      try {
        await clientAdmin.query('ROLLBACK;');
        await clientAdmin.end();
      } catch {}
    }
    if (clientMigrator) {
      try {
        await clientMigrator.end();
      } catch {}
    }
  }
}

main();
