import { Controller, Get, Post, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HealthTrackerService } from './services/health-tracker.service';
import { HealthAnalyticsService } from './services/health-analytics.service';

@Controller('health-tracker')
@UseGuards(JwtAuthGuard)
export class HealthTrackerController {
  constructor(
    private readonly healthTrackerService: HealthTrackerService,
    private readonly healthAnalyticsService: HealthAnalyticsService,
  ) {}

  @Get('daily')
  async getDailyLog(@Request() req: any, @Query('date') date?: string) {
    const userId = req.user.id;
    return this.healthTrackerService.getDailyLog(userId, date);
  }

  @Post('daily')
  async upsertDailyLog(@Request() req: any, @Body() body: { date?: string; data?: any }) {
    const userId = req.user.id;
    const dateInput = body.date || new Date().toISOString();
    const dataPayload = body.data || body;
    return this.healthTrackerService.upsertDailyLog(userId, dateInput, dataPayload);
  }

  @Post('water')
  async addWaterIntake(@Request() req: any, @Body() body: { amountMl: number; date?: string }) {
    const userId = req.user.id;
    const amountMl = Number(body.amountMl || 250);
    return this.healthTrackerService.addWaterIntake(userId, amountMl, body.date);
  }

  @Get('streak')
  async getStreak(@Request() req: any) {
    const userId = req.user.id;
    return this.healthTrackerService.getStreak(userId);
  }

  @Post('streak/shield')
  async useShield(@Request() req: any) {
    const userId = req.user.id;
    return this.healthTrackerService.useShield(userId);
  }

  @Get('calendar')
  async getCalendarRange(@Request() req: any, @Query('days') days?: string) {
    const userId = req.user.id;
    const daysCount = parseInt(days || '14', 10);
    return this.healthTrackerService.getCalendarRange(userId, daysCount);
  }

  @Get('hydration-settings')
  async getHydrationSettings(@Request() req: any) {
    const userId = req.user.id;
    return this.healthTrackerService.getHydrationSettings(userId);
  }

  @Put('hydration-settings')
  async updateHydrationSettings(@Request() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.healthTrackerService.updateHydrationSettings(userId, body);
  }

  @Get('analytics/trends')
  async getHealthTrends(@Request() req: any, @Query('days') days?: string) {
    const userId = req.user.id;
    return this.healthAnalyticsService.getHealthTrends(userId, parseInt(days || '7', 10));
  }

  @Post('generate-story')
  async generateStory(@Request() req: any) {
    const userId = req.user.id;
    return this.healthAnalyticsService.generateHealthStory(userId);
  }
}
