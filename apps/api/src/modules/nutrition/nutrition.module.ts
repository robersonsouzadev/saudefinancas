import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './services/nutrition.service';
import { FoodVisionService } from './services/food-vision.service';
import { FoodDatabaseService } from './services/food-database.service';

@Module({
  controllers: [NutritionController],
  providers: [
    NutritionService,
    FoodVisionService,
    FoodDatabaseService,
  ],
  exports: [
    NutritionService,
    FoodVisionService,
    FoodDatabaseService,
  ],
})
export class NutritionModule {}
