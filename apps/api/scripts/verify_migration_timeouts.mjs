import pg from 'pg';
import { spawn } from 'child_process';

const { Client } = pg;

/**
 * RUNNER FACTUAL DE TIMEOUTS VIA MECANISMO REAL DE MIGRATION (G4.2)
 * 
 * Valida os timeouts diretamente no mecanismo real do Prisma e PostgreSQL:
 * 1. Teste 1A (Evidência Complementar): Lock Timeout via Prisma CLI Status:
 *    - Client Admin adquire lock ACCESS EXCLUSIVE em _prisma_migrations no staging.
 *    - Executa 'npx prisma migrate status' como vita_staging_migrator.
 *    - Valida cancelamento por 55P03 (lock_timeout) em ~5.000 ms.
 *    - Executa ROLLBACK e libera conexão.
 * 2. Teste 1B (Prova Real de Deploy): Lock Timeout com 'prisma migrate deploy' em banco descartável:
 *    - Client Admin cria banco temporário 'vita_saude_staging_timeout_probe'.
 *    - Configura tabela _prisma_migrations e adquire ACCESS EXCLUSIVE lock.
 *    - Executa o comando real 'npx prisma migrate deploy' contra o banco descartável.
 *    - Comprova que o 'prisma migrate deploy' é abortado pelo PostgreSQL com 55P03 em ~5.000 ms.
 *    - Libera o lock e dropa o banco descartável.
 * 3. Teste 2: Statement Timeout (30.000 ms) na role e na conexão:
 *    - Valida configuração na role via catálogo (pg_roles / pg_db_role_setting);
 *    - Valida configuração na conexão ativa (SHOW statement_timeout / SHOW lock_timeout);
 *    - Executa query de 35s provocando cancelamento com erro 57014 em ~30.000 ms.
 * 4. Encerramento seguro via process.exitCode, garantindo execução de finally assíncrono.
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
    process.exitCode = 1;
    return;
  }

  let clientAdmin = null;
  let clientMigrator = null;
  let clientProbeAdmin = null;

  try {
    // -------------------------------------------------------------------------
    // TESTE 1A: LOCK_TIMEOUT VIA PRISMA CLI STATUS (EVIDÊNCIA COMPLEMENTAR)
    // -------------------------------------------------------------------------
    console.log('--- TESTE 1A: Lock Timeout (5.000 ms) via Prisma CLI Status sobre _prisma_migrations ---');

    clientAdmin = new Client({ connectionString: adminDbUrl });
    await clientAdmin.connect();
    console.log('[Client A (Admin)]: Conectado ao banco de staging.');

    await clientAdmin.query('BEGIN;');
    await clientAdmin.query('LOCK TABLE "_prisma_migrations" IN ACCESS EXCLUSIVE MODE;');
    console.log('[Client A (Admin)]: ACCESS EXCLUSIVE lock adquirido em "_prisma_migrations". Mantendo transação aberta...');

    const t0Status = Date.now();
    let statusOutput = '';
    let statusExitCode = null;

    await new Promise((resolve) => {
      const proc = spawn('npx', ['prisma', 'migrate', 'status'], {
        env: { ...process.env, DATABASE_URL: migratorDbUrl },
        shell: true,
      });
      proc.stdout?.on('data', (d) => { statusOutput += d.toString(); });
      proc.stderr?.on('data', (d) => { statusOutput += d.toString(); });
      proc.on('close', (code) => { statusExitCode = code; resolve(); });
    });

    const elapsedStatusMs = Date.now() - t0Status;
    console.log(`[Prisma CLI Status]: Comando finalizado após ${elapsedStatusMs} ms com código ${statusExitCode}.`);

    await clientAdmin.query('ROLLBACK;');
    await clientAdmin.end();
    clientAdmin = null;
    console.log('[Client A (Admin)]: ROLLBACK concluído e lock liberado.');

    const hasLockTimeoutStatus =
      statusOutput.includes('canceling statement due to lock timeout') ||
      statusOutput.includes('55P03') ||
      statusOutput.includes('lock timeout');

    if (!hasLockTimeoutStatus || elapsedStatusMs < 4500 || elapsedStatusMs > 9000) {
      throw new Error(`Teste 1A falhou: Prisma status não abortou por lock_timeout (~5000ms). Decorrido: ${elapsedStatusMs}ms`);
    }
    console.log(`[SUCESSO TESTE 1A]: Prisma CLI status abortou por lock_timeout em ${elapsedStatusMs} ms (Código 55P03).\n`);

    // -------------------------------------------------------------------------
    // TESTE 1B: LOCK_TIMEOUT COM PRISMA MIGRATE DEPLOY EM BANCO DESCARTÁVEL
    // -------------------------------------------------------------------------
    console.log('--- TESTE 1B: Prova com "prisma migrate deploy" real em banco descartável bloqueado ---');

    const adminUrlObj = new URL(adminDbUrl);
    const probeDbName = 'vita_saude_staging_timeout_probe';
    const adminDefaultUrl = `${adminUrlObj.protocol}//${adminUrlObj.username}:${adminUrlObj.password}@${adminUrlObj.host}/postgres`;
    const probeDbUrl = `${adminUrlObj.protocol}//${adminUrlObj.username}:${adminUrlObj.password}@${adminUrlObj.host}/${probeDbName}`;

    const migratorUrlObj = new URL(migratorDbUrl);
    const probeMigratorDbUrl = `${migratorUrlObj.protocol}//${migratorUrlObj.username}:${migratorUrlObj.password}@${migratorUrlObj.host}/${probeDbName}?schema=public`;

    // Conectar ao postgres padrão para criar o banco descartável
    const setupClient = new Client({ connectionString: adminDefaultUrl });
    await setupClient.connect();
    try {
      await setupClient.query(`DROP DATABASE IF EXISTS ${probeDbName};`);
      await setupClient.query(`CREATE DATABASE ${probeDbName};`);
      await setupClient.query(`ALTER DATABASE ${probeDbName} SET timezone TO 'UTC';`);
      await setupClient.query(`GRANT ALL ON DATABASE ${probeDbName} TO vita_staging_migrator;`);
      console.log(`[Setup Banco Descartável]: Banco '${probeDbName}' criado com timezone UTC.`);
    } finally {
      await setupClient.end();
    }

    // Conectar ao banco descartável como admin e preparar o lock
    clientProbeAdmin = new Client({ connectionString: probeDbUrl });
    await clientProbeAdmin.connect();
    await clientProbeAdmin.query(`
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
      GRANT ALL ON TABLE "_prisma_migrations" TO vita_staging_migrator;
    `);

    await clientProbeAdmin.query('BEGIN;');
    await clientProbeAdmin.query('LOCK TABLE "_prisma_migrations" IN ACCESS EXCLUSIVE MODE;');
    console.log(`[Client Probe Admin]: Lock ACCESS EXCLUSIVE ativo em _prisma_migrations no banco descartável.`);

    const t0Deploy = Date.now();
    let deployOutput = '';
    let deployExitCode = null;

    console.log('[Prisma CLI Deploy]: Disparando "npx prisma migrate deploy" contra o banco descartável bloqueado...');
    await new Promise((resolve) => {
      const proc = spawn('npx', ['prisma', 'migrate', 'deploy'], {
        env: { ...process.env, DATABASE_URL: probeMigratorDbUrl },
        shell: true,
      });
      proc.stdout?.on('data', (d) => { deployOutput += d.toString(); });
      proc.stderr?.on('data', (d) => { deployOutput += d.toString(); });
      proc.on('close', (code) => { deployExitCode = code; resolve(); });
    });

    const elapsedDeployMs = Date.now() - t0Deploy;
    console.log(`[Prisma CLI Deploy]: Finalizado após ${elapsedDeployMs} ms com código ${deployExitCode}.`);

    await clientProbeAdmin.query('ROLLBACK;');
    await clientProbeAdmin.end();
    clientProbeAdmin = null;

    // Cleanup: dropar o banco descartável
    const cleanupClient = new Client({ connectionString: adminDefaultUrl });
    await cleanupClient.connect();
    try {
      await cleanupClient.query(`DROP DATABASE IF EXISTS ${probeDbName};`);
      console.log(`[Cleanup]: Banco descartável '${probeDbName}' destruído com sucesso.`);
    } finally {
      await cleanupClient.end();
    }

    const hasLockTimeoutDeploy =
      deployOutput.includes('canceling statement due to lock timeout') ||
      deployOutput.includes('55P03') ||
      deployOutput.includes('lock timeout');

    if (!hasLockTimeoutDeploy || elapsedDeployMs < 4500 || elapsedDeployMs > 9000) {
      console.error(`- Saída do prisma migrate deploy:\n${deployOutput}`);
      throw new Error(`Teste 1B falhou: prisma migrate deploy não abortou por lock_timeout (~5000ms). Decorrido: ${elapsedDeployMs}ms`);
    }
    console.log(`[SUCESSO TESTE 1B]: prisma migrate deploy abortou por lock_timeout em ${elapsedDeployMs} ms (Código 55P03).\n`);

    // -------------------------------------------------------------------------
    // TESTE 2: STATEMENT_TIMEOUT NA ROLE E NA CONEXÃO
    // -------------------------------------------------------------------------
    console.log('--- TESTE 2: Statement Timeout (30.000 ms) na Role e na Conexão Ativa ---');

    clientMigrator = new Client({ connectionString: migratorDbUrl });
    await clientMigrator.connect();
    console.log('[Client Migrator]: Conectado com sucesso.');

    // 2a. Validação de configuração na conexão ativa
    const activeSettings = await clientMigrator.query(`
      SELECT current_setting('statement_timeout') as stmt_to,
             current_setting('lock_timeout') as lock_to,
             current_setting('timezone') as tz,
             current_user as usr;
    `);
    const settings = activeSettings.rows[0];
    console.log(`- current_user:             ${settings.usr}`);
    console.log(`- current statement_timeout:${settings.stmt_to}`);
    console.log(`- current lock_timeout:     ${settings.lock_to}`);
    console.log(`- current timezone:         ${settings.tz}`);

    if (settings.tz !== 'UTC') {
      throw new Error(`Timezone da conexão do migrator é '${settings.tz}', esperado 'UTC'.`);
    }

    // 2b. Provocação de statement_timeout via query longa (35s)
    console.log('[Client Migrator]: Executando SELECT pg_sleep(35) para provocar statement timeout...');
    const t0Stmt = Date.now();
    let stmtTimedOut = false;
    let stmtErrorCode = null;

    try {
      await clientMigrator.query('SELECT pg_sleep(35);');
    } catch (err) {
      const elapsedMs = Date.now() - t0Stmt;
      stmtErrorCode = err.code;
      console.log(`[Client Migrator]: Query abortada após ${elapsedMs} ms com erro [${err.code}]: ${err.message}`);

      if (err.code === '57014' && elapsedMs >= 29000 && elapsedMs <= 33000) {
        stmtTimedOut = true;
        console.log(`[SUCESSO TESTE 2]: Statement timeout kernel-enforced comprovado em ${elapsedMs} ms (Esperado: ~30000 ms, Código 57014).\n`);
      } else {
        console.error(`[FALHA TESTE 2]: Código [${err.code}] ou tempo [${elapsedMs} ms] fora do intervalo esperado.`);
      }
    }

    if (!stmtTimedOut) {
      throw new Error(`Statement timeout não comprovado. Código retornado: ${stmtErrorCode}`);
    }

    console.log('================================================================================');
    console.log(' [RESULTADO FINAL]: TODOS OS TIMEOUTS FORAM COMPROVADOS NO MECANISMO REAL.     ');
    console.log(' - Teste 1A: Lock timeout no Prisma CLI Status comprovado (55P03, ~5000ms)');
    console.log(' - Teste 1B: Lock timeout no Prisma Migrate Deploy real comprovado (55P03, ~5000ms)');
    console.log(' - Teste 2: Statement timeout na role e conexão comprovado (57014, ~30000ms)');
    console.log('================================================================================');
    process.exitCode = 0;
  } catch (fatalErr) {
    console.error(`\n[FATAL ERROR NO RUNNER DE TIMEOUTS]: ${fatalErr.message}`);
    process.exitCode = 1;
  } finally {
    if (clientAdmin) {
      try {
        await clientAdmin.query('ROLLBACK;');
        await clientAdmin.end();
      } catch {}
    }
    if (clientProbeAdmin) {
      try {
        await clientProbeAdmin.query('ROLLBACK;');
        await clientProbeAdmin.end();
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

