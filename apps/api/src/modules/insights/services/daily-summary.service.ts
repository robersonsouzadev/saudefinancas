import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DailySummary {
  userId: string;
  date: Date;
  wellbeingScore: number; // 0-100
  metrics: {
    caloriesBurned: number;
    caloriesConsumed: number;
    sleepHours: number;
    waterIntakeMl: number;
    trainingCompleted: boolean;
  };
}

@Injectable()
export class DailySummaryService {
  constructor(private prisma: PrismaService) {}

  async generateDailySummary(userId: string, date: Date): Promise<DailySummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayLog, workoutsToday, mealsToday] = await Promise.all([
      this.prisma.dailyHealthLog.findUnique({
        where: { userId_date: { userId, date: startOfDay } },
      }),
      this.prisma.workoutSession.findMany({
        where: {
          userId,
          startedAt: { gte: startOfDay, lte: endOfDay },
          finishedAt: { not: null },
        },
      }),
      this.prisma.mealLog.findMany({
        where: {
          userId,
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const caloriesBurned = workoutsToday.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const caloriesConsumed = mealsToday.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
    const sleepHours = todayLog?.sleepHours || 7;
    const waterIntakeMl = todayLog?.waterIntakeMl || 0;

    let wellbeingScore = 75;
    if (todayLog?.vitalityScore) {
      wellbeingScore = Math.round(todayLog.vitalityScore);
    } else {
      const sleepScore = Math.min(35, (sleepHours / 8) * 35);
      const waterScore = Math.min(30, (waterIntakeMl / (todayLog?.waterGoalMl || 2500)) * 30);
      const workoutBonus = workoutsToday.length > 0 ? 15 : 0;
      const moodScore = ((todayLog?.moodScore || 4) / 5) * 20;
      wellbeingScore = Math.round(sleepScore + waterScore + workoutBonus + moodScore);
    }

    return {
      userId,
      date,
      wellbeingScore: Math.min(100, Math.max(0, wellbeingScore)),
      metrics: {
        caloriesBurned: Math.round(caloriesBurned),
        caloriesConsumed: Math.round(caloriesConsumed),
        sleepHours,
        waterIntakeMl,
        trainingCompleted: workoutsToday.length > 0,
      },
    };
  }
}
