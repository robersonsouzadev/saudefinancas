import { Controller, Get, Post, Param, Body, Query, Put } from '@nestjs/common';
import { InsightsService } from './services/insights.service';
import { CorrelationEngineService } from './services/correlation-engine.service';
import { DailySummaryService } from './services/daily-summary.service';

@Controller('insights')
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly correlationEngineService: CorrelationEngineService,
    private readonly dailySummaryService: DailySummaryService,
  ) {}

  @Get('logs/:userId')
  async getInsights(@Param('userId') userId: string) {
    return this.insightsService.getInsights(userId);
  }

  @Put('logs/:id/read')
  async markAsRead(@Param('id') id: string) {
    return this.insightsService.markAsRead(id);
  }

  @Put('logs/:id/dismiss')
  async dismissInsight(@Param('id') id: string) {
    return this.insightsService.dismissInsight(id);
  }

  @Post('analyze/:userId')
  async analyzeCorrelations(@Param('userId') userId: string) {
    return this.correlationEngineService.analyzeCorrelations(userId);
  }

  @Get('daily-summary/:userId')
  async getDailySummary(@Param('userId') userId: string, @Query('date') date: string) {
    return this.dailySummaryService.generateDailySummary(userId, date ? new Date(date) : new Date());
  }
}
