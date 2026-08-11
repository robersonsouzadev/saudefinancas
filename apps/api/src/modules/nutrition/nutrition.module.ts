import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './services/nutrition.service';
import { TacoDatabaseService } from './services/taco-database.service';

@Module({
  controllers: [NutritionController],
  providers: [
    NutritionService,
    TacoDatabaseService,
  ],
  exports: [
    NutritionService,
    TacoDatabaseService,
  ],
})
export class NutritionModule {}
