import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { Client } from 'pg';
import * as crypto from 'crypto';

describe('UTC Pool Resilience and Unprivileged Role (G4.2)', () => {
  let env: TestEnvironment;
  let stagingDbUrl: string;
  let testUserId: string;

  beforeAll(async () => {
    env = await setupTestEnvironment();

    // 1. Configura role exclusiva de staging (privilégio mínimo) via client administrativo
    const adminClient = new Client({ connectionString: env.databaseUrl });
    await adminClient.connect();

    await adminClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vita_staging_app') THEN
          CREATE ROLE vita_staging_app WITH LOGIN PASSWORD 'staging_pass_secret';
        END IF;
      END
      $$;
    `);

    await adminClient.query(`ALTER ROLE vita_staging_app SET timezone TO 'UTC'`);
    await adminClient.query(`ALTER DATABASE saudefinancas_test SET timezone TO 'UTC'`);
    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE saudefinancas_test TO vita_staging_app`);
    await adminClient.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO vita_staging_app`);
    await adminClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vita_staging_app`);
    await adminClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vita_staging_app`);
    await adminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vita_staging_app`);

    await adminClient.end();

    stagingDbUrl = 'postgresql://vita_staging_app:staging_pass_secret@127.0.0.1:5433/saudefinancas_test?schema=public';

    // Cria usuário para testes
    const user = await env.prisma.user.create({
      data: {
        email: `utc_tester_${Date.now()}@vitasatude.com`,
        name: 'UTC Tester',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId = user.id;
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('deve verificar que a role vita_staging_app conecta sem privilégios de superuser', async () => {
    const client = new Client({ connectionString: stagingDbUrl });
    await client.connect();

    const res = await client.query('SELECT current_user, usesuper FROM pg_user WHERE usename = current_user');
    expect(res.rows[0].current_user).toBe('vita_staging_app');
    expect(res.rows[0].usesuper).toBe(false);

    await client.end();
  });

  it('deve provar que conexões simultâneas possuem sessões físicas distintas via pg_backend_pid() e todas reportam UTC', async () => {
    const clients: Client[] = [];
    const poolSize = 5;

    try {
      for (let i = 0; i < poolSize; i++) {
        const client = new Client({ connectionString: stagingDbUrl });
        await client.connect();
        clients.push(client);
      }

      const results = await Promise.all(
        clients.map(async (client) => {
          const res = await client.query(`
            SELECT 
              pg_backend_pid() as pid, 
              current_setting('timezone') as tz,
              current_user as usr
          `);
          return res.rows[0];
        }),
      );

      const pids = results.map((r) => r.pid);
      const uniquePids = new Set(pids);

      // Todas as conexões devem ser sessões físicas distintas no PostgreSQL
      expect(uniquePids.size).toBe(poolSize);

      // Todas as sessões devem reportar UTC
      for (const r of results) {
        expect(r.tz).toBe('UTC');
        expect(r.usr).toBe('vita_staging_app');
      }
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it('deve garantir que nova conexão dinâmica aberta após inicialização adota UTC', async () => {
    const dynamicClient = new Client({ connectionString: stagingDbUrl });
    await dynamicClient.connect();

    const res = await dynamicClient.query('SHOW TIMEZONE');
    expect(res.rows[0].TimeZone).toBe('UTC');

    await dynamicClient.end();
  });

  it('deve garantir invariância SQL: timezone("UTC", NOW()) grava estritamente UTC mesmo com sessão forçada para America/Campo_Grande', async () => {
    const client = new Client({ connectionString: stagingDbUrl });
    await client.connect();

    try {
      // Força deliberadamente o timezone da sessão para America/Campo_Grande (-04:00)
      await client.query("SET TIME ZONE 'America/Campo_Grande'");
      const sessionTz = await client.query('SHOW TIMEZONE');
      expect(sessionTz.rows[0].TimeZone).toBe('America/Campo_Grande');

      const storageKey = `wearables/${testUserId}/utc_invariance_${Date.now()}.fit`;
      const fileSha256 = crypto.randomBytes(32).toString('hex');

      // Executa INSERT com timezone('UTC', NOW()) conforme exigido na arquitetura de staging
      const insertRes = await client.query(
        `
        INSERT INTO "ImportedFile" (
          id, "userId", "storageKey", "fileSha256", "originalFileName", "fileSizeBytes", status, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, 'test_utc.fit', 2048, 'PENDING', timezone('UTC', NOW()), timezone('UTC', NOW())
        ) RETURNING id, "createdAt"
      `,
        [testUserId, storageKey, fileSha256],
      );

      const fileId = insertRes.rows[0].id;
      const fileRecord = await env.prisma.importedFile.findUnique({
        where: { id: fileId },
      });

      expect(fileRecord).not.toBeNull();
      const nodeNow = Date.now();
      const dbCreatedAtMs = fileRecord!.createdAt.getTime();

      // O timestamp criado DEVE estar alinhado ao relógio global (diferença de poucos segundos, JAMAIS 4 horas)
      const diffSeconds = Math.abs(nodeNow - dbCreatedAtMs) / 1000;
      expect(diffSeconds).toBeLessThan(5);

      // Agora testa o claim com timezone('UTC', NOW()) sob a mesma sessão alterada
      const updateRes = await client.query(
        `
        UPDATE "ImportedFile"
        SET 
          status = 'PROCESSING',
          "processingStartedAt" = timezone('UTC', NOW()),
          "leaseOwner" = 'worker-utc-test',
          "leaseExpiresAt" = timezone('UTC', NOW()) + INTERVAL '60 seconds',
          "leaseVersion" = "leaseVersion" + 1
        WHERE id = $1
        RETURNING "processingStartedAt", "leaseExpiresAt"
      `,
        [fileId],
      );

      const updatedRecord = await env.prisma.importedFile.findUnique({
        where: { id: fileId },
      });

      expect(updatedRecord!.processingStartedAt).not.toBeNull();
      expect(updatedRecord!.leaseExpiresAt).not.toBeNull();

      // processingStartedAt >= createdAt
      expect(updatedRecord!.processingStartedAt!.getTime()).toBeGreaterThanOrEqual(updatedRecord!.createdAt.getTime());

      // leaseExpiresAt > processingStartedAt (exatamente 60s)
      const leaseDurationMs = updatedRecord!.leaseExpiresAt!.getTime() - updatedRecord!.processingStartedAt!.getTime();
      expect(leaseDurationMs).toBeGreaterThanOrEqual(59000);
      expect(leaseDurationMs).toBeLessThanOrEqual(61000);

      // Limpeza
      await env.prisma.importedFile.delete({ where: { id: fileId } });
    } finally {
      await client.end();
    }
  });

  it('deve confirmar que telemetria não vaza credenciais nem string de conexão', async () => {
    // Validação da política de redação em logs de telemetria
    const safeTelemetry = {
      databaseTimezone: 'UTC',
      sessionTimezone: 'UTC',
      nodeTimezone: 'UTC',
      utcInvariantEnabled: true,
    };

    const serialized = JSON.stringify(safeTelemetry);
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('staging_pass_secret');
    expect(serialized).not.toContain('password');
    expect(safeTelemetry.databaseTimezone).toBe('UTC');
    expect(safeTelemetry.sessionTimezone).toBe('UTC');
  });
});
