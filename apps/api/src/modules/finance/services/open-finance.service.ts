import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OpenFinanceService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const hasPluggy = !!process.env.PLUGGY_CLIENT_ID;
    const hasBelvo = !!process.env.BELVO_SECRET_ID;

    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId }
    });

    return {
      configured: hasPluggy || hasBelvo,
      providers: {
        pluggy: hasPluggy,
        belvo: hasBelvo
      },
      connections
    };
  }

  async connectWidget(userId: string, payload: any) {
    const provider = payload.provider || 'PLUGGY';
    const itemId = payload.itemId;

    if (!itemId) {
      throw new Error('Item ID is required');
    }

    return this.prisma.openFinanceConnection.create({
      data: {
        userId,
        provider,
        itemId,
        institutionName: payload.institutionName || 'Unknown',
        status: 'CONNECTED',
      }
    });
  }

  async handleWebhook(payload: any) {
    console.log('Received Open Finance Webhook:', payload);
    return { received: true };
  }
}
