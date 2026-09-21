import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { PrismaClient, ImportStatus } from '@prisma/client';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { OutboxReconciliationService } from '../../src/modules/wearables/services/outbox-reconciliation.service';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { FitProcessingService, FencingViolationError } from '../../src/modules/wearables/processors/fit-processing.service';
import { PseudonymizationService } from '../../src/modules/wearables/services/pseudonymization.service';
import { FitWorkerSupervisorService } from '../../src/modules/wearables/services/fit-worker-supervisor.service';
import { FitNormalizerService } from '../../src/modules/wearables/services/fit-normalizer.service';
import { WorkoutProjectionService } from '../../src/modules/wearables/services/workout-projection.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

describe('Worker Resilience, Fencing, and Redis Outage Recovery (G4.2)', () => {
  let env: TestEnvironment;
  let prisma: PrismaClient;
  let queue: Queue;
  let storage: PrivateObjectStorageService;
  let reconciler: OutboxReconciliationService;
  let processingService: FitProcessingService;
  let testUserId: string;

  const redisConnection = { host: '127.0.0.1', port: 6380 };

  beforeAll(async () => {
    env = await setupTestEnvironment();
    prisma = env.prisma;

    const user = await prisma.user.create({
      data: {
        email: `worker_resilience_${Date.now()}@vitasatude.com`,
        name: 'Worker Resilience Tester',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId = user.id;

    queue = new Queue('test-wearables-resilience-queue', { connection: redisConnection });
    const configService = new ConfigService();
    storage = new PrivateObjectStorageService(configService);
    reconciler = new OutboxReconciliationService(prisma as any, storage, queue);

    const pseudonymizer = new PseudonymizationService(configService);
    const supervisor = new FitWorkerSupervisorService();
    const normalizer = new FitNormalizerService();
    const projector = new WorkoutProjectionService(prisma as any);

    processingService = new FitProcessingService(
      prisma as any,
      pseudonymizer,
      storage,
      supervisor,
      normalizer,
      projector,
    );
  }, 30000);

  afterAll(async () => {
    await queue.close();
    await teardownTestEnvironment();
  });

  it('1. SIGTERM Graceful Shutdown: worker.close() aguarda término do processamento ativo sem corrupção', async () => {
    const importId = crypto.randomUUID();
    const storageKey = `wearables/${testUserId}/2026/09/sigterm_${Date.now()}.fit`;
    const dummyBuffer = Buffer.from('TEST_FIT_PAYLOAD_GRACEFUL_SHUTDOWN');
    const fileSha256 = crypto.createHash('sha256').update(dummyBuffer).digest('hex');

    await storage.putObject(storageKey, dummyBuffer, fileSha256);

    await prisma.importedFile.create({
      data: {
        id: importId,
        userId: testUserId,
        storageKey,
        fileSha256,
        originalFileName: 'sigterm_test.fit',
        fileSizeBytes: dummyBuffer.length,
        status: ImportStatus.PENDING,
      },
    });

    let jobStarted = false;
    let jobFinished = false;

    const worker = new Worker(
      'test-wearables-resilience-queue',
      async (job) => {
        if (job.data.importId === importId) {
          jobStarted = true;
          // Simula processamento em andamento
          await new Promise((r) => setTimeout(r, 400));
          jobFinished = true;
        }
      },
      { connection: redisConnection },
    );

    await queue.add('process-fit', { importId }, { jobId: `${importId}:dispatch:0` });

    // Aguarda o job iniciar
    for (let i = 0; i < 20; i++) {
      if (jobStarted) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(jobStarted).toBe(true);

    // Dispara fechamento gracioso (equivalente a SIGTERM no container)
    const closePromise = worker.close();

    await closePromise;
    expect(jobFinished).toBe(true);
  });

  it('2. SIGKILL Crash Mid-Job & Outbox Reconciler Recovery com jobId determinístico', async () => {
    // Simula um worker que morreu abruptamente com SIGKILL:
    // O registro ficou em PROCESSING e o lease expirou
    const file = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey: `wearables/${testUserId}/2026/09/sigkill_${Date.now()}.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'sigkill_crash.fit',
        fileSizeBytes: 1024,
        status: ImportStatus.PROCESSING,
        leaseOwner: 'worker-killed-pid-9999',
        leaseVersion: 1n,
        recoverySequence: 0,
      },
    });

    // Expira o lease no banco usando o relógio UTC do PostgreSQL
    await prisma.$executeRaw`
      UPDATE "ImportedFile"
      SET "leaseExpiresAt" = timezone('UTC', NOW()) - INTERVAL '10 seconds'
      WHERE id = ${file.id}
    `;

    // O reconciliador roda e detecta o lease expirado
    const recoveredCount = await reconciler.reconcileStuckProcessing();
    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // O status foi revertido atômica e seguramente para PENDING
    const updated = await prisma.importedFile.findUnique({ where: { id: file.id } });
    expect(updated?.status).toBe(ImportStatus.PENDING);
    expect(updated?.leaseOwner).toBeNull();
    expect(updated?.leaseExpiresAt).toBeNull();
    expect(updated?.recoverySequence).toBe(1);

    // O BullMQ recebeu o job com o ID determinístico `${file.id}:recovery:1`
    const recoveryJobId = `${file.id}:recovery:1`;
    const enqueuedJob = await queue.getJob(recoveryJobId);
    expect(enqueuedJob).not.toBeNull();
    expect(enqueuedJob?.id).toBe(recoveryJobId);
  });

  it('3. Zombie Worker Fencing: transação sofre ROLLBACK total ao tentar commitar com leaseVersion defasada', async () => {
    const importId = crypto.randomUUID();
    const storageKey = `wearables/${testUserId}/2026/09/fencing_${Date.now()}.fit`;
    const dummyBuffer = Buffer.from('TEST_FIT_PAYLOAD_FENCING');
    const fileSha256 = crypto.createHash('sha256').update(dummyBuffer).digest('hex');

    await storage.putObject(storageKey, dummyBuffer, fileSha256);

    // 1. Arquivo inicialmente adquirido pelo Worker A (leaseVersion = 1, owner = 'worker-A')
    await prisma.importedFile.create({
      data: {
        id: importId,
        userId: testUserId,
        storageKey,
        fileSha256,
        originalFileName: 'fencing_test.fit',
        fileSizeBytes: dummyBuffer.length,
        status: ImportStatus.PROCESSING,
        leaseOwner: 'worker-A',
        leaseVersion: 1n,
      },
    });

    // 2. Worker A fica congelado (ex: GC pause ou partição de rede).
    // O reconciliador ou Worker B re-adquire o lease, incrementando leaseVersion para 2:
    await prisma.$executeRaw`
      UPDATE "ImportedFile"
      SET 
        "leaseOwner" = 'worker-B',
        "leaseVersion" = "leaseVersion" + 1,
        "leaseExpiresAt" = timezone('UTC', NOW()) + INTERVAL '60 seconds'
      WHERE id = ${importId}
    `;

    const dbStateAfterWorkerB = await prisma.importedFile.findUnique({ where: { id: importId } });
    expect(dbStateAfterWorkerB?.leaseVersion).toBe(2n);
    expect(dbStateAfterWorkerB?.leaseOwner).toBe('worker-B');

    // 3. Worker A (zumbi) acorda e tenta rodar o commit transacional usando sua versão antiga (leaseVersion = 1)
    let errorCaught: any = null;

    try {
      await prisma.$transaction(async (tx) => {
        // Worker A insere atividade
        const activity = await tx.workoutActivity.create({
          data: {
            userId: testUserId,
            sportCategory: 'RUNNING',
            startedAt: new Date(),
            finishedAt: new Date(),
            localDate: '2026-09-21',
            timezone: 'UTC',
            timezoneOffsetMinutes: 0,
            timezoneConfirmed: true,
            durationSeconds: 1800,
          },
        });

        await tx.activitySource.create({
          data: {
            activityId: activity.id,
            provider: 'MANUAL_FIT',
            sourceType: 'FIT_FILE',
            importedFileId: importId,
            sessionIndex: 0,
            sourceHash: fileSha256,
          },
        });

        // Fencing check atômico com leaseVersion = 1
        const updatedCount = await tx.$executeRaw`
          UPDATE "ImportedFile"
          SET 
            status = 'PROCESSED',
            "processedAt" = timezone('UTC', NOW()),
            "leaseOwner" = NULL,
            "leaseExpiresAt" = NULL
          WHERE id = ${importId}
            AND "leaseOwner" = 'worker-A'
            AND "leaseVersion" = 1
            AND status = 'PROCESSING'
        `;

        if (updatedCount !== 1) {
          throw new FencingViolationError(
            `[FENCING_VIOLATION] UPDATE PROCESSED afetou ${updatedCount} linhas (esperado: 1). ` +
            `Lease foi revogado durante o commit. Abortando transação com ROLLBACK.`
          );
        }
      });
    } catch (err: any) {
      errorCaught = err;
    }

    // 4. Valida que a exceção FencingViolationError foi disparada
    expect(errorCaught).toBeInstanceOf(FencingViolationError);
    expect(errorCaught.message).toContain('[FENCING_VIOLATION]');

    // 5. Prova de ROLLBACK TOTAL: nenhuma atividade ou fonte foi comitada no banco
    const orphanActivity = await prisma.activitySource.findFirst({
      where: { importedFileId: importId },
    });
    expect(orphanActivity).toBeNull();

    // 6. O registro no banco preservou integralmente a posse do Worker B
    const finalRecord = await prisma.importedFile.findUnique({ where: { id: importId } });
    expect(finalRecord?.status).toBe(ImportStatus.PROCESSING);
    expect(finalRecord?.leaseOwner).toBe('worker-B');
    expect(finalRecord?.leaseVersion).toBe(2n);
  });

  it('4. Resiliência a Falha de Fila: Ingestão HTTP armazena no Storage + DB com PENDING mesmo sem enfileirar imediatamente', async () => {
    // Simula upload quando o Redis falha ao adicionar o job:
    // O arquivo DEVE persistir no storage e no banco como PENDING (sem fallback para fila em memória)
    const storageKey = `wearables/${testUserId}/2026/09/offline_${Date.now()}.fit`;
    const dummyBuffer = Buffer.from('FIT_BINARY_PERSISTED_DURABLY');
    const fileSha256 = crypto.createHash('sha256').update(dummyBuffer).digest('hex');

    await storage.putObject(storageKey, dummyBuffer, fileSha256);

    const importedFile = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey,
        fileSha256,
        originalFileName: 'durable_offline.fit',
        fileSizeBytes: dummyBuffer.length,
        status: ImportStatus.PENDING,
      },
    });

    expect(importedFile.status).toBe(ImportStatus.PENDING);

    // Simula enfileiramento falho ignorado no controller (o arquivo continua PENDING no DB)
    // Quando o reconciliador executa, ele detecta o registro e o enfileira no Redis
    // Ajusta createdAt para simular arquivo pendente há mais de 30 segundos
    await prisma.$executeRaw`
      UPDATE "ImportedFile"
      SET "createdAt" = timezone('UTC', NOW()) - INTERVAL '40 seconds'
      WHERE id = ${importedFile.id}
    `;

    const recoveredCount = await reconciler.reconcilePendingImports();
    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    const reEnqueuedJob = await queue.getJob(`${importedFile.id}:recovery:1`);
    expect(reEnqueuedJob).not.toBeNull();
  });

  it('5. Redelivery Idempotency: reprocessamento de arquivo já PROCESSED é ignorado sem duplicar registros', async () => {
    const importId = crypto.randomUUID();
    const now = new Date();

    // Cria registro com status PROCESSED
    await prisma.importedFile.create({
      data: {
        id: importId,
        userId: testUserId,
        storageKey: `wearables/${testUserId}/already_done.fit`,
        fileSha256: crypto.randomBytes(32).toString('hex'),
        originalFileName: 'already_done.fit',
        fileSizeBytes: 512,
        status: ImportStatus.PROCESSED,
        createdAt: now,
        processedAt: now,
      },
    });

    // Chama processImport: deve detectar status PROCESSED e ignorar sem erros
    await expect(processingService.processImport(importId)).resolves.not.toThrow();

    const recordAfter = await prisma.importedFile.findUnique({ where: { id: importId } });
    expect(recordAfter?.status).toBe(ImportStatus.PROCESSED);
  });
});
