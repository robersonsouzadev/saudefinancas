import { Module } from '@nestjs/common';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './services/workouts.service';
import { WorkoutAIService } from './services/workout-ai.service';
import { ExerciseDBService } from './services/exercise-db.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutAIService, ExerciseDBService, EncryptionService],
  exports: [WorkoutsService, WorkoutAIService, ExerciseDBService],
})
export class WorkoutsModule {}
