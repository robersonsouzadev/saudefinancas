import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CostCentersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCostCenters(userId: string) {
    return this.prisma.costCenter.findMany({
      where: { userId, isActive: true },
      include: {
        _count: {
          select: { titles: true, transactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCostCenter(userId: string, dto: { name: string; color?: string }) {
    if (!dto.name) {
      throw new BadRequestException('Nome do Centro de Custo é obrigatório.');
    }

    return this.prisma.costCenter.create({
      data: {
        userId,
        name: dto.name,
        color: dto.color || '#3b82f6',
      },
    });
  }

  async updateCostCenter(userId: string, id: string, dto: { name?: string; color?: string }) {
    const costCenter = await this.prisma.costCenter.findFirst({ where: { id, userId } });
    if (!costCenter) throw new NotFoundException('Centro de Custo não encontrado.');

    return this.prisma.costCenter.update({
      where: { id },
      data: {
        name: dto.name ?? costCenter.name,
        color: dto.color ?? costCenter.color,
      },
    });
  }

  async deleteCostCenter(userId: string, id: string) {
    const costCenter = await this.prisma.costCenter.findFirst({ where: { id, userId } });
    if (!costCenter) throw new NotFoundException('Centro de Custo não encontrado.');

    return this.prisma.costCenter.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
