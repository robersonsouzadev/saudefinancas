import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CreditCardsService {
  constructor(private prisma: PrismaService) {}

  async createCard(userId: string, data: any) {
    return this.prisma.creditCard.create({
      data: {
        paymentAccountId: data.paymentAccountId,
        name: data.name,
        creditLimit: data.creditLimit || 0,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        cardColor: data.cardColor,
        brand: data.brand,
      },
    });
  }

  async getUserCards(userId: string) {
    const userCards = await this.prisma.creditCard.findMany({
      where: {
        isActive: true,
        paymentAccount: { userId }
      }
    });

    return Promise.all(userCards.map(async card => {
      const txs = await this.prisma.transaction.findMany({
        where: { creditCardId: card.id }
      });
      const usedLimit = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const availableLimit = Math.max(0, card.creditLimit - usedLimit);

      return {
        ...card,
        usedLimit,
        availableLimit
      };
    }));
  }

  async getCardBill(userId: string, cardId: string, month: number, year: number) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardId, paymentAccount: { userId } }
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');

    const txs = await this.prisma.transaction.findMany({
      where: {
        creditCardId: cardId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1)
        }
      }
    });

    return {
      cardId,
      month,
      year,
      total: txs.reduce((acc, tx) => acc + tx.amount, 0),
      transactions: txs,
    };
  }

  async updateCard(userId: string, id: string, data: any) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id, paymentAccount: { userId } }
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');

    return this.prisma.creditCard.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : card.name,
        creditLimit: data.creditLimit !== undefined ? parseFloat(data.creditLimit) : card.creditLimit,
        closingDay: data.closingDay !== undefined ? parseInt(data.closingDay) : card.closingDay,
        dueDay: data.dueDay !== undefined ? parseInt(data.dueDay) : card.dueDay,
        brand: data.brand !== undefined ? data.brand : card.brand,
        cardColor: data.cardColor !== undefined ? data.cardColor : card.cardColor,
      }
    });
  }

  async deleteCard(userId: string, id: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id, paymentAccount: { userId } }
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');

    return this.prisma.creditCard.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
