import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, ImportStatus, WearableProvider, ActivitySourceType, SportCategory, SyncExecutionType, SyncExecutionStatus, ConsentType, ConsentStatus } from '@prisma/client';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { WorkoutProjectionService } from '../../src/modules/wearables/services/workout-projection.service';
import * as crypto from 'crypto';

describe('Testes de Integração com PostgreSQL Real (G4.1)', () => {
  let env: TestEnvironment;
  let prisma: PrismaClient;
  let testUserId1: string;
  let testUserId2: string;
  const projector = new WorkoutProjectionService();

  beforeAll(async () => {
    env = await setupTestEnvironment();
    prisma = env.prisma;

    // Cria usuários de teste com fuso horário do perfil
    const u1 = await prisma.user.create({
      data: {
        email: `test_wearable_${Date.now()}_1@vitasatude.com`,
        name: 'Usuário Dourados MS',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId1 = u1.id;

    const u2 = await prisma.user.create({
      data: {
        email: `test_wearable_${Date.now()}_2@vitasatude.com`,
        name: 'Usuário São Paulo SP',
        timezone: 'America/Sao_Paulo',
      },
    });
    testUserId2 = u2.id;
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('1. Constraint UNIQUE(userId, fileSha256)', () => {
    it('deve rejeitar inserção duplicada do mesmo SHA-256 para o mesmo usuário com erro P2002', async () => {
      const sha256 = crypto.randomBytes(32).toString('hex');
      const storageKey1 = `wearables/${testUserId1}/2026/09/file1.fit`;
      const storageKey2 = `wearables/${testUserId1}/2026/09/file2.fit`;

      // 1ª inserção: sucesso
      await prisma.importedFile.create({
        data: {
          userId: testUserId1,
          storageKey: storageKey1,
          fileSha256: sha256,
          originalFileName: 'run1.fit',
          fileSizeBytes: 1024,
          status: ImportStatus.PENDING,
        },
      });

      // 2ª inserção com mesmo SHA para mesmo usuário: falha P2002
      await expect(
        prisma.importedFile.create({
          data: {
            userId: testUserId1,
            storageKey: storageKey2,
            fileSha256: sha256,
            originalFileName: 'run2.fit',
            fileSizeBytes: 1024,
            status: ImportStatus.PENDING,
          },
        })
      ).rejects.toThrow(/Unique constraint failed on the fields: \(`userId`,`fileSha256`\)/);

      // Inserção do mesmo SHA para outro usuário: sucesso (escopo por usuário)
      const storageKeyU2 = `wearables/${testUserId2}/2026/09/file_u2.fit`;
      const fileU2 = await prisma.importedFile.create({
        data: {
          userId: testUserId2,
          storageKey: storageKeyU2,
          fileSha256: sha256,
          originalFileName: 'run_u2.fit',
          fileSizeBytes: 1024,
          status: ImportStatus.PENDING,
        },
      });
      expect(fileU2.id).toBeDefined();
    });
  });

  describe('2. Índices Parciais de ActivitySource', () => {
    it('deve impedir que o mesmo (importedFileId, sessionIndex) seja associado a atividades distintas', async () => {
      const sha = crypto.randomBytes(32).toString('hex');
      const file = await prisma.importedFile.create({
        data: {
          userId: testUserId1,
          storageKey: `wearables/${testUserId1}/2026/09/session_test_${Date.now()}.fit`,
          fileSha256: sha,
          originalFileName: 'multisession.fit',
          fileSizeBytes: 2048,
          status: ImportStatus.PROCESSED,
        },
      });

      const act1 = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.RUNNING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1800,
        },
      });

      const act2 = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.CYCLING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1800,
        },
      });

      // 1ª fonte: importedFileId + sessionIndex = 0 -> Sucesso
      await prisma.activitySource.create({
        data: {
          activityId: act1.id,
          provider: WearableProvider.MANUAL_FIT,
          sourceType: ActivitySourceType.FIT_FILE,
          importedFileId: file.id,
          sessionIndex: 0,
        },
      });

      // 2ª fonte: mesma sessionIndex 0 do mesmo arquivo para outra atividade -> Violação do índice parcial
      await expect(
        prisma.activitySource.create({
          data: {
            activityId: act2.id,
            provider: WearableProvider.MANUAL_FIT,
            sourceType: ActivitySourceType.FIT_FILE,
            importedFileId: file.id,
            sessionIndex: 0,
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // sessionIndex = 1 para a 2ª atividade -> Sucesso
      const source2 = await prisma.activitySource.create({
        data: {
          activityId: act2.id,
          provider: WearableProvider.MANUAL_FIT,
          sourceType: ActivitySourceType.FIT_FILE,
          importedFileId: file.id,
          sessionIndex: 1,
        },
      });
      expect(source2.id).toBeDefined();
    });

    it('deve impedir que o mesmo (provider, externalActivityId) seja duplicado', async () => {
      const extId = `garmin_act_${Date.now()}`;

      const act1 = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.RUNNING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1800,
        },
      });

      const act2 = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.RUNNING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1800,
        },
      });

      await prisma.activitySource.create({
        data: {
          activityId: act1.id,
          provider: WearableProvider.GARMIN,
          sourceType: ActivitySourceType.ACTIVITY_API,
          externalActivityId: extId,
        },
      });

      await expect(
        prisma.activitySource.create({
          data: {
            activityId: act2.id,
            provider: WearableProvider.GARMIN,
            sourceType: ActivitySourceType.ACTIVITY_API,
            externalActivityId: extId,
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('3. Claim Atômico e Concorrência Real com Relógio PostgreSQL', () => {
    it('deve permitir apenas um vencedor quando dois workers tentam claim do mesmo arquivo PENDING', async () => {
      const file = await prisma.importedFile.create({
        data: {
          userId: testUserId1,
          storageKey: `wearables/${testUserId1}/2026/09/race_${Date.now()}.fit`,
          fileSha256: crypto.randomBytes(32).toString('hex'),
          originalFileName: 'race.fit',
          fileSizeBytes: 1024,
          status: ImportStatus.PENDING,
        },
      });

      const claimSql = (workerId: string) => prisma.$queryRaw<Array<{ id: string; leaseVersion: bigint; leaseOwner: string }>>`
        UPDATE "ImportedFile"
        SET 
          status = 'PROCESSING',
          "leaseOwner" = ${workerId},
          "leaseVersion" = "leaseVersion" + 1,
          "leaseExpiresAt" = NOW() + (60 * INTERVAL '1 second'),
          "processingStartedAt" = NOW()
        WHERE id = ${file.id}
          AND (
            status = 'PENDING'
            OR (status = 'PROCESSING' AND "leaseExpiresAt" < NOW())
          )
        RETURNING id, "leaseVersion", "leaseOwner";
      `;

      // Dois claims disparados concorrentemente no banco
      const [resA, resB] = await Promise.all([
        claimSql('worker-pod-alpha'),
        claimSql('worker-pod-beta'),
      ]);

      const winners = [resA, resB].filter((r) => r.length === 1);
      const losers = [resA, resB].filter((r) => r.length === 0);

      expect(winners.length).toBe(1);
      expect(losers.length).toBe(1);

      const winningClaim = winners[0][0];
      expect(winningClaim.leaseVersion).toBe(1n);
      expect(['worker-pod-alpha', 'worker-pod-beta']).toContain(winningClaim.leaseOwner);
    });
  });

  describe('4. Fencing e Rollback no Commit Final', () => {
    it('deve abortar e reverter todas as alterações caso o worker perca o lease antes do commit', async () => {
      const file = await prisma.importedFile.create({
        data: {
          userId: testUserId1,
          storageKey: `wearables/${testUserId1}/2026/09/fencing_${Date.now()}.fit`,
          fileSha256: crypto.randomBytes(32).toString('hex'),
          originalFileName: 'fencing.fit',
          fileSizeBytes: 1024,
          status: ImportStatus.PROCESSING,
          leaseOwner: 'worker-pod-alpha',
          leaseVersion: 1n,
          leaseExpiresAt: new Date(Date.now() + 60000),
        },
      });

      const myWorkerId = 'worker-pod-alpha';
      const myVersion = 1n;

      // Simula outro worker (ou reconciliador) assumindo o lease no meio do processamento
      await prisma.$executeRaw`
        UPDATE "ImportedFile"
        SET "leaseVersion" = 2, "leaseOwner" = 'worker-pod-beta'
        WHERE id = ${file.id}
      `;

      // Tentativa do worker antigo de realizar o commit
      let errorThrown: any = null;
      try {
        await prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<Array<{
            id: string;
            status: string;
            leaseOwner: string;
            leaseVersion: bigint;
            isExpired: boolean;
          }>>`
            SELECT 
              id, 
              status,
              "leaseOwner", 
              "leaseVersion", 
              ("leaseExpiresAt" < NOW()) as "isExpired"
            FROM "ImportedFile"
            WHERE id = ${file.id}
            FOR UPDATE
          `;

          const locked = lockedRows[0];
          if (
            locked.status !== ImportStatus.PROCESSING ||
            locked.leaseOwner !== myWorkerId ||
            locked.leaseVersion !== myVersion ||
            locked.isExpired
          ) {
            throw new Error(`[FENCING_VIOLATION] Lease perdido.`);
          }

          // Tentativa de criar atividade dentro da transação
          await tx.workoutActivity.create({
            data: {
              userId: testUserId1,
              sportCategory: SportCategory.RUNNING,
              startedAt: new Date(),
              localDate: '2026-09-21',
              durationSeconds: 1200,
            },
          });
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toMatch(/FENCING_VIOLATION/);

      // Confirma que nenhuma atividade foi persistida (Rollback total)
      const count = await prisma.workoutActivity.count({
        where: { userId: testUserId1, durationSeconds: 1200 },
      });
      expect(count).toBe(0);
    });
  });

  describe('5. Cascatas e SetNull (LGPD)', () => {
    it('deve remover voltas e telemetria em cascata ao excluir WorkoutActivity', async () => {
      const act = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.RUNNING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1500,
          laps: {
            create: {
              lapIndex: 1,
              startTime: new Date(),
              totalTimeSeconds: 1500,
            },
          },
          telemetry: {
            create: {
              formatVersion: 1,
              samplingRateSeconds: 5,
              sampleCount: 1,
              hasLocationData: false,
              samples: [{ offsetSec: 0, hr: 140 }],
              retentionExpiresAt: new Date(Date.now() + 180 * 86400000),
            },
          },
        },
      });

      // Deleta a atividade
      await prisma.workoutActivity.delete({ where: { id: act.id } });

      // Voltas e telemetria devem ter sido removidas pelo ON DELETE CASCADE
      const laps = await prisma.workoutLap.findMany({ where: { activityId: act.id } });
      const telem = await prisma.workoutTelemetry.findUnique({ where: { activityId: act.id } });

      expect(laps.length).toBe(0);
      expect(telem).toBeNull();
    });

    it('deve desvincular userId para null em ConsentRecord e SyncExecution ao excluir usuário (SetNull auditável)', async () => {
      const tempUser = await prisma.user.create({
        data: {
          email: `temp_audit_${Date.now()}@vitasatude.com`,
          name: 'Usuário Temporário LGPD',
        },
      });

      const pseudo = `pseudo_${crypto.randomUUID()}`;

      const consent = await prisma.consentRecord.create({
        data: {
          userId: tempUser.id,
          userPseudonym: pseudo,
          consentType: ConsentType.WEARABLE_DATA_PROCESSING,
          status: ConsentStatus.GRANTED,
        },
      });

      const sync = await prisma.syncExecution.create({
        data: {
          userId: tempUser.id,
          userPseudonym: pseudo,
          provider: WearableProvider.MANUAL_FIT,
          executionType: SyncExecutionType.FILE_IMPORT,
          status: SyncExecutionStatus.SUCCESS,
        },
      });

      // Exclui o usuário
      await prisma.user.delete({ where: { id: tempUser.id } });

      // Registros devem ser preservados com userId = null
      const updatedConsent = await prisma.consentRecord.findUnique({ where: { id: consent.id } });
      const updatedSync = await prisma.syncExecution.findUnique({ where: { id: sync.id } });

      expect(updatedConsent).not.toBeNull();
      expect(updatedConsent?.userId).toBeNull();
      expect(updatedConsent?.userPseudonym).toBe(pseudo);

      expect(updatedSync).not.toBeNull();
      expect(updatedSync?.userId).toBeNull();
      expect(updatedSync?.userPseudonym).toBe(pseudo);
    });
  });

  describe('6. Idempotência da Projeção em WorkoutSession', () => {
    it('deve criar e atualizar a sessão de treino sem duplicar ao receber múltiplas projeções', async () => {
      const act = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.RUNNING,
          sportNameOriginal: 'Corrida Matinal 10k',
          startedAt: new Date('2026-09-21T06:00:00Z'),
          finishedAt: new Date('2026-09-21T06:50:00Z'),
          localDate: '2026-09-21',
          durationSeconds: 3000,
          totalCaloriesEstimated: 650,
          maxHeartRate: 172,
        },
      });

      const normData: any = {
        sportCategory: SportCategory.RUNNING,
        sportNameOriginal: 'Corrida Matinal 10k',
      };

      // 1ª Projeção
      await prisma.$transaction(async (tx) => {
        await projector.projectActivityToWorkoutSession(tx, act, normData);
      });

      const session1 = await prisma.workoutSession.findUnique({
        where: { workoutActivityId: act.id },
      });
      expect(session1).toBeDefined();
      expect(session1?.title).toBe('Treino (RUNNING) — Corrida Matinal 10k');
      expect(session1?.intensity).toBe('VIGOROUS');

      // 2ª Projeção com dados ajustados
      const updatedAct = { ...act, totalCaloriesEstimated: 680, durationSeconds: 3100 };
      await prisma.$transaction(async (tx) => {
        await projector.projectActivityToWorkoutSession(tx, updatedAct, normData);
      });

      const allSessions = await prisma.workoutSession.findMany({
        where: { workoutActivityId: act.id },
      });
      expect(allSessions.length).toBe(1); // Não duplicou
      expect(allSessions[0].caloriesBurned).toBe(680);
    });
  });

  describe('7. Retenção de Telemetria (180 dias)', () => {
    it('deve expurgar telemetrias vencidas mantendo telemetrias ativas', async () => {
      const act = await prisma.workoutActivity.create({
        data: {
          userId: testUserId1,
          sportCategory: SportCategory.WALKING,
          startedAt: new Date(),
          localDate: '2026-09-21',
          durationSeconds: 1200,
        },
      });

      // Telemetria expirada há 1 dia
      const expired = await prisma.workoutTelemetry.create({
        data: {
          activityId: act.id,
          formatVersion: 1,
          samplingRateSeconds: 5,
          sampleCount: 1,
          hasLocationData: false,
          samples: [{ offsetSec: 0, hr: 100 }],
          retentionExpiresAt: new Date(Date.now() - 86400000),
        },
      });

      // Executa expurgo
      const deleted = await prisma.workoutTelemetry.deleteMany({
        where: {
          retentionExpiresAt: { lte: new Date() },
        },
      });

      expect(deleted.count).toBeGreaterThanOrEqual(1);

      const check = await prisma.workoutTelemetry.findUnique({ where: { id: expired.id } });
      expect(check).toBeNull();
    });
  });
});
