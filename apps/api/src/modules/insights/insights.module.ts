import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './services/insights.service';
import { CorrelationEngineService } from './services/correlation-engine.service';
import { DailySummaryService } from './services/daily-summary.service';

@Module({
  controllers: [InsightsController],
  providers: [
    InsightsService,
    CorrelationEngineService,
    DailySummaryService,
  ],
  exports: [InsightsService, DailySummaryService],
})
export class InsightsModule {}
