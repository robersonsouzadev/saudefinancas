import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class InvestmentsService {
  constructor(private prisma: PrismaService) {}

  async listAssets(userId: string) {
    return this.prisma.investmentAsset.findMany({
      where: { userId },
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAsset(userId: string, data: any) {
    const quantity = parseFloat(data.quantity || '0');
    const averagePrice = parseFloat(data.averagePrice || data.totalInvested || '0');
    const totalInvested = quantity * averagePrice;

    return this.prisma.investmentAsset.create({
      data: {
        userId,
        ticker: (data.ticker || '').toUpperCase(),
        name: data.name || data.ticker,
        type: data.type || 'FII',
        broker: data.broker || 'XP Investimentos',
        quantity,
        totalInvested,
        currentPrice: parseFloat(data.currentPrice || averagePrice),
        targetPercent: parseFloat(data.targetPercent || '10'),
      },
    });
  }

  async updateAsset(id: string, userId: string, data: any) {
    const asset = await this.prisma.investmentAsset.findFirst({
      where: { id, userId },
    });
    if (!asset) {
      throw new NotFoundException('Ativo não encontrado');
    }

    const quantity = data.quantity !== undefined ? parseFloat(data.quantity) : asset.quantity;
    const currentPrice = data.currentPrice !== undefined ? parseFloat(data.currentPrice) : asset.currentPrice;

    return this.prisma.investmentAsset.update({
      where: { id },
      data: {
        ticker: data.ticker ? data.ticker.toUpperCase() : asset.ticker,
        name: data.name ?? asset.name,
        type: data.type ?? asset.type,
        broker: data.broker ?? asset.broker,
        quantity,
        currentPrice,
        targetPercent: data.targetPercent !== undefined ? parseFloat(data.targetPercent) : asset.targetPercent,
      },
    });
  }

  async deleteAsset(id: string, userId: string) {
    const asset = await this.prisma.investmentAsset.findFirst({
      where: { id, userId },
    });
    if (!asset) {
      throw new NotFoundException('Ativo não encontrado');
    }
    return this.prisma.investmentAsset.delete({ where: { id } });
  }

  async getAdvice(userId: string, availableContribution: number) {
    const assets = await this.prisma.investmentAsset.findMany({
      where: { userId },
    });

    const currentTotalValue = assets.reduce(
      (sum, a) => sum + a.quantity * (a.currentPrice || 0),
      0,
    );

    return assets.map((a) => {
      const currentVal = a.quantity * (a.currentPrice || 0);
      const currentPercent =
        currentTotalValue > 0 ? (currentVal / currentTotalValue) * 100 : 0;
      const deficitPercent = Math.max(0, a.targetPercent - currentPercent);
      const suggestedAmount =
        deficitPercent > 0
          ? availableContribution * (deficitPercent / 100)
          : 0;

      return {
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        type: a.type,
        currentPercent: currentPercent.toFixed(1),
        targetPercent: a.targetPercent,
        suggestedAmount: Math.round(suggestedAmount),
      };
    });
  }
}
