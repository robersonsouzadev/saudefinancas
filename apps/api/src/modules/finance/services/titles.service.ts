import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TitleType, TitleStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class TitlesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garante atualização de status baseada no vencimento atual (OPEN -> OVERDUE ou DUE_TODAY)
   */
  private async updateOverdueStatuses(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Marca como DUE_TODAY o que vence hoje e está OPEN
    await this.prisma.financialTitle.updateMany({
      where: {
        userId,
        status: 'OPEN',
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      data: { status: 'DUE_TODAY' },
    });

    // Marca como OVERDUE o que venceu antes de hoje e está OPEN ou DUE_TODAY
    await this.prisma.financialTitle.updateMany({
      where: {
        userId,
        status: { in: ['OPEN', 'DUE_TODAY'] },
        dueDate: {
          lt: today,
        },
      },
      data: { status: 'OVERDUE' },
    });
  }

  async getTitles(userId: string, filters: {
    type?: TitleType;
    status?: TitleStatus;
    startDate?: string;
    endDate?: string;
    entityId?: string;
    categoryId?: string;
    costCenterId?: string;
    search?: string;
  }) {
    await this.updateOverdueStatuses(userId);

    const where: any = { userId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.costCenterId) where.costCenterId = filters.costCenterId;

    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { documentNumber: { contains: filters.search, mode: 'insensitive' } },
        { entityName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.financialTitle.findMany({
      where,
      include: {
        category: true,
        costCenter: true,
        entity: true,
        paymentAccount: true,
        payments: {
          include: { paymentAccount: true },
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createTitle(userId: string, dto: {
    type: TitleType;
    description: string;
    originalAmount: number;
    dueDate: string;
    competenceDate: string;
    issueDate?: string;
    documentNumber?: string;
    notes?: string;
    entityId?: string;
    entityName?: string;
    categoryId?: string;
    costCenterId?: string;
    paymentMethod?: PaymentMethod;
    paymentAccountId?: string;
    barcode?: string;
    pixKey?: string;
    attachmentUrl?: string;
  }) {
    if (!dto.description || !dto.originalAmount || !dto.dueDate || !dto.competenceDate) {
      throw new BadRequestException('Descrição, valor original, vencimento e data de competência são obrigatórios.');
    }

    const dueDate = new Date(dto.dueDate);
    const competenceDate = new Date(dto.competenceDate);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let initialStatus: TitleStatus = 'OPEN';
    if (dueDate < today) {
      initialStatus = 'OVERDUE';
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dueDate >= today && dueDate < tomorrow) {
        initialStatus = 'DUE_TODAY';
      }
    }

    // Tentar resolver nome da entidade se informado id
    let entityName = dto.entityName;
    if (dto.entityId && !entityName) {
      const entity = await this.prisma.financialEntity.findUnique({ where: { id: dto.entityId } });
      if (entity) entityName = entity.name;
    }

    return this.prisma.financialTitle.create({
      data: {
        userId,
        type: dto.type,
        status: initialStatus,
        description: dto.description,
        documentNumber: dto.documentNumber,
        notes: dto.notes,
        originalAmount: dto.originalAmount,
        finalAmount: dto.originalAmount,
        dueDate,
        competenceDate,
        issueDate,
        entityId: dto.entityId,
        entityName,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        paymentMethod: dto.paymentMethod || 'PIX',
        paymentAccountId: dto.paymentAccountId,
        barcode: dto.barcode,
        pixKey: dto.pixKey,
        attachmentUrl: dto.attachmentUrl,
      },
      include: {
        category: true,
        costCenter: true,
        entity: true,
        paymentAccount: true,
      },
    });
  }

  async payTitle(userId: string, titleId: string, paymentDto: {
    amount: number;
    paymentAccountId?: string;
    paymentMethod?: PaymentMethod;
    paymentDate?: string;
    discountApplied?: number;
    interestApplied?: number;
    proofUrl?: string;
    notes?: string;
  }) {
    const title = await this.prisma.financialTitle.findFirst({
      where: { id: titleId, userId },
    });

    if (!title) {
      throw new NotFoundException('Título financeiro não encontrado.');
    }

    if (title.status === 'PAID' || title.status === 'CANCELLED') {
      throw new BadRequestException('Este título já está quitado ou cancelado.');
    }

    const paymentAmount = paymentDto.amount;
    const discount = paymentDto.discountApplied || 0;
    const interest = paymentDto.interestApplied || 0;
    const paymentDate = paymentDto.paymentDate ? new Date(paymentDto.paymentDate) : new Date();

    const newPaidAmount = title.paidAmount + paymentAmount;
    const newDiscountTotal = (title.discountAmount || 0) + discount;
    const newInterestTotal = (title.interestAmount || 0) + interest;

    const expectedFinalAmount = title.originalAmount - newDiscountTotal + newInterestTotal;
    const isFullyPaid = newPaidAmount >= expectedFinalAmount;

    const newStatus: TitleStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    // Cria registro da Baixa
    const payment = await this.prisma.titlePayment.create({
      data: {
        titleId: title.id,
        paymentAccountId: paymentDto.paymentAccountId || title.paymentAccountId,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: paymentDto.paymentMethod || title.paymentMethod || 'PIX',
        discountApplied: discount,
        interestApplied: interest,
        proofUrl: paymentDto.proofUrl,
        notes: paymentDto.notes,
      },
    });

    // Atualiza o Título
    const updatedTitle = await this.prisma.financialTitle.update({
      where: { id: title.id },
      data: {
        paidAmount: newPaidAmount,
        discountAmount: newDiscountTotal,
        interestAmount: newInterestTotal,
        finalAmount: expectedFinalAmount,
        status: newStatus,
        paymentAccountId: paymentDto.paymentAccountId || title.paymentAccountId,
      },
      include: {
        category: true,
        costCenter: true,
        entity: true,
        paymentAccount: true,
        payments: true,
      },
    });

    // Atualiza saldo da Conta Bancária (se informada)
    const targetAccountId = paymentDto.paymentAccountId || title.paymentAccountId;
    if (targetAccountId) {
      const account = await this.prisma.paymentAccount.findUnique({ where: { id: targetAccountId } });
      if (account) {
        const balanceDelta = title.type === 'PAYABLE' ? -paymentAmount : paymentAmount;
        await this.prisma.paymentAccount.update({
          where: { id: targetAccountId },
          data: { balance: account.balance + balanceDelta },
        });
      }

      // Também registra como Transação no Extrato
      await this.prisma.transaction.create({
        data: {
          userId,
          paymentAccountId: targetAccountId,
          categoryId: title.categoryId,
          costCenterId: title.costCenterId,
          type: title.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME',
          paymentMethod: paymentDto.paymentMethod || title.paymentMethod || 'PIX',
          amount: paymentAmount,
          date: paymentDate,
          description: `Baixa Título: ${title.description}${discount > 0 ? ` (Desc. R$${discount})` : ''}${interest > 0 ? ` (Juros R$${interest})` : ''}`,
          notes: paymentDto.notes || title.notes,
        },
      });
    }

    return { title: updatedTitle, payment };
  }

  async batchPayTitles(userId: string, dto: {
    titleIds: string[];
    paymentAccountId?: string;
    paymentMethod?: PaymentMethod;
    paymentDate?: string;
  }) {
    const results = [];
    for (const titleId of dto.titleIds) {
      const title = await this.prisma.financialTitle.findFirst({
        where: { id: titleId, userId },
      });
      if (title && title.status !== 'PAID' && title.status !== 'CANCELLED') {
        const remainingAmount = (title.originalAmount - (title.discountAmount || 0) + (title.interestAmount || 0)) - title.paidAmount;
        const res = await this.payTitle(userId, title.id, {
          amount: remainingAmount,
          paymentAccountId: dto.paymentAccountId,
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate,
        });
        results.push(res);
      }
    }
    return { count: results.length, items: results };
  }

  async updateTitle(userId: string, id: string, dto: any) {
    const title = await this.prisma.financialTitle.findFirst({ where: { id, userId } });
    if (!title) throw new NotFoundException('Título não encontrado.');

    return this.prisma.financialTitle.update({
      where: { id },
      data: {
        description: dto.description ?? title.description,
        documentNumber: dto.documentNumber ?? title.documentNumber,
        originalAmount: dto.originalAmount ?? title.originalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : title.dueDate,
        competenceDate: dto.competenceDate ? new Date(dto.competenceDate) : title.competenceDate,
        entityId: dto.entityId ?? title.entityId,
        entityName: dto.entityName ?? title.entityName,
        categoryId: dto.categoryId ?? title.categoryId,
        costCenterId: dto.costCenterId ?? title.costCenterId,
        paymentMethod: dto.paymentMethod ?? title.paymentMethod,
        paymentAccountId: dto.paymentAccountId ?? title.paymentAccountId,
        barcode: dto.barcode ?? title.barcode,
        notes: dto.notes ?? title.notes,
      },
    });
  }

  async cancelTitle(userId: string, id: string) {
    const title = await this.prisma.financialTitle.findFirst({ where: { id, userId } });
    if (!title) throw new NotFoundException('Título não encontrado.');

    return this.prisma.financialTitle.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async getAgingReport(userId: string, type: TitleType = 'PAYABLE') {
    await this.updateOverdueStatuses(userId);

    const openTitles = await this.prisma.financialTitle.findMany({
      where: {
        userId,
        type,
        status: { in: ['OPEN', 'DUE_TODAY', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: { entity: true, category: true },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const aging = {
      upToDate: { count: 0, total: 0, items: [] as any[] },
      overdue1to30: { count: 0, total: 0, items: [] as any[] },
      overdue31to60: { count: 0, total: 0, items: [] as any[] },
      overdue61to90: { count: 0, total: 0, items: [] as any[] },
      overdue90Plus: { count: 0, total: 0, items: [] as any[] },
    };

    for (const title of openTitles) {
      const due = new Date(title.dueDate);
      due.setHours(0, 0, 0, 0);
      const remainingBalance = (title.originalAmount - (title.discountAmount || 0) + (title.interestAmount || 0)) - title.paidAmount;

      if (due >= now) {
        aging.upToDate.count++;
        aging.upToDate.total += remainingBalance;
        aging.upToDate.items.push(title);
      } else {
        const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) {
          aging.overdue1to30.count++;
          aging.overdue1to30.total += remainingBalance;
          aging.overdue1to30.items.push(title);
        } else if (diffDays <= 60) {
          aging.overdue31to60.count++;
          aging.overdue31to60.total += remainingBalance;
          aging.overdue31to60.items.push(title);
        } else if (diffDays <= 90) {
          aging.overdue61to90.count++;
          aging.overdue61to90.total += remainingBalance;
          aging.overdue61to90.items.push(title);
        } else {
          aging.overdue90Plus.count++;
          aging.overdue90Plus.total += remainingBalance;
          aging.overdue90Plus.items.push(title);
        }
      }
    }

    return aging;
  }
}
