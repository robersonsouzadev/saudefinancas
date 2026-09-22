import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { OutboxReconciliationService } from './modules/wearables/services/outbox-reconciliation.service';

async function bootstrapWorker() {
  const logger = new Logger('StandaloneWorker');
  logger.log('Iniciando NestJS Standalone Worker para filas BullMQ...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const reconciler = app.get(OutboxReconciliationService);

  // Intervalo de Reconciliação Outbox: 10s em staging, 30s em produção (ou configurável via RECONCILIATION_INTERVAL_MS)
  const reconciliationIntervalMs = parseInt(
    process.env.RECONCILIATION_INTERVAL_MS || (process.env.APP_ENV === 'staging' ? '10000' : '30000'),
    10,
  );
  logger.log(`Loop do OutboxReconciliationService configurado para ${reconciliationIntervalMs} ms (Ambiente: ${process.env.APP_ENV || 'production'}).`);

  setInterval(async () => {
    try {
      await reconciler.reconcilePendingImports();
      await reconciler.reconcileStuckProcessing();
    } catch (err: any) {
      logger.error(`Erro na rotina de reconciliação outbox: ${err?.message}`);
    }
  }, reconciliationIntervalMs);

  // Intervalo de Limpeza de Telemetria e Arquivos Órfãos: a cada 24 horas
  setInterval(async () => {
    try {
      await reconciler.purgeExpiredTelemetry();
      await reconciler.cleanOrphanStorageFiles();
    } catch (err: any) {
      logger.error(`Erro na rotina de expurgo de telemetria/órfãos: ${err?.message}`);
    }
  }, 24 * 60 * 60 * 1000);

  logger.log('NestJS Standalone Worker ativo, escutando a fila wearables-fit-import via BullMQ.');

  process.on('SIGTERM', async () => {
    logger.log('Recebido SIGTERM. Encerrando standalone worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker();
