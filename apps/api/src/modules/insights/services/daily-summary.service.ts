import { Injectable } from '@nestjs/common';

export interface DailySummary {
  userId: string;
  date: Date;
  wellbeingScore: number; // 0-100
  financialHealthScore: number; // 0-100
  metrics: {
    caloriesBurned: number;
    caloriesConsumed: number;
    sleepHours: number;
    totalSpent: number;
    totalIncome: number;
  };
}

@Injectable()
export class DailySummaryService {
  async generateDailySummary(userId: string, date: Date): Promise<DailySummary> {
    // In a real app, this would aggregate data from the Health and Finance modules for the given date.
    
    // Simulated aggregation
    const wellbeingScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const financialHealthScore = Math.floor(Math.random() * 40) + 60; // 60-100
    
    return {
      userId,
      date,
      wellbeingScore,
      financialHealthScore,
      metrics: {
        caloriesBurned: 2400,
        caloriesConsumed: 2100,
        sleepHours: 7.5,
        totalSpent: 45.50,
        totalIncome: 0,
      }
    };
  }
}
