import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrivateObjectStorageService } from '../services/storage.service';
import { FitWorkerSupervisorService, FitParserTimeoutError, FitParserMemoryError } from '../services/fit-worker-supervisor.service';
import { FitNormalizerService } from '../services/fit-normalizer.service';
import { WorkoutProjectionService } from '../services/workout-projection.service';
import { PseudonymizationService } from '../services/pseudonymization.service';
import { 
  ImportStatus, 
  ActivitySourceType, 
  SyncExecutionType, 
  SyncExecutionStatus, 
  ConsentType, 
  ConsentStatus, 
  WearableProvider 
} from '@prisma/client';
import * as os from 'os';
import * as crypto from 'crypto';

export class FencingViolationError extends Error {
  readonly code = 'FENCING_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'FencingViolationError';
  }
}

@Injectable()
export class FitProcessingService {
  private readonly logger = new Logger(FitProcessingService.name);
  private readonly workerInstanceId = `${os.hostname()}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  private readonly LEASE_DURATION_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateObjectStorageService,
    private readonly supervisor: FitWorkerSupervisorService,
    private readonly normalizer: FitNormalizerService,
    private readonly projector: WorkoutProjectionService,
    private readonly pseudonymizer: PseudonymizationService,
  ) {}

  async processImport(importId: string): Promise<void> {
    const startTime = Date.now();

    // 0. Verificação preliminar de idempotência em redelivery
    const existingCheck = await this.prisma.importedFile.findUnique({
      where: { id: importId },
      select: { status: true },
    });

    if (existingCheck?.status === ImportStatus.PROCESSED) {
      this.logger.log(`[IDEMPOTENT_SKIP] Arquivo ${importId} já se encontra com status PROCESSED. Redelivery ignorado sem reprocessamento.`);
      return;
    }

    // 1. Claim Atômico do Job com versionamento atômico e relógio do PostgreSQL
    // Somente adquire se status for PENDING ou se for PROCESSING com lease expirado no relógio do banco
    const claimRows = await this.prisma.$queryRaw<Array<{ id: string; leaseVersion: bigint; leaseOwner: string }>>`
      UPDATE "ImportedFile"
      SET 
        status = 'PROCESSING',
        "leaseOwner" = ${this.workerInstanceId},
        "leaseVersion" = "leaseVersion" + 1,
        "leaseExpiresAt" = timezone('UTC', NOW()) + (${this.LEASE_DURATION_SECONDS} * INTERVAL '1 second'),
        "processingStartedAt" = timezone('UTC', NOW()),
        "workerPid" = ${process.pid}
      WHERE id = ${importId}
        AND (
          status = 'PENDING'
          OR (status = 'PROCESSING' AND "leaseExpiresAt" < timezone('UTC', NOW()))
        )
      RETURNING id, "leaseVersion", "leaseOwner";
    `;

    if (!claimRows || claimRows.length === 0) {
      this.logger.warn(`Claim atômico ignorado para arquivo ${importId}. Job não elegível ou já em processamento ativo.`);
      return;
    }

    const claimed = claimRows[0];
    const myLeaseVersion = claimed.leaseVersion;

    this.logger.log(`Job ${importId} adquirido com sucesso pelo worker ${this.workerInstanceId} (versão: ${myLeaseVersion}).`);

    const importedFile = await this.prisma.importedFile.findUnique({
      where: { id: importId },
      include: { user: true },
    });

    if (!importedFile) {
      this.logger.error(`Arquivo ${importId} não encontrado após claim atômico.`);
      return;
    }

    const userId = importedFile.userId;
    const userPseudonym = this.pseudonymizer.generatePseudonym(userId);

    // Registro de Auditoria de Sincronização
    const syncExecution = await this.prisma.syncExecution.create({
      data: {
        userId,
        userPseudonym,
        provider: WearableProvider.MANUAL_FIT,
        executionType: SyncExecutionType.FILE_IMPORT,
        status: SyncExecutionStatus.PARTIAL,
      },
    });

    // 2. Heartbeat Periódico: Inicia apenas após claim bem-sucedido
    let isHeartbeatRunning = false;
    let heartbeatTimer: NodeJS.Timeout | null = null;

    heartbeatTimer = setInterval(async () => {
      if (isHeartbeatRunning) return; // Impede sobreposição
      isHeartbeatRunning = true;
      try {
        const updated = await this.prisma.$executeRaw`
          UPDATE "ImportedFile"
          SET "leaseExpiresAt" = timezone('UTC', NOW()) + (${this.LEASE_DURATION_SECONDS} * INTERVAL '1 second')
          WHERE id = ${importId}
            AND "leaseOwner" = ${this.workerInstanceId}
            AND "leaseVersion" = ${myLeaseVersion}
            AND status = 'PROCESSING'
        `;
        if (updated === 0) {
          this.logger.warn(`[FENCING_WARNING] Heartbeat não encontrou linha ativa para renovar lease de ${importId} (owner=${this.workerInstanceId}, v=${myLeaseVersion}).`);
        }
      } catch (err: any) {
        this.logger.warn(`Erro temporário ao enviar heartbeat para ${importId}: ${err?.message}`);
      } finally {
        isHeartbeatRunning = false;
      }
    }, 10000);

    try {
      // 3. Leitura do Binário no Storage Privado com conferência de SHA-256
      const buffer = await this.storage.getObject(importedFile.storageKey, importedFile.fileSha256);

      // 4. Execução em Worker Thread com Supervisor (Timeout de 15s e Limite de Memória 256MB)
      const decoded = await this.supervisor.parseWithSupervisor(buffer, 15000);

      // 5. Verificação de Consentimento para Localização (GPS)
      const locationConsent = await this.prisma.consentRecord.findFirst({
        where: {
          userId,
          consentType: ConsentType.LOCATION_DATA_PROCESSING,
          status: ConsentStatus.GRANTED,
        },
        orderBy: { createdAt: 'desc' },
      });
      const hasLocationConsent = !!locationConsent;

      // 6. Normalização com Timezone do Perfil do Usuário
      const userTimezone = importedFile.user?.timezone || undefined;
      const normalizedActivities = this.normalizer.normalize(decoded, userTimezone, hasLocationConsent);

      // 7. Transação Atômica no PostgreSQL com SELECT FOR UPDATE e Fencing de Lease
      await this.prisma.$transaction(async (tx) => {
        // Bloqueio pessimista e verificação contra o relógio oficial do PostgreSQL
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
            ("leaseExpiresAt" < timezone('UTC', NOW())) as "isExpired"
          FROM "ImportedFile"
          WHERE id = ${importId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new FencingViolationError(`[FENCING_ERROR] Arquivo ${importId} não encontrado no SELECT FOR UPDATE.`);
        }

        const lockedFile = lockedRows[0];

        if (
          lockedFile.status !== ImportStatus.PROCESSING ||
          lockedFile.leaseOwner !== this.workerInstanceId ||
          lockedFile.leaseVersion !== myLeaseVersion ||
          lockedFile.isExpired
        ) {
          throw new FencingViolationError(
            `[FENCING_VIOLATION] Worker ${this.workerInstanceId} (versão ${myLeaseVersion}) perdeu o lease do arquivo ${importId}. ` +
            `Status no banco: ${lockedFile.status}, Owner: ${lockedFile.leaseOwner}, Versão: ${lockedFile.leaseVersion}, Expirado: ${lockedFile.isExpired}. ` +
            `Transação abortada com ROLLBACK.`
          );
        }

        for (const actData of normalizedActivities) {
          // Inserção da Atividade Canônica
          const activity = await tx.workoutActivity.create({
            data: {
              userId,
              sportCategory: actData.sportCategory,
              sportNameOriginal: actData.sportNameOriginal,
              startedAt: actData.startedAt,
              finishedAt: actData.finishedAt,
              localDate: actData.localDate,
              timezone: actData.timezone,
              timezoneOffsetMinutes: actData.timezoneOffsetMinutes,
              timezoneConfirmed: actData.timezoneConfirmed,
              durationSeconds: actData.durationSeconds,
              movingDurationSeconds: actData.movingDurationSeconds,
              distanceMeters: actData.distanceMeters,
              elevationGainMeters: actData.elevationGainMeters,
              elevationLossMeters: actData.elevationLossMeters,
              avgHeartRate: actData.avgHeartRate,
              maxHeartRate: actData.maxHeartRate,
              avgPaceSecMeter: actData.avgPaceSecMeter,
              avgCadence: actData.avgCadence,
              maxCadence: actData.maxCadence,
              totalCaloriesEstimated: actData.totalCaloriesEstimated,
              aerobicTrainingEffect: actData.aerobicTrainingEffect,
              anaerobicTrainingEffect: actData.anaerobicTrainingEffect,
              deviceManufacturer: actData.deviceManufacturer,
              deviceModel: actData.deviceModel,
            },
          });

          // Inserção da Origem (ActivitySource)
          await tx.activitySource.create({
            data: {
              activityId: activity.id,
              provider: WearableProvider.MANUAL_FIT,
              sourceType: ActivitySourceType.FIT_FILE,
              importedFileId: importedFile.id,
              sessionIndex: actData.sessionIndex,
              sourceHash: importedFile.fileSha256,
            },
          });

          // Inserção das Voltas (Laps)
          if (actData.laps.length > 0) {
            await tx.workoutLap.createMany({
              data: actData.laps.map((lap) => ({
                activityId: activity.id,
                lapIndex: lap.lapIndex,
                startTime: lap.startTime,
                totalTimeSeconds: lap.totalTimeSeconds,
                distanceMeters: lap.distanceMeters,
                avgSpeedMeterSec: lap.avgSpeedMeterSec,
                avgHeartRate: lap.avgHeartRate,
                maxHeartRate: lap.maxHeartRate,
                caloriesEstimated: lap.caloriesEstimated,
              })),
            });
          }

          // Inserção da Telemetria Estruturada (5s downsampled)
          await tx.workoutTelemetry.create({
            data: {
              activityId: activity.id,
              formatVersion: actData.telemetry.formatVersion,
              samplingRateSeconds: actData.telemetry.samplingRateSeconds,
              sampleCount: actData.telemetry.sampleCount,
              hasLocationData: actData.telemetry.hasLocationData,
              samples: actData.telemetry.samples as any,
              retentionExpiresAt: actData.telemetry.retentionExpiresAt,
            },
          });

          // Projeção Idempotente em WorkoutSession utilizando o TransactionClient tx
          await this.projector.projectActivityToWorkoutSession(tx, activity, actData);
        }

        const durationMs = Date.now() - startTime;

        // Atualizar ImportedFile para PROCESSED liberando o lease e validando exatamente 1 linha afetada
        const updatedCount = await tx.$executeRaw`
          UPDATE "ImportedFile"
          SET 
            status = 'PROCESSED',
            "processedAt" = timezone('UTC', NOW()),
            "processingDurationMs" = ${durationMs},
            "leaseOwner" = NULL,
            "leaseExpiresAt" = NULL
          WHERE id = ${importId}
            AND "leaseOwner" = ${this.workerInstanceId}
            AND "leaseVersion" = ${myLeaseVersion}
            AND status = 'PROCESSING'
        `;

        if (updatedCount !== 1) {
          throw new FencingViolationError(
            `[FENCING_VIOLATION] UPDATE PROCESSED afetou ${updatedCount} linhas (esperado: 1). ` +
            `Lease foi revogado durante o commit. Abortando transação com ROLLBACK.`
          );
        }

        // Atualizar SyncExecution para SUCCESS
        await tx.syncExecution.update({
          where: { id: syncExecution.id },
          data: {
            status: SyncExecutionStatus.SUCCESS,
            recordsIngested: normalizedActivities.length,
            completedAt: new Date(),
            durationMs,
          },
        });
      });

      this.logger.log(`Arquivo FIT ${importId} processado com sucesso em ${Date.now() - startTime}ms.`);
    } catch (err: any) {
      if (err instanceof FencingViolationError) {
        this.logger.error(`Execução cancelada por violação de fencing: ${err.message}`);
        // Não altera o banco, pois o worker perdeu a posse do lease
        return;
      }

      const durationMs = Date.now() - startTime;
      let errorCode = 'FIT_PARSE_ERROR';

      if (err instanceof FitParserTimeoutError) {
        errorCode = 'PARSER_TIMEOUT';
      } else if (err instanceof FitParserMemoryError) {
        errorCode = 'PARSER_MEMORY_LIMIT';
      }

      this.logger.error(`Falha no processamento do arquivo ${importId} (${errorCode}): ${err?.message}`);

      // Registra a falha no ImportedFile apenas se ainda mantiver a titularidade do lease
      await this.prisma.$executeRaw`
        UPDATE "ImportedFile"
        SET 
          status = 'FAILED',
          "processedAt" = timezone('UTC', NOW()),
          "errorCode" = ${errorCode},
          "errorMessage" = ${err?.message || 'Falha no processamento do arquivo'},
          "processingDurationMs" = ${durationMs},
          "retryCount" = "retryCount" + 1,
          "leaseOwner" = NULL,
          "leaseExpiresAt" = NULL
        WHERE id = ${importId}
          AND "leaseOwner" = ${this.workerInstanceId}
          AND "leaseVersion" = ${myLeaseVersion}
      `.catch((dbErr) => this.logger.error(`Erro ao registrar falha de ImportedFile: ${dbErr?.message}`));

      await this.prisma.syncExecution.update({
        where: { id: syncExecution.id },
        data: {
          status: SyncExecutionStatus.FAILED,
          errorMessage: err?.message || 'Falha de processamento no worker',
          completedAt: new Date(),
          durationMs,
        },
      }).catch((dbErr) => this.logger.error(`Erro ao registrar falha de SyncExecution: ${dbErr?.message}`));
    } finally {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }
  }
}
