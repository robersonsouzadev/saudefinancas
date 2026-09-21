import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPreflight } from '../../scripts/preflight_temporal_check.mjs';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import * as crypto from 'crypto';

describe('Preflight Temporal Read-Only Audit (Exit Codes 0, 1, 2, 3)', () => {
  let env: TestEnvironment;
  let testUserId: string;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    const user = await env.prisma.user.create({
      data: {
        email: `preflight_tester_${Date.now()}@vitasatude.com`,
        name: 'Preflight Tester',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId = user.id;
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('deve retornar Exit Code 0 em banco limpo e compatível', async () => {
    const result = await runPreflight(env.databaseUrl, { silent: true });
    expect(result.exitCode).toBe(0);
    expect(result.deterministicCount).toBe(0);
    expect(result.heuristicCount).toBe(0);
  });

  it('deve retornar Exit Code 1 quando houver violação determinística (processedAt < createdAt)', async () => {
    const now = new Date();
    // Temporariamente remove a constraint para simular um banco corrompido herdado
    await env.prisma.$executeRawUnsafe(`ALTER TABLE "ImportedFile" DROP CONSTRAINT IF EXISTS "chk_imported_file_processed_at"`);

    const badFile = await env.prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey: `wearables/${testUserId}/bad_deterministic.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'bad_deterministic.fit',
        fileSizeBytes: 1024,
        status: 'PROCESSED',
        createdAt: now,
        processedAt: new Date(now.getTime() - 3600000), // 1h antes da criação
      },
    });

    const result = await runPreflight(env.databaseUrl, { silent: true });
    expect(result.exitCode).toBe(1);
    expect(result.deterministicCount).toBeGreaterThanOrEqual(1);

    // Limpa o registro inválido e restaura a constraint
    await env.prisma.importedFile.delete({ where: { id: badFile.id } });
    await env.prisma.$executeRawUnsafe(`
      ALTER TABLE "ImportedFile"
        ADD CONSTRAINT "chk_imported_file_processed_at"
        CHECK ("processedAt" IS NULL OR "processedAt" >= "createdAt")
    `);
  });

  it('deve retornar Exit Code 2 quando houver apenas alerta heurístico (sem violação determinística)', async () => {
    // Insere arquivo com createdAt no futuro (> 5 min)
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const futureFile = await env.prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey: `wearables/${testUserId}/future_heuristic.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'future_heuristic.fit',
        fileSizeBytes: 1024,
        status: 'PENDING',
        createdAt: futureDate,
      },
    });

    const result = await runPreflight(env.databaseUrl, { silent: true });
    expect(result.exitCode).toBe(2);
    expect(result.deterministicCount).toBe(0);
    expect(result.heuristicCount).toBeGreaterThanOrEqual(1);

    // Limpeza
    await env.prisma.importedFile.delete({ where: { id: futureFile.id } });
  });

  it('deve retornar Exit Code 3 em caso de erro operacional (falha de conexão)', async () => {
    const invalidDbUrl = 'postgresql://invalid_user:invalid_pass@127.0.0.1:54999/non_existent_db';
    const result = await runPreflight(invalidDbUrl, { silent: true });
    expect(result.exitCode).toBe(3);
    expect(result.error).toBeDefined();
  });
});
