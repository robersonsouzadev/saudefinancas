import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NutritionService, CreateMealDto } from './services/nutrition.service';
import { TacoDatabaseService } from './services/taco-database.service';

@Controller('nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(
    private readonly nutritionService: NutritionService,
    private readonly tacoService: TacoDatabaseService,
  ) {}

  @Get('meals')
  async getDailyMeals(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getDailyMeals(req.user.id, date);
  }

  @Post('meals')
  async createMealLog(@Req() req: any, @Body() dto: CreateMealDto) {
    return this.nutritionService.createMealLog(req.user.id, dto);
  }

  @Put('meals/:id/confirm')
  async confirmMeal(
    @Req() req: any,
    @Param('id') mealId: string,
    @Body() body: { items: any[] }
  ) {
    return this.nutritionService.confirmMeal(req.user.id, mealId, body.items || []);
  }

  @Delete('meals/:id')
  async deleteMeal(@Req() req: any, @Param('id') mealId: string) {
    return this.nutritionService.deleteMeal(req.user.id, mealId);
  }

  @Get('summary')
  async getDailySummary(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getDailySummary(req.user.id, date);
  }

  @Get('summary/week')
  async getWeeklySummary(@Req() req: any) {
    return this.nutritionService.getWeeklySummary(req.user.id);
  }

  @Get('calendar')
  async getMonthlyCalendar(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year) : undefined;
    const m = month ? parseInt(month) : undefined;
    return this.nutritionService.getMonthlyCalendar(req.user.id, y, m);
  }

  @Get('ai-suggestions')
  async getAiMealSuggestions(@Req() req: any, @Query('date') date?: string) {
    return this.nutritionService.getAiMealSuggestions(req.user.id, date);
  }

  @Get('goals')
  async getNutritionGoals(@Req() req: any) {
    return this.nutritionService.getNutritionGoals(req.user.id);
  }

  @Put('goals')
  async updateNutritionGoals(@Req() req: any, @Body() body: any) {
    return this.nutritionService.updateNutritionGoals(req.user.id, body);
  }

  @Get('foods/search')
  async searchFoods(@Query('q') query: string) {
    return this.tacoService.searchFood(query || '');
  }
}
