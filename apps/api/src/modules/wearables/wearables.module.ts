import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

import { WearablesController } from './controllers/wearables.controller';
import { GarminIntegrationController } from './controllers/garmin-integration.controller';

import { PrivateObjectStorageService } from './services/storage.service';
import { FitValidatorService } from './services/fit-validator.service';
import { PseudonymizationService } from './services/pseudonymization.service';
import { FitWorkerSupervisorService } from './services/fit-worker-supervisor.service';
import { FitNormalizerService } from './services/fit-normalizer.service';
import { WorkoutProjectionService } from './services/workout-projection.service';
import { FitImporterService } from './services/fit-importer.service';
import { FitProcessingService } from './processors/fit-processing.service';
import { FitImportProcessor } from './processors/fit-import.processor';
import { OutboxReconciliationService } from './services/outbox-reconciliation.service';
import { WearablesObservabilityService } from './services/wearables-observability.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueueAsync({
      name: 'wearables-fit-import',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
        },
      }),
    }),
  ],
  controllers: [
    WearablesController,
    GarminIntegrationController,
  ],
  providers: [
    PrivateObjectStorageService,
    FitValidatorService,
    PseudonymizationService,
    FitWorkerSupervisorService,
    FitNormalizerService,
    WorkoutProjectionService,
    FitImporterService,
    FitProcessingService,
    FitImportProcessor,
    OutboxReconciliationService,
    WearablesObservabilityService,
  ],
  exports: [
    FitImporterService,
    FitProcessingService,
    PrivateObjectStorageService,
    FitValidatorService,
    WearablesObservabilityService,
  ],
})
export class WearablesModule {}
