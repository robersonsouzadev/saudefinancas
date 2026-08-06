import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateAccount(userId: string) {
    let account = await this.prisma.financialAccount.findFirst({
      where: { userId },
    });

    if (!account) {
      account = await this.prisma.financialAccount.create({
        data: {
          userId,
          name: 'Conta Principal',
          balance: 0,
        },
      });
    }

    return account;
  }

  async getUserAccounts(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    return [account];
  }

  async createTransaction(userId: string, data: any) {
    const account = await this.getOrCreateAccount(userId);

    const catName = data.category || 'Outros';
    let category = await this.prisma.transactionCategory.findFirst({
      where: { name: catName },
    });

    if (!category) {
      category = await this.prisma.transactionCategory.create({
        data: { name: catName },
      });
    }

    const amount = Math.abs(parseFloat(data.amount) || 0);

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: account.id,
        categoryId: category.id,
        amount,
        description: data.description || 'Transação',
        date: data.date ? new Date(data.date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    // Update account balance (EXPENSE subtracts, INCOME adds)
    const isExpense = data.type !== 'INCOME';
    const balanceDelta = isExpense ? -amount : amount;

    await this.prisma.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: { increment: balanceDelta },
      },
    });

    return transaction;
  }

  async updateTransaction(userId: string, transactionId: string, data: any) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { category: true },
    });

    if (!tx) throw new NotFoundException('Transação não encontrada');

    const account = await this.getOrCreateAccount(userId);

    // Prepare category
    const catName = data.category || tx.category?.name || 'Outros';
    let category = await this.prisma.transactionCategory.findFirst({
      where: { name: catName },
    });
    if (!category) {
      category = await this.prisma.transactionCategory.create({
        data: { name: catName },
      });
    }

    // Update transaction record
    const newAmount = Math.abs(parseFloat(data.amount) || tx.amount);
    const updatedTx = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: data.description !== undefined ? data.description : tx.description,
        amount: newAmount,
        categoryId: category.id,
        date: data.date ? new Date(data.date) : tx.date,
      },
      include: { category: true },
    });

    // Recalculate full balance
    await this.recalculateAccountBalance(userId);

    return updatedTx;
  }

  async getTransactions(userId: string) {
    const txs = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        category: true,
      },
    });

    return txs.map(t => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description || 'Transação',
      category: t.category?.name || 'Outros',
      type: 'EXPENSE' as const,
      amount: t.amount,
      user: 'Você',
    }));
  }

  async getFinancialOverview(userId: string, period?: string) {
    const txs = await this.prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const t of txs) {
      totalExpenses += t.amount;
      const catName = t.category?.name || 'Outros';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
    }

    const netBalance = txs.length > 0 ? (totalIncome - totalExpenses) : 0;
    const account = await this.getOrCreateAccount(userId);

    if (account.balance !== netBalance) {
      await this.prisma.financialAccount.update({
        where: { id: account.id },
        data: { balance: netBalance },
      });
    }

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      categoryBreakdown,
    };
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!tx) throw new NotFoundException('Transação não encontrada');

    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });

    await this.recalculateAccountBalance(userId);

    return { success: true };
  }

  private async recalculateAccountBalance(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    const txs = await this.prisma.transaction.findMany({
      where: { userId },
    });

    let balance = 0;
    for (const t of txs) {
      balance -= t.amount; // default to expense
    }

    await this.prisma.financialAccount.update({
      where: { id: account.id },
      data: { balance },
    });
  }
}
