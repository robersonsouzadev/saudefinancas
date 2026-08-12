import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionType, PaymentMethod } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, data: any) {
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
    const type = (data.type as TransactionType) || 'EXPENSE';
    const paymentMethod = (data.paymentMethod as PaymentMethod) || 'PIX';

    // Handle installments for CREDIT_CARD
    if (paymentMethod === 'CREDIT_CARD' && data.installments > 1 && data.creditCardId) {
      const installmentsCount = parseInt(data.installments, 10);
      const installmentAmount = amount / installmentsCount;

      const group = await this.prisma.installmentGroup.create({
        data: {
          userId,
          creditCardId: data.creditCardId,
          categoryId: category.id,
          description: data.description || 'Compra Parcelada',
          totalAmount: amount,
          totalInstallments: installmentsCount,
          installmentAmount,
          startDate: data.date ? new Date(data.date) : new Date(),
        }
      });

      const card = await this.prisma.creditCard.findUnique({ where: { id: data.creditCardId } });
      const dueDay = card ? card.dueDay : 10;
      
      const transactions = [];
      const baseDate = data.date ? new Date(data.date) : new Date();

      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, dueDay);

        const tx = await this.prisma.transaction.create({
          data: {
            userId,
            creditCardId: data.creditCardId,
            categoryId: category.id,
            installmentGroupId: group.id,
            type,
            paymentMethod,
            amount: installmentAmount,
            description: `${data.description || 'Compra'} (${i}/${installmentsCount})`,
            date: dueDate,
            notes: data.notes,
            tags: data.tags || [],
            installmentNumber: i
          }
        });

        await this.prisma.installment.create({
          data: {
            installmentGroupId: group.id,
            installmentNumber: i,
            amount: installmentAmount,
            dueDate,
            transactionId: tx.id
          }
        });

        transactions.push(tx);
      }
      return group;
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        paymentAccountId: data.paymentAccountId,
        creditCardId: data.creditCardId,
        categoryId: category.id,
        type,
        paymentMethod,
        amount,
        description: data.description || 'Transação',
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
        tags: data.tags || [],
      },
      include: {
        category: true,
      },
    });

    if (data.paymentAccountId && paymentMethod !== 'CREDIT_CARD') {
      const isExpense = type === 'EXPENSE';
      const balanceDelta = isExpense ? -amount : amount;

      await this.prisma.paymentAccount.update({
        where: { id: data.paymentAccountId },
        data: {
          balance: { increment: balanceDelta },
        },
      });
    }

    return transaction;
  }

  async updateTransaction(userId: string, transactionId: string, data: any) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { category: true },
    });

    if (!tx) throw new NotFoundException('Transação não encontrada');

    const catName = data.category || tx.category?.name || 'Outros';
    let category = await this.prisma.transactionCategory.findFirst({
      where: { name: catName },
    });
    if (!category) {
      category = await this.prisma.transactionCategory.create({
        data: { name: catName },
      });
    }

    const newAmount = data.amount !== undefined ? Math.abs(parseFloat(data.amount)) : tx.amount;
    
    // Reverse old balance
    if (tx.paymentAccountId && tx.paymentMethod !== 'CREDIT_CARD') {
      const oldDelta = tx.type === 'EXPENSE' ? tx.amount : -tx.amount;
      await this.prisma.paymentAccount.update({
        where: { id: tx.paymentAccountId },
        data: { balance: { increment: oldDelta } }
      });
    }

    const updatedTx = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: data.description !== undefined ? data.description : tx.description,
        amount: newAmount,
        categoryId: category.id,
        date: data.date ? new Date(data.date) : tx.date,
        type: data.type || tx.type,
        paymentMethod: data.paymentMethod || tx.paymentMethod,
        paymentAccountId: data.paymentAccountId !== undefined ? data.paymentAccountId : tx.paymentAccountId,
        creditCardId: data.creditCardId !== undefined ? data.creditCardId : tx.creditCardId,
        notes: data.notes !== undefined ? data.notes : tx.notes,
        tags: data.tags !== undefined ? data.tags : tx.tags,
      },
      include: { category: true },
    });

    // Apply new balance
    if (updatedTx.paymentAccountId && updatedTx.paymentMethod !== 'CREDIT_CARD') {
      const newDelta = updatedTx.type === 'EXPENSE' ? -updatedTx.amount : updatedTx.amount;
      await this.prisma.paymentAccount.update({
        where: { id: updatedTx.paymentAccountId },
        data: { balance: { increment: newDelta } }
      });
    }

    return updatedTx;
  }

  async getTransactions(userId: string, filters: any = {}) {
    const where: any = { userId };
    
    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.accountId) where.paymentAccountId = filters.accountId;
    
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { category: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.month && filters.year) {
      const m = parseInt(filters.month, 10);
      const y = parseInt(filters.year, 10);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const txs = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: true,
        paymentAccount: true,
        creditCard: true,
      },
    });

    return txs.map(t => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description || 'Transação',
      category: t.category?.name || 'Outros',
      type: t.type,
      paymentMethod: t.paymentMethod,
      method: t.paymentMethod,
      paymentAccountId: t.paymentAccountId,
      creditCardId: t.creditCardId,
      bank: t.paymentAccount?.bankName || t.creditCard?.name || t.paymentAccount?.name || '',
      paymentAccount: t.paymentAccount,
      creditCard: t.creditCard,
      amount: t.amount,
      notes: t.notes,
      tags: t.tags,
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
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
      } else if (t.type === 'EXPENSE') {
        totalExpenses += t.amount;
        const catName = t.category?.name || 'Outros';
        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
      }
    }

    const accounts = await this.prisma.paymentAccount.findMany({
      where: { userId, isActive: true }
    });
    const netBalance = accounts.reduce((acc, account) => acc + account.balance, 0);

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

    if (tx.paymentAccountId && tx.paymentMethod !== 'CREDIT_CARD') {
      const delta = tx.type === 'EXPENSE' ? tx.amount : -tx.amount;
      await this.prisma.paymentAccount.update({
        where: { id: tx.paymentAccountId },
        data: { balance: { increment: delta } }
      });
    }

    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });

    return { success: true };
  }
}
