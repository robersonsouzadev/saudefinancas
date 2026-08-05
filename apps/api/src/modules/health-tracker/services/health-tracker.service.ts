import { Injectable } from '@nestjs/common';

export interface HealthLogData {
  id?: string;
  userId: string;
  date: Date;
  sleepHours?: number;
  exerciseMinutes?: number;
  moodScore?: number;
  stressLevel?: number;
  waterIntakeMl?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  weightKg?: number;
}

export interface HealthGoalData {
  id?: string;
  userId: string;
  title: string;
  metric: string;
  targetValue: number;
  deadline?: Date;
}

@Injectable()
export class HealthTrackerService {
  // Using in-memory arrays to mock the database since the Prisma schema is not yet defined.
  private logs: HealthLogData[] = [];
  private goals: HealthGoalData[] = [];

  async upsertDailyLog(userId: string, date: Date, data: Partial<HealthLogData>) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const existingIndex = this.logs.findIndex(
      (log) => log.userId === userId && log.date.getTime() === startOfDay.getTime()
    );

    if (existingIndex > -1) {
      this.logs[existingIndex] = { ...this.logs[existingIndex], ...data, date: startOfDay };
      return this.logs[existingIndex];
    } else {
      const newLog: HealthLogData = {
        id: Math.random().toString(36).substring(7),
        userId,
        date: startOfDay,
        ...data,
      };
      this.logs.push(newLog);
      return newLog;
    }
  }

  async createGoal(userId: string, data: Omit<HealthGoalData, 'id' | 'userId'>) {
    const newGoal: HealthGoalData = {
      id: Math.random().toString(36).substring(7),
      userId,
      ...data,
    };
    this.goals.push(newGoal);
    return newGoal;
  }

  async getUserGoals(userId: string) {
    return this.goals.filter((goal) => goal.userId === userId);
  }

  async updateGoal(userId: string, goalId: string, data: Partial<HealthGoalData>) {
    const goalIndex = this.goals.findIndex((g) => g.id === goalId && g.userId === userId);
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }
    this.goals[goalIndex] = { ...this.goals[goalIndex], ...data };
    return this.goals[goalIndex];
  }

  async getHealthLogsRange(userId: string, startDate: Date, endDate: Date) {
    return this.logs.filter((log) => {
      return log.userId === userId && log.date >= startDate && log.date <= endDate;
    });
  }
}
