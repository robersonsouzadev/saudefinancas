import { Injectable } from '@nestjs/common';
import { HealthTrackerService } from './health-tracker.service';

export interface HealthTrends {
  averageSleep: number;
  totalExerciseMinutes: number;
  averageMood: number;
  averageStress: number;
  daysAnalyzed: number;
}

@Injectable()
export class HealthAnalyticsService {
  constructor(private readonly healthTrackerService: HealthTrackerService) {}

  async getHealthTrends(userId: string, days: number): Promise<HealthTrends> {
    const allowedDays = [7, 30, 90];
    if (!allowedDays.includes(days)) {
      days = 7;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const logs = await this.healthTrackerService.getHealthLogsRange(userId, startDate, endDate);

    if (!logs.length) {
      return {
        averageSleep: 0,
        totalExerciseMinutes: 0,
        averageMood: 0,
        averageStress: 0,
        daysAnalyzed: days,
      };
    }

    let totalSleep = 0, totalExercise = 0, totalMood = 0, totalStress = 0;
    let sleepCount = 0, moodCount = 0, stressCount = 0;

    for (const log of logs) {
      if (log.sleepHours != null) {
        totalSleep += log.sleepHours;
        sleepCount++;
      }
      if (log.exerciseMinutes != null) {
        totalExercise += log.exerciseMinutes;
      }
      if (log.moodScore != null) {
        totalMood += log.moodScore;
        moodCount++;
      }
      if (log.stressLevel != null) {
        totalStress += log.stressLevel;
        stressCount++;
      }
    }

    return {
      averageSleep: sleepCount > 0 ? Number((totalSleep / sleepCount).toFixed(2)) : 0,
      totalExerciseMinutes: totalExercise,
      averageMood: moodCount > 0 ? Number((totalMood / moodCount).toFixed(2)) : 0,
      averageStress: stressCount > 0 ? Number((totalStress / stressCount).toFixed(2)) : 0,
      daysAnalyzed: days,
    };
  }
}
