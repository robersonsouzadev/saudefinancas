import { Injectable, NotFoundException } from '@nestjs/common';

export interface MealItemDto {
  name: string;
  weightG: number;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG?: number;
}

export interface CreateMealLogDto {
  type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  date: Date | string;
  items: MealItemDto[];
  imageUrl?: string;
}

@Injectable()
export class NutritionService {
  // Using in-memory array to mock the database temporarily
  private mealLogs: any[] = [];

  async createMealLog(userId: string, data: CreateMealLogDto) {
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalFiber = 0;

    for (const item of data.items) {
      totalCalories += item.calories;
      totalCarbs += item.carbsG;
      totalProtein += item.proteinG;
      totalFat += item.fatG;
      totalFiber += item.fiberG || 0;
    }

    const newLog = {
      id: Math.random().toString(36).substring(7),
      userId,
      ...data,
      date: new Date(data.date),
      totalCalories,
      totalCarbs,
      totalProtein,
      totalFat,
      totalFiber,
      confirmed: false,
    };
    
    this.mealLogs.push(newLog);
    return newLog;
  }

  async getMealLogsByDate(userId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.mealLogs.filter(log => {
      const logDate = new Date(log.date);
      return log.userId === userId && logDate >= startOfDay && logDate <= endOfDay;
    });
  }

  async deleteMealLog(userId: string, mealLogId: string) {
    const index = this.mealLogs.findIndex(log => log.id === mealLogId && log.userId === userId);
    if (index === -1) {
      throw new NotFoundException('Meal log not found');
    }
    const deleted = this.mealLogs.splice(index, 1);
    return deleted[0];
  }

  async confirmMealLog(userId: string, mealLogId: string) {
    const log = this.mealLogs.find(l => l.id === mealLogId && l.userId === userId);
    if (!log) {
      throw new NotFoundException('Meal log not found');
    }
    log.confirmed = true;
    return log;
  }

  async getDailyNutritionalSummary(userId: string, date: Date) {
    const logs = await this.getMealLogsByDate(userId, date);
    
    return logs.reduce((summary, log) => {
      summary.calories += log.totalCalories || 0;
      summary.carbs += log.totalCarbs || 0;
      summary.protein += log.totalProtein || 0;
      summary.fat += log.totalFat || 0;
      summary.fiber += log.totalFiber || 0;
      return summary;
    }, {
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      fiber: 0,
    });
  }
}
