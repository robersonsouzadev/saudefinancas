import { Module } from '@nestjs/common';
import { HealthTrackerController } from './health-tracker.controller';
import { HealthTrackerService } from './services/health-tracker.service';
import { HealthAnalyticsService } from './services/health-analytics.service';

@Module({
  controllers: [HealthTrackerController],
  providers: [HealthTrackerService, HealthAnalyticsService],
  exports: [HealthTrackerService, HealthAnalyticsService],
})
export class HealthTrackerModule {}
