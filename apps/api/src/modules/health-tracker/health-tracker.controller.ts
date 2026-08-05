import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { HealthTrackerService } from './services/health-tracker.service';
import { HealthAnalyticsService } from './services/health-analytics.service';

@Controller('health-tracker')
export class HealthTrackerController {
  constructor(
    private readonly healthTrackerService: HealthTrackerService,
    private readonly healthAnalyticsService: HealthAnalyticsService,
  ) {}

  @Post('logs')
  async upsertDailyLog(
    @Body('userId') userId: string,
    @Body('date') date: string,
    @Body('data') data: any,
  ) {
    return this.healthTrackerService.upsertDailyLog(userId, new Date(date), data);
  }

  @Get('logs')
  async getHealthLogsRange(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.healthTrackerService.getHealthLogsRange(
      userId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Post('goals')
  async createGoal(
    @Body('userId') userId: string,
    @Body() data: any,
  ) {
    return this.healthTrackerService.createGoal(userId, data);
  }

  @Get('goals')
  async getUserGoals(@Query('userId') userId: string) {
    return this.healthTrackerService.getUserGoals(userId);
  }

  @Put('goals/:id')
  async updateGoal(
    @Body('userId') userId: string,
    @Param('id') goalId: string,
    @Body() data: any,
  ) {
    return this.healthTrackerService.updateGoal(userId, goalId, data);
  }

  @Get('analytics/trends')
  async getHealthTrends(
    @Query('userId') userId: string,
    @Query('days') days: string,
  ) {
    return this.healthAnalyticsService.getHealthTrends(userId, parseInt(days || '7', 10));
  }
}
