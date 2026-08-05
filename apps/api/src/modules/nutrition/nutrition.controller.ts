import { Controller, Get, Post, Delete, Put, Body, Param, Query } from '@nestjs/common';
import { NutritionService, CreateMealLogDto } from './services/nutrition.service';
import { FoodVisionService } from './services/food-vision.service';
import { FoodDatabaseService } from './services/food-database.service';

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly nutritionService: NutritionService,
    private readonly foodVisionService: FoodVisionService,
    private readonly foodDatabaseService: FoodDatabaseService,
  ) {}

  @Post('meals')
  async createMealLog(
    @Body('userId') userId: string,
    @Body() data: CreateMealLogDto,
  ) {
    return this.nutritionService.createMealLog(userId, data);
  }

  @Get('meals')
  async getMealLogsByDate(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.nutritionService.getMealLogsByDate(userId, new Date(date));
  }

  @Delete('meals/:id')
  async deleteMealLog(
    @Body('userId') userId: string,
    @Param('id') mealLogId: string,
  ) {
    return this.nutritionService.deleteMealLog(userId, mealLogId);
  }

  @Put('meals/:id/confirm')
  async confirmMealLog(
    @Body('userId') userId: string,
    @Param('id') mealLogId: string,
  ) {
    return this.nutritionService.confirmMealLog(userId, mealLogId);
  }

  @Get('summary')
  async getDailyNutritionalSummary(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.nutritionService.getDailyNutritionalSummary(userId, new Date(date));
  }

  @Post('vision/analyze')
  async analyzeFoodImage(
    @Body('imageBufferBase64') imageBufferBase64: string,
    @Body('mimeType') mimeType: string,
  ) {
    const buffer = Buffer.from(imageBufferBase64, 'base64');
    return this.foodVisionService.analyzeFoodImage(buffer, mimeType);
  }

  @Get('database/search')
  async searchFood(@Query('query') query: string) {
    return this.foodDatabaseService.searchFood(query);
  }
}
