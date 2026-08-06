import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BoletoStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class BoletosService {
  constructor(private prisma: PrismaService) {}

  async createBoleto(userId: string, data: any) {
    return this.prisma.boletoPayment.create({
      data: {
        userId,
        description: data.description,
        barcode: data.barcode,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        status: BoletoStatus.PENDING,
      },
    });
  }

  async getBoletos(userId: string, status?: string) {
    return this.prisma.boletoPayment.findMany({
      where: {
        userId,
        ...(status ? { status: status as BoletoStatus } : {})
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  async payBoleto(userId: string, boletoId: string, payData: any) {
    const boleto = await this.prisma.boletoPayment.findFirst({
      where: { id: boletoId, userId }
    });
    if (!boleto) throw new NotFoundException('Boleto não encontrado');

    const paidAmount = payData.paidAmount || boleto.amount;
    const paymentMethod = (payData.paymentMethod as PaymentMethod) || PaymentMethod.PIX;
    
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        paymentAccountId: payData.paymentAccountId,
        type: 'EXPENSE',
        paymentMethod,
        amount: paidAmount,
        description: `Quitação Boleto: ${boleto.description}`,
        date: payData.paidAt ? new Date(payData.paidAt) : new Date(),
      }
    });

    if (payData.paymentAccountId) {
      await this.prisma.paymentAccount.update({
        where: { id: payData.paymentAccountId },
        data: { balance: { decrement: paidAmount } }
      });
    }

    return this.prisma.boletoPayment.update({
      where: { id: boletoId },
      data: {
        status: BoletoStatus.PAID,
        paidAt: payData.paidAt ? new Date(payData.paidAt) : new Date(),
        paidAmount,
        paymentAccountId: payData.paymentAccountId,
        paymentMethod,
        transactionId: transaction.id
      }
    });
  }

  async deleteBoleto(userId: string, boletoId: string) {
    const boleto = await this.prisma.boletoPayment.findFirst({
      where: { id: boletoId, userId }
    });
    if (!boleto) throw new NotFoundException('Boleto não encontrado');

    return this.prisma.boletoPayment.delete({
      where: { id: boletoId }
    });
  }
}
