import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './services/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':userId')
  async getDashboardSummary(@Param('userId') userId: string) {
    return this.dashboardService.getDashboardSummary(userId);
  }
}
