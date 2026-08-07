import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async setBudget(userId: string, data: { category: string; amount: number; period?: string }) {
    const existing = await this.prisma.budget.findFirst({
      where: { userId, category: data.category }
    });

    if (existing) {
      return this.prisma.budget.update({
        where: { id: existing.id },
        data: {
          amount: parseFloat(data.amount as any),
          period: data.period || 'MONTHLY'
        }
      });
    }

    return this.prisma.budget.create({
      data: {
        userId,
        category: data.category,
        amount: parseFloat(data.amount as any),
        period: data.period || 'MONTHLY'
      }
    });
  }

  async getUserBudgets(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: { category: true }
    });

    // Group spending by category name
    const spendingMap: Record<string, number> = {};
    monthTxs.forEach(tx => {
      const catName = tx.category?.name || tx.description || 'Outros';
      spendingMap[catName] = (spendingMap[catName] || 0) + tx.amount;
    });

    return budgets.map(b => {
      const cat = b.category || 'Geral';
      const spent = spendingMap[cat] || 0;
      const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;

      return {
        ...b,
        spent,
        percentage: Math.min(100, Math.round(percentage)),
        isExceeded: spent > b.amount,
        remaining: Math.max(0, b.amount - spent)
      };
    });
  }

  async deleteBudget(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId }
    });
    if (!budget) throw new NotFoundException('Orçamento não encontrado');

    return this.prisma.budget.delete({ where: { id } });
  }
}

