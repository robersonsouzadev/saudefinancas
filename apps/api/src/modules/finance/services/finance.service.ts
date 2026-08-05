import { Injectable } from '@nestjs/common';

export interface FinancialAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
}

@Injectable()
export class FinanceService {
  private accounts: FinancialAccount[] = [];
  private transactions: Transaction[] = [];

  async createAccount(data: Partial<FinancialAccount>): Promise<FinancialAccount> {
    const account = { id: Math.random().toString(), balance: 0, ...data } as FinancialAccount;
    this.accounts.push(account);
    return account;
  }

  async getUserAccounts(userId: string): Promise<FinancialAccount[]> {
    return this.accounts.filter(a => a.userId === userId);
  }

  async updateAccount(accountId: string, data: Partial<FinancialAccount>): Promise<FinancialAccount> {
    const idx = this.accounts.findIndex(a => a.id === accountId);
    if (idx > -1) {
      this.accounts[idx] = { ...this.accounts[idx], ...data };
      return this.accounts[idx];
    }
    throw new Error('Account not found');
  }

  async deleteAccount(accountId: string): Promise<void> {
    this.accounts = this.accounts.filter(a => a.id !== accountId);
  }

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = { id: Math.random().toString(), date: new Date(), ...data } as Transaction;
    this.transactions.push(transaction);
    
    // Update account balance
    const account = this.accounts.find(a => a.id === transaction.accountId);
    if (account) {
      account.balance += transaction.type === 'income' ? transaction.amount : -transaction.amount;
    }
    return transaction;
  }

  async getTransactions(userId: string, filter?: any): Promise<Transaction[]> {
    return this.transactions.filter(t => t.userId === userId);
  }

  async updateTransaction(transactionId: string, data: Partial<Transaction>): Promise<Transaction> {
    const idx = this.transactions.findIndex(t => t.id === transactionId);
    if (idx > -1) {
      const oldType = this.transactions[idx].type;
      const oldAmount = this.transactions[idx].amount;
      const accountId = this.transactions[idx].accountId;
      
      this.transactions[idx] = { ...this.transactions[idx], ...data };
      
      const account = this.accounts.find(a => a.id === accountId);
      if (account) {
        account.balance -= oldType === 'income' ? oldAmount : -oldAmount;
        account.balance += this.transactions[idx].type === 'income' ? this.transactions[idx].amount : -this.transactions[idx].amount;
      }
      return this.transactions[idx];
    }
    throw new Error('Transaction not found');
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const idx = this.transactions.findIndex(t => t.id === transactionId);
    if (idx > -1) {
      const { type, amount, accountId } = this.transactions[idx];
      const account = this.accounts.find(a => a.id === accountId);
      if (account) {
        account.balance -= type === 'income' ? amount : -amount;
      }
      this.transactions.splice(idx, 1);
    }
  }

  async getFinancialOverview(userId: string, period: string) {
    const userTransactions = this.transactions.filter(t => t.userId === userId);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const t of userTransactions) {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryBreakdown
    };
  }
}
