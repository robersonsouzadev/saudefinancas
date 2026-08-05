import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { WebhookQueueService } from './services/webhook-queue.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly webhookQueue: WebhookQueueService) {}

  @Get('webhook')
  verifyWebhook(@Query() query: any) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    // Verification logic
    return challenge;
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    await this.webhookQueue.addJob(body);
    return 'EVENT_RECEIVED';
  }
}
