import { Injectable } from '@nestjs/common';

export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextRun: Date;
}

@Injectable()
export class RecurringService {
  private recurringTx: RecurringTransaction[] = [];

  async createRecurringTransaction(data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const tx = { id: Math.random().toString(), ...data } as RecurringTransaction;
    this.recurringTx.push(tx);
    return tx;
  }

  async getUserRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
    return this.recurringTx.filter(t => t.userId === userId);
  }
  
  async updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const idx = this.recurringTx.findIndex(t => t.id === id);
    if (idx > -1) {
      this.recurringTx[idx] = { ...this.recurringTx[idx], ...data };
      return this.recurringTx[idx];
    }
    throw new Error('Recurring transaction not found');
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    this.recurringTx = this.recurringTx.filter(t => t.id !== id);
  }
}
