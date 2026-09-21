import pg from 'pg';

const { Client } = pg;

/**
 * RUNNER DE VALIDAÇÃO DOS TIMEOUTS DA ROLE DE MIGRATION (G4.2)
 * 
 * Valida de forma automatizada e factual que lock_timeout e statement_timeout
 * são efetivamente aplicados pelo kernel do PostgreSQL na conexão real da role
 * 'vita_staging_migrator'.
 * 
 * Mantém a conexão bloqueadora Client A viva durante todo o teste de colisão
 * e garante ROLLBACK incondicional via bloco finally.
 */

async function main() {
  console.log('================================================================================');
  console.log('       RUNNER DE COMPROVAÇÃO DE TIMEOUTS DO POSTGRESQL — VITA SAÚDE (G4.2)      ');
  console.log('================================================================================\n');

  const adminDbUrl = process.env.STAGING_ADMIN_DB_URL || 
    'postgresql://vita_staging_admin:staging_db_secret_pass_2026@127.0.0.1:5434/vita_saude_staging';
  const migratorDbUrl = process.env.STAGING_MIGRATOR_DB_URL || 
    'postgresql://vita_staging_migrator:migrator_staging_secret_2026@127.0.0.1:5434/vita_saude_staging';

  let clientAdmin;
  let clientMigrator;

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: COMPROVAÇÃO DO LOCK_TIMEOUT (5000ms / Erro 55P03)
    // -------------------------------------------------------------------------
    console.log('--- TESTE 1: Lock Timeout (5.000 ms) via Colisão Concorrente Mantida ---');

    clientAdmin = new Client({ connectionString: adminDbUrl });
    await clientAdmin.connect();
    console.log('[Client A (Admin)]: Conectado ao banco vita_saude_staging.');

    // Assegura existência da tabela _prisma_migrations para o teste
    await clientAdmin.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Inicia transação bloqueadora no Client A e adquire ACCESS EXCLUSIVE lock
    await clientAdmin.query('BEGIN;');
    await clientAdmin.query('LOCK TABLE "_prisma_migrations" IN ACCESS EXCLUSIVE MODE;');
    console.log('[Client A (Admin)]: Adquiriu ACCESS EXCLUSIVE lock em "_prisma_migrations". Transação mantida aberta...');

    // Conecta Client B como vita_staging_migrator
    clientMigrator = new Client({ connectionString: migratorDbUrl });
    await clientMigrator.connect();
    console.log('[Client B (Migrator)]: Conectado como role "vita_staging_migrator".');

    const lockTzSetting = await clientMigrator.query("SHOW lock_timeout;");
    console.log(`[Client B (Migrator)]: Configuração ativa SHOW lock_timeout = ${lockTzSetting.rows[0].lock_timeout}`);

    const t0Lock = Date.now();
    let lockTimedOut = false;
    let lockErrorCode = null;

    try {
      console.log('[Client B (Migrator)]: Tentando adquirir lock exclusivo na mesma tabela...');
      await clientMigrator.query('ALTER TABLE "_prisma_migrations" ADD COLUMN IF NOT EXISTS _test_lock_probe int;');
    } catch (err) {
      const elapsedMs = Date.now() - t0Lock;
      lockErrorCode = err.code;
      console.log(`[Client B (Migrator)]: Query abortada após ${elapsedMs} ms com erro: [${err.code}] ${err.message}`);

      // Validação do código de erro PostgreSQL: 55P03 = lock_not_available / canceling statement due to lock timeout
      if (err.code === '55P03' && elapsedMs >= 4500 && elapsedMs <= 7000) {
        lockTimedOut = true;
        console.log(`[SUCESSO TESTE 1]: Lock timeout kernel-enforced comprovado em ${elapsedMs} ms (Esperado: ~5000 ms, Código 55P03).\n`);
      } else {
        console.error(`[FALHA TESTE 1]: Código de erro [${err.code}] ou tempo [${elapsedMs} ms] fora do esperado.`);
      }
    }

    // Libera incondicionalmente o lock no Client A
    await clientAdmin.query('ROLLBACK;');
    await clientAdmin.end();
    clientAdmin = null;
    console.log('[Client A (Admin)]: Transação abortada (ROLLBACK) e conexão finalizada. Locks liberados.');

    if (!lockTimedOut) {
      throw new Error(`Falha na comprovação do lock_timeout. Código retornado: ${lockErrorCode}`);
    }

    // -------------------------------------------------------------------------
    // TESTE 2: COMPROVAÇÃO DO STATEMENT_TIMEOUT (30000ms / Erro 57014)
    // -------------------------------------------------------------------------
    console.log('--- TESTE 2: Statement Timeout (30.000 ms) via Execução de Longa Duração ---');

    const stmtSetting = await clientMigrator.query("SHOW statement_timeout;");
    console.log(`[Client B (Migrator)]: Configuração ativa SHOW statement_timeout = ${stmtSetting.rows[0].statement_timeout}`);

    const t0Stmt = Date.now();
    let stmtTimedOut = false;
    let stmtErrorCode = null;

    try {
      console.log('[Client B (Migrator)]: Executando SELECT pg_sleep(35) para provocar o timeout de 30s...');
      await clientMigrator.query('SELECT pg_sleep(35);');
    } catch (err) {
      const elapsedMs = Date.now() - t0Stmt;
      stmtErrorCode = err.code;
      console.log(`[Client B (Migrator)]: Query abortada após ${elapsedMs} ms com erro: [${err.code}] ${err.message}`);

      // Validação do código de erro PostgreSQL: 57014 = query_canceled / canceling statement due to statement timeout
      if (err.code === '57014' && elapsedMs >= 29000 && elapsedMs <= 33000) {
        stmtTimedOut = true;
        console.log(`[SUCESSO TESTE 2]: Statement timeout kernel-enforced comprovado em ${elapsedMs} ms (Esperado: ~30000 ms, Código 57014).\n`);
      } else {
        console.error(`[FALHA TESTE 2]: Código de erro [${err.code}] ou tempo [${elapsedMs} ms] fora do esperado.`);
      }
    }

    if (!stmtTimedOut) {
      throw new Error(`Falha na comprovação do statement_timeout. Código retornado: ${stmtErrorCode}`);
    }

    console.log('================================================================================');
    console.log(' [RESULTADO FINAL]: AMBOS OS TIMEOUTS FORAM HOMOLOGADOS COM SUCESSO FACTUAL.   ');
    console.log('================================================================================');
    process.exit(0);

  } catch (fatalErr) {
    console.error(`\n[FATAL ERROR NO RUNNER DE TIMEOUTS]: ${fatalErr.message}`);
    process.exit(1);
  } finally {
    // Garantia estrita de encerramento para não deixar conexões ou locks pendentes
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
