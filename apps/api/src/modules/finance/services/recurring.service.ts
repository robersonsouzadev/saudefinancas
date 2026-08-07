import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RecurringService {
  constructor(private prisma: PrismaService) {}

  async createRecurringRule(userId: string, data: any) {
    return this.prisma.recurringRule.create({
      data: {
        userId,
        description: data.description,
        amount: parseFloat(data.amount),
        type: data.type || 'EXPENSE',
        paymentMethod: data.paymentMethod || 'PIX',
        paymentAccountId: data.paymentAccountId || null,
        categoryId: data.categoryId || null,
        frequency: data.frequency || 'MONTHLY',
        dayOfMonth: data.dayOfMonth ? parseInt(data.dayOfMonth) : 1,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        paymentAccount: true,
        category: true,
      }
    });
  }

  async getUserRecurringRules(userId: string) {
    return this.prisma.recurringRule.findMany({
      where: { userId, isActive: true },
      include: {
        paymentAccount: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteRecurringRule(userId: string, id: string) {
    const rule = await this.prisma.recurringRule.findFirst({
      where: { id, userId }
    });
    if (!rule) throw new NotFoundException('Regra recorrente não encontrada');

    return this.prisma.recurringRule.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

