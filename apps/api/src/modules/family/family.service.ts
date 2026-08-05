import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async createGroup(creatorUserId: string, data: { name: string; description?: string; memberIds?: string[] }) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorUserId } });
    if (!creator || creator.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas Administradores do sistema podem criar grupos familiares');
    }

    const group = await this.prisma.familyGroup.create({
      data: {
        name: data.name,
        description: data.description || null,
        members: {
          create: {
            userId: creatorUserId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, whatsappPhone: true, role: true },
            },
          },
        },
      },
    });

    if (data.memberIds && data.memberIds.length > 0) {
      for (const mId of data.memberIds) {
        if (mId !== creatorUserId) {
          await this.prisma.familyMember.upsert({
            where: { userId_groupId: { userId: mId, groupId: group.id } },
            create: { userId: mId, groupId: group.id, role: 'MEMBER' },
            update: {},
          });
        }
      }
    }

    return this.getGroupDetails(group.id, creatorUserId);
  }

  async getUserGroups(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, whatsappPhone: true, role: true },
                },
              },
            },
            budgets: {
              include: {
                allocations: {
                  include: { category: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return memberships.map(m => ({
      ...m.group,
      currentUserRole: m.role,
    }));
  }

  async getGroupDetails(groupId: string, userId: string) {
    const group = await this.prisma.familyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, whatsappPhone: true, role: true, avatarUrl: true },
            },
          },
        },
        budgets: {
          include: {
            allocations: {
              include: { category: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo familiar não encontrado');
    }

    const membership = group.members.find(m => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('Você não pertence a este grupo familiar');
    }

    return {
      ...group,
      currentUserRole: membership.role,
    };
  }

  async addMember(groupId: string, targetUserId: string, role: string = 'MEMBER') {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuário a ser adicionado não foi encontrado');
    }

    return this.prisma.familyMember.upsert({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      create: { userId: targetUserId, groupId, role },
      update: { role },
    });
  }

  async removeMember(groupId: string, targetUserId: string) {
    return this.prisma.familyMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
  }

  async setFamilyBudget(groupId: string, data: { month: number; year: number; totalAmount: number; allocations: Array<{ categoryId: string; percentage: number }> }) {
    const totalPercentage = data.allocations.reduce((sum, a) => sum + Number(a.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new BadRequestException(`A soma dos percentuais por categoria deve ser exatamente 100%. Soma atual: ${totalPercentage}%`);
    }

    const existingBudget = await this.prisma.familyBudget.findFirst({
      where: { groupId, month: data.month, year: data.year },
    });

    if (existingBudget) {
      await this.prisma.familyBudget.delete({ where: { id: existingBudget.id } });
    }

    return this.prisma.familyBudget.create({
      data: {
        groupId,
        month: data.month,
        year: data.year,
        totalAmount: data.totalAmount,
        allocations: {
          create: data.allocations.map(a => ({
            categoryId: a.categoryId,
            percentage: Number(a.percentage),
            allocatedAmount: (data.totalAmount * Number(a.percentage)) / 100,
            spentAmount: 0,
          })),
        },
      },
      include: {
        allocations: {
          include: { category: true },
        },
      },
    });
  }

  async getGroupFinances(groupId: string, requesterUserId: string, month?: number, year?: number) {
    const group = await this.prisma.familyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        budgets: {
          include: {
            allocations: {
              include: { category: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const requesterMember = group.members.find(m => m.userId === requesterUserId);
    if (!requesterMember) {
      throw new ForbiddenException('Acesso negado ao relatório familiar');
    }

    const isGroupAdmin = requesterMember.role === 'ADMIN';
    const memberUserIds = group.members.map(m => m.userId);

    // Fetch accounts & transactions
    const accounts = await this.prisma.financialAccount.findMany({
      where: { userId: { in: memberUserIds } },
      include: { user: { select: { id: true, name: true } } },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: { userId: { in: memberUserIds } },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryExpenses: Record<string, { categoryId?: string; name: string; amount: number }> = {};
    const memberBreakdown: Record<string, { userId: string; name: string; income: number; expenses: number; accountsCount: number }> = {};

    for (const m of group.members) {
      memberBreakdown[m.userId] = {
        userId: m.userId,
        name: m.user.name || m.user.email,
        income: 0,
        expenses: 0,
        accountsCount: accounts.filter(a => a.userId === m.userId).length,
      };
    }

    for (const t of transactions) {
      if (t.amount > 0) {
        totalIncome += t.amount;
        if (memberBreakdown[t.userId]) memberBreakdown[t.userId].income += t.amount;
      } else {
        const absAmount = Math.abs(t.amount);
        totalExpenses += absAmount;
        if (memberBreakdown[t.userId]) memberBreakdown[t.userId].expenses += absAmount;

        const catName = t.category?.name || 'Outros';
        if (!categoryExpenses[catName]) {
          categoryExpenses[catName] = { categoryId: t.categoryId || undefined, name: catName, amount: 0 };
        }
        categoryExpenses[catName].amount += absAmount;
      }
    }

    // Process family budget matching
    const latestBudget = group.budgets[0];
    const budgetComparison = latestBudget ? latestBudget.allocations.map(a => {
      const spent = categoryExpenses[a.category.name]?.amount || 0;
      const usagePercent = a.allocatedAmount > 0 ? Math.round((spent / a.allocatedAmount) * 100) : 0;
      return {
        categoryId: a.categoryId,
        categoryName: a.category.name,
        percentage: a.percentage,
        allocatedAmount: a.allocatedAmount,
        spentAmount: spent,
        usagePercent,
        status: usagePercent >= 100 ? 'EXCEEDED' : usagePercent >= 80 ? 'WARNING' : 'OK',
      };
    }) : [];

    // Filter account visibility based on role (ADMIN sees all member accounts; MEMBER sees only own accounts)
    const visibleAccounts = isGroupAdmin 
      ? accounts 
      : accounts.filter(a => a.userId === requesterUserId);

    return {
      groupId: group.id,
      groupName: group.name,
      requesterRole: requesterMember.role,
      isGroupAdmin,
      familyTotals: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        totalMembers: group.members.length,
      },
      memberBreakdown: Object.values(memberBreakdown),
      categoryExpenses: Object.values(categoryExpenses),
      budget: latestBudget ? {
        id: latestBudget.id,
        month: latestBudget.month,
        year: latestBudget.year,
        totalAmount: latestBudget.totalAmount,
        allocations: budgetComparison,
      } : null,
      accounts: visibleAccounts,
    };
  }
}
