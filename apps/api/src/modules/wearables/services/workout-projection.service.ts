import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WorkoutActivity } from '@prisma/client';
import { NormalizedActivityData } from './fit-normalizer.service';

@Injectable()
export class WorkoutProjectionService {
  private readonly logger = new Logger(WorkoutProjectionService.name);

  async projectActivityToWorkoutSession(
    tx: Prisma.TransactionClient,
    activity: WorkoutActivity,
    data: NormalizedActivityData,
  ): Promise<void> {
    const existingSession = await tx.workoutSession.findUnique({
      where: { workoutActivityId: activity.id },
    });

    const title = data.sportNameOriginal 
      ? `Treino (${data.sportCategory}) — ${data.sportNameOriginal}` 
      : `Treino de ${data.sportCategory}`;

    const durationMinutes = Math.max(1, Math.round(activity.durationSeconds / 60));

    if (existingSession) {
      // Atualização idempotente preservando notas e rating do usuário
      await tx.workoutSession.update({
        where: { id: existingSession.id },
        data: {
          title: existingSession.title || title,
          startedAt: activity.startedAt,
          finishedAt: activity.finishedAt,
          durationMinutes,
          caloriesBurned: activity.totalCaloriesEstimated,
        },
      });
    } else {
      // Criação de nova projeção
      await tx.workoutSession.create({
        data: {
          userId: activity.userId,
          workoutActivityId: activity.id,
          title,
          startedAt: activity.startedAt,
          finishedAt: activity.finishedAt,
          durationMinutes,
          caloriesBurned: activity.totalCaloriesEstimated,
          intensity: activity.maxHeartRate && activity.maxHeartRate > 165 ? 'VIGOROUS' : 'MODERATE',
        },
      });
    }
  }
}
