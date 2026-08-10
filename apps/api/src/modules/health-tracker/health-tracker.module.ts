import { Module } from '@nestjs/common';
import { HealthTrackerController } from './health-tracker.controller';
import { HealthTrackerService } from './services/health-tracker.service';
import { HealthAnalyticsService } from './services/health-analytics.service';
import { HydrationReminderCronService } from './services/hydration-reminder-cron.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [HealthTrackerController],
  providers: [
    HealthTrackerService,
    HealthAnalyticsService,
    HydrationReminderCronService,
  ],
  exports: [
    HealthTrackerService,
    HealthAnalyticsService,
  ],
})
export class HealthTrackerModule {}
