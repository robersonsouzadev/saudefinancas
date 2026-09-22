import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrivateObjectStorageService } from './storage.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class OutboxReconciliationService {
  private readonly logger = new Logger(OutboxReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateObjectStorageService,
    @InjectQueue('wearables-fit-import') private readonly fitQueue: Queue,
  ) {}

  // 1. Reconciliação Outbox: Enfileira registros PENDING não processados com recuperação idempotente
  async reconcilePendingImports(): Promise<number> {
    const recoveredPending = await this.prisma.$queryRaw<Array<{ id: string; recoverySequence: number }>>`
      WITH pending_candidates AS (
        SELECT id
        FROM "ImportedFile"
        WHERE status = 'PENDING'
          AND "createdAt" < timezone('UTC', NOW()) - INTERVAL '30 seconds'
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "ImportedFile" f
      SET 
        "recoverySequence" = f."recoverySequence" + 1
      FROM pending_candidates c
      WHERE f.id = c.id
      RETURNING f.id, f."recoverySequence";
    `;

    for (const file of recoveredPending) {
      const jobId = `${file.id}-recovery-${file.recoverySequence}`;
      try {
        await this.fitQueue.add(
          'process-fit',
          { importId: file.id, sequence: file.recoverySequence },
          { jobId, removeOnComplete: true, removeOnFail: false },
        );
        this.logger.log(`[Outbox Reconciler] Arquivo pendente ${file.id} re-enfileirado com jobId=${jobId}.`);
      } catch (err: any) {
        this.logger.error(`[Outbox Reconciler] Falha ao enfileirar ${jobId}: ${err?.message}`);
      }
    }

    return recoveredPending.length;
  }

  // 2. Reconciliação de Falhas / Jobs PROCESSING com lease expirado
  async reconcileStuckProcessing(): Promise<number> {
    // Transição atômica de PROCESSING expirado para PENDING com SELECT FOR UPDATE SKIP LOCKED
    const recoveredFiles = await this.prisma.$queryRaw<Array<{ id: string; recoverySequence: number; retryCount: number; status: string }>>`
      WITH expired_candidates AS (
        SELECT id
        FROM "ImportedFile"
        WHERE status = 'PROCESSING'
          AND "leaseExpiresAt" < timezone('UTC', NOW())
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "ImportedFile" f
      SET 
        status = CASE 
          WHEN f."retryCount" < 3 THEN 'PENDING'::"ImportStatus" 
          ELSE 'FAILED'::"ImportStatus" 
        END,
        "errorCode" = CASE 
          WHEN f."retryCount" >= 3 THEN 'PROCESSING_ABANDONED' 
          ELSE f."errorCode" 
        END,
        "errorMessage" = CASE 
          WHEN f."retryCount" >= 3 THEN 'Processamento abandonado após 3 tentativas sem resposta do worker' 
          ELSE f."errorMessage" 
        END,
        "retryCount" = f."retryCount" + 1,
        "recoverySequence" = f."recoverySequence" + 1,
        "processedAt" = CASE 
          WHEN f."retryCount" >= 3 THEN timezone('UTC', NOW()) 
          ELSE NULL 
        END,
        "leaseOwner" = NULL,
        "leaseExpiresAt" = NULL
      FROM expired_candidates c
      WHERE f.id = c.id
      RETURNING f.id, f."recoverySequence", f."retryCount", f.status;
    `;

    let reEnqueued = 0;
    for (const file of recoveredFiles) {
      if (file.status === 'PENDING') {
        const jobId = `${file.id}-recovery-${file.recoverySequence}`;
        try {
          await this.fitQueue.add(
            'process-fit',
            { importId: file.id, sequence: file.recoverySequence },
            { jobId, removeOnComplete: true, removeOnFail: false },
          );
          reEnqueued++;
          this.logger.warn(`[Crash Recovery] Arquivo travado ${file.id} retornado para PENDING (recoverySequence=${file.recoverySequence}, retryCount=${file.retryCount}). Re-enfileirado com jobId=${jobId}.`);
        } catch (err: any) {
          this.logger.error(`[Crash Recovery] Erro ao enfileirar job de recuperação ${jobId}: ${err?.message}`);
        }
      } else {
        this.logger.error(`[Crash Recovery] Arquivo ${file.id} marcado como FAILED por excesso de tentativas (${file.retryCount}).`);
      }
    }

    if (reEnqueued > 0) {
      this.logger.log(`[Crash Recovery] ${reEnqueued} jobs de recuperação re-enfileirados com sucesso.`);
    }

    return recoveredFiles.length;
  }

  // 3. Expurgo de Telemetria Antiga (Retenção de 180 dias)
  async purgeExpiredTelemetry(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.workoutTelemetry.deleteMany({
      where: {
        retentionExpiresAt: { lte: now },
      },
    });

    if (result.count > 0) {
      this.logger.log(`[Telemetry Retention] ${result.count} telemetrias expiradas (>180 dias) expurgadas com sucesso.`);
    }

    return result.count;
  }

  // 4. Limpeza de Arquivos Órfãos no Storage (MODO DIAGNÓSTICO ESTREITO)
  async cleanOrphanStorageFiles(): Promise<string[]> {
    const allFiles = await this.prisma.importedFile.findMany({
      select: { storageKey: true },
    });

    const knownKeys = new Set(allFiles.map((f) => f.storageKey));
    const orphans = await this.storage.reconcileOrphans(knownKeys);

    const allowDeletion = process.env.ORPHAN_CLEANUP_ENABLE_DELETION === 'true';

    for (const orphan of orphans) {
      if (allowDeletion) {
        this.logger.warn(`[Storage Cleaner - EXECUÇÃO DELETIVA] Removendo arquivo órfão do storage: ${orphan}`);
        await this.storage.deleteObject(orphan);
      } else {
        this.logger.warn(
          `[Storage Cleaner - MODO DIAGNÓSTICO] Arquivo órfão potencial identificado no storage: ${orphan}. Remoção SUSPENSA por segurança até proteção comprovada contra concorrência.`,
        );
      }
    }

    return orphans;
  }
}
