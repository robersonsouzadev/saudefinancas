import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntities(userId: string, type?: EntityType) {
    const where: any = { userId };
    if (type) where.type = type;

    return this.prisma.financialEntity.findMany({
      where,
      include: {
        _count: {
          select: { titles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createEntity(userId: string, dto: {
    type: EntityType;
    name: string;
    document?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) {
    if (!dto.name || !dto.type) {
      throw new BadRequestException('Nome e tipo (SUPPLIER/CLIENT) são obrigatórios.');
    }

    return this.prisma.financialEntity.create({
      data: {
        userId,
        type: dto.type,
        name: dto.name,
        document: dto.document,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      },
    });
  }

  async updateEntity(userId: string, id: string, dto: any) {
    const entity = await this.prisma.financialEntity.findFirst({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    return this.prisma.financialEntity.update({
      where: { id },
      data: {
        name: dto.name ?? entity.name,
        type: dto.type ?? entity.type,
        document: dto.document ?? entity.document,
        email: dto.email ?? entity.email,
        phone: dto.phone ?? entity.phone,
        notes: dto.notes ?? entity.notes,
      },
    });
  }

  async deleteEntity(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    return this.prisma.financialEntity.delete({ where: { id } });
  }

  async getEntityStatement(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({
      where: { id, userId },
      include: {
        titles: {
          include: {
            category: true,
            payments: true,
          },
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    const totalTitles = entity.titles.length;
    const totalOriginalAmount = entity.titles.reduce((acc, t) => acc + t.originalAmount, 0);
    const totalPaidAmount = entity.titles.reduce((acc, t) => acc + t.paidAmount, 0);
    const totalPendingAmount = totalOriginalAmount - totalPaidAmount;

    return {
      entity,
      summary: {
        totalTitles,
        totalOriginalAmount,
        totalPaidAmount,
        totalPendingAmount,
      },
    };
  }
}
