import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { PrismaClient, ImportStatus } from '@prisma/client';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { OutboxReconciliationService } from '../../src/modules/wearables/services/outbox-reconciliation.service';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('Testes com Redis e BullMQ Reais (G4.1)', () => {
  let env: TestEnvironment;
  let prisma: PrismaClient;
  let queue: Queue;
  let storage: PrivateObjectStorageService;
  let reconciler: OutboxReconciliationService;
  let testUserId: string;

  const redisConnection = { host: '127.0.0.1', port: 6380 };

  beforeAll(async () => {
    env = await setupTestEnvironment();
    prisma = env.prisma;

    const user = await prisma.user.create({
      data: {
        email: `redis_test_${Date.now()}@vitasatude.com`,
        name: 'Usuário Teste Redis',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId = user.id;

    queue = new Queue('test-wearables-fit-import', { connection: redisConnection });
    storage = new PrivateObjectStorageService(new ConfigService());
    reconciler = new OutboxReconciliationService(prisma as any, storage, queue);
  }, 30000);

  afterAll(async () => {
    await queue.close();
    await teardownTestEnvironment();
  });

  it('1. Deve enfileirar job com jobId = `${importId}:dispatch:0` no Redis real', async () => {
    const importId = crypto.randomUUID();
    const jobId = `${importId}:dispatch:0`;

    const job = await queue.add(
      'process-fit',
      { importId, sequence: 0 },
      { jobId, removeOnComplete: true, removeOnFail: false },
    );

    expect(job.id).toBe(jobId);
    expect(job.data.importId).toBe(importId);
    expect(job.data.sequence).toBe(0);

    const retrieved = await queue.getJob(jobId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(jobId);
  });

  it('2. Deve ignorar enfileiramento duplicado com o mesmo jobId (Deduplicação nativa do BullMQ)', async () => {
    const importId = crypto.randomUUID();
    const jobId = `${importId}:dispatch:0`;

    const job1 = await queue.add(
      'process-fit',
      { importId, sequence: 0 },
      { jobId },
    );

    // Tentativa de adicionar o mesmo jobId novamente
    const job2 = await queue.add(
      'process-fit',
      { importId, sequence: 0 },
      { jobId },
    );

    expect(job1.id).toBe(job2.id);

    const counts = await queue.getJobCounts('waiting');
    expect(counts.waiting).toBeGreaterThanOrEqual(1);
  });

  it('3. Deve aceitar enfileiramento de recuperação com jobId único `${importId}:recovery:1` sem conflito', async () => {
    const importId = crypto.randomUUID();
    const initialJobId = `${importId}:dispatch:0`;
    const recoveryJobId = `${importId}:recovery:1`;

    await queue.add('process-fit', { importId, sequence: 0 }, { jobId: initialJobId });

    // Job de recuperação com sequência incrementada
    const recoveryJob = await queue.add(
      'process-fit',
      { importId, sequence: 1 },
      { jobId: recoveryJobId },
    );

    expect(recoveryJob.id).toBe(recoveryJobId);
    expect(recoveryJob.id).not.toBe(initialJobId);
  });

  it('4. Reconciliador deve recuperar atomicamente job PROCESSING expirado para PENDING e re-enfileirar', async () => {
    // Cria arquivo travado com lease expirado no banco PostgreSQL real
    const file = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey: `wearables/${testUserId}/2026/09/stuck_${Date.now()}.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'stuck_run.fit',
        fileSizeBytes: 2048,
        status: ImportStatus.PROCESSING,
        leaseOwner: 'worker-dead-pod',
        leaseVersion: 1n,
      },
    });

    // Expira lease usando o relógio UTC do PostgreSQL
    await prisma.$executeRaw`
      UPDATE "ImportedFile"
      SET "leaseExpiresAt" = timezone('UTC', NOW()) - (60 * INTERVAL '1 second')
      WHERE id = ${file.id}
    `;

    // Executa reconciliador
    const recoveredCount = await reconciler.reconcileStuckProcessing();
    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // Valida transição no PostgreSQL: voltou para PENDING, lease liberado e recoverySequence = 1
    const updated = await prisma.importedFile.findUnique({ where: { id: file.id } });
    expect(updated?.status).toBe(ImportStatus.PENDING);
    expect(updated?.leaseOwner).toBeNull();
    expect(updated?.leaseExpiresAt).toBeNull();
    expect(updated?.recoverySequence).toBe(1);

    // Valida que o job de recuperação foi postado no BullMQ com jobId determinístico
    const expectedRecoveryJobId = `${file.id}:recovery:1`;
    const recoveryJob = await queue.getJob(expectedRecoveryJobId);
    expect(recoveryJob).not.toBeNull();
    expect(recoveryJob?.id).toBe(expectedRecoveryJobId);
    expect(recoveryJob?.data.importId).toBe(file.id);
    expect(recoveryJob?.data.sequence).toBe(1);
  });

  it('5. Worker BullMQ em processo de escuta deve consumir e processar job', async () => {
    const importId = crypto.randomUUID();
    const jobId = `${importId}:dispatch:0`;

    // Registra arquivo PENDING no banco
    await prisma.importedFile.create({
      data: {
        id: importId,
        userId: testUserId,
        storageKey: `wearables/${testUserId}/2026/09/consumer_${Date.now()}.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'consumer.fit',
        fileSizeBytes: 1024,
        status: ImportStatus.PENDING,
      },
    });

    let jobProcessed = false;

    // Worker real conectado ao Redis
    const worker = new Worker(
      'test-wearables-fit-import',
      async (job) => {
        if (job.data.importId === importId) {
          // Executa claim atômico
          const [claimed] = await prisma.$queryRaw<Array<{ id: string; leaseVersion: bigint; leaseOwner: string }>>`
            UPDATE "ImportedFile"
            SET 
              status = 'PROCESSING',
              "leaseOwner" = 'real-worker-test',
              "leaseVersion" = "leaseVersion" + 1,
              "leaseExpiresAt" = NOW() + (60 * INTERVAL '1 second')
            WHERE id = ${importId}
              AND status = 'PENDING'
            RETURNING id, "leaseVersion", "leaseOwner";
          `;

          if (claimed) {
            jobProcessed = true;
          }
        }
      },
      { connection: redisConnection },
    );

    // Enfileira o job
    await queue.add('process-fit', { importId, sequence: 0 }, { jobId });

    // Aguarda o worker processar
    for (let i = 0; i < 30; i++) {
      if (jobProcessed) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await worker.close();

    expect(jobProcessed).toBe(true);

    const finalFile = await prisma.importedFile.findUnique({ where: { id: importId } });
    expect(finalFile?.status).toBe(ImportStatus.PROCESSING);
    expect(finalFile?.leaseOwner).toBe('real-worker-test');
    expect(finalFile?.leaseVersion).toBe(1n);
  });
});
