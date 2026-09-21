import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './services/insights.service';
import { CorrelationEngineService } from './services/correlation-engine.service';
import { DailySummaryService } from './services/daily-summary.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InsightsController],
  providers: [
    InsightsService,
    CorrelationEngineService,
    DailySummaryService,
  ],
  exports: [InsightsService, DailySummaryService, CorrelationEngineService],
})
export class InsightsModule {}
