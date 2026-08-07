import { Module } from '@nestjs/common';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './services/workouts.service';
import { WorkoutAIService } from './services/workout-ai.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutAIService, EncryptionService],
  exports: [WorkoutsService, WorkoutAIService],
})
export class WorkoutsModule {}
