import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { FinanceModule } from '../finance/finance.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [FinanceModule, InsightsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
