import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { WebhookQueueService } from './services/webhook-queue.service';
import { MessageSenderService } from './services/message-sender.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly webhookQueue: WebhookQueueService,
    private readonly messageSender: MessageSenderService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('webhook')
  verifyWebhook(@Query() query: any) {
    const challenge = query['hub.challenge'] || 'OK';
    return challenge;
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    await this.webhookQueue.addJob(body);
    return { status: 'EVENT_RECEIVED' };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async testWhatsappConnection(@Req() req: any, @Body() body: { phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return { success: false, message: 'Usuário não encontrado' };

    const targetPhone = body.phone || user.whatsappPhone || user.phone;
    if (!targetPhone) {
      return { success: false, message: 'Por favor, informe seu número de WhatsApp no perfil antes de testar.' };
    }

    const instance = user.uazapiInstance || 'Roberson';
    const token = user.uazapiToken || '';

    const testMessage = `🤖 *Saúde & Finanças — Teste de Integração UazAPI*\n\nOlá, ${user.name || 'Usuário'}!\n\nEsta é uma mensagem de verificação do assistente Vita. O seu canal oficial do WhatsApp e a instância "${instance}" estão configurados e prontos!\n\n✨ _Se você recebeu esta mensagem, sua integração UazAPI está 100% funcional!_`;

    return this.messageSender.sendMessage(targetPhone, testMessage, instance, token);
  }
}
