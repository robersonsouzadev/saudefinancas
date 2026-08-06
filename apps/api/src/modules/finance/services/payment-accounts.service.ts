import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentAccountsService {
  constructor(private prisma: PrismaService) {}

  async createAccount(userId: string, data: any) {
    return this.prisma.paymentAccount.create({
      data: {
        userId,
        name: data.name || 'Nova Conta',
        bankName: data.bankName,
        bankColor: data.bankColor,
        accountType: data.accountType || 'CHECKING',
        balance: data.balance || 0,
      },
    });
  }

  async getUserAccounts(userId: string) {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { userId, isActive: true },
    });

    if (accounts.length === 0) {
      const defaultAccount = await this.prisma.paymentAccount.create({
        data: {
          userId,
          name: 'Conta Principal',
          balance: 0,
          isDefault: true,
        },
      });
      return [defaultAccount];
    }

    return accounts;
  }

  async updateAccount(userId: string, id: string, data: any) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    return this.prisma.paymentAccount.update({
      where: { id },
      data,
    });
  }

  async deleteAccount(userId: string, id: string) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    return this.prisma.paymentAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
