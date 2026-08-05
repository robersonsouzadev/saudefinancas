import { Injectable } from '@nestjs/common';
import { FinanceService } from './finance.service';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amountLimit: number;
  alertAtPercent: number;
  period: 'monthly' | 'weekly';
}

export interface BudgetAlert {
  categoryId: string;
  limit: number;
  currentSpending: number;
  percentage: number;
  message: string;
}

@Injectable()
export class BudgetService {
  private budgets: Budget[] = [];

  constructor(private financeService: FinanceService) {}

  async setBudget(data: Partial<Budget>): Promise<Budget> {
    const existingIdx = this.budgets.findIndex(b => b.userId === data.userId && b.categoryId === data.categoryId);
    if (existingIdx > -1) {
      this.budgets[existingIdx] = { ...this.budgets[existingIdx], ...data };
      return this.budgets[existingIdx];
    }
    const newBudget = { id: Math.random().toString(), ...data } as Budget;
    this.budgets.push(newBudget);
    return newBudget;
  }

  async getUserBudgets(userId: string): Promise<Budget[]> {
    return this.budgets.filter(b => b.userId === userId);
  }

  async checkBudgetLimits(userId: string): Promise<BudgetAlert[]> {
    const userBudgets = await this.getUserBudgets(userId);
    const overview = await this.financeService.getFinancialOverview(userId, 'current_month');
    const alerts: BudgetAlert[] = [];

    for (const budget of userBudgets) {
      const spending = overview.categoryBreakdown[budget.categoryId] || 0;
      const percentage = (spending / budget.amountLimit) * 100;
      
      if (percentage >= budget.alertAtPercent) {
        alerts.push({
          categoryId: budget.categoryId,
          limit: budget.amountLimit,
          currentSpending: spending,
          percentage,
          message: `You have reached ${percentage.toFixed(2)}% of your budget for ${budget.categoryId}.`
        });
      }
    }
    return alerts;
  }
}
