import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WebhookQueueService } from './services/webhook-queue.service';
import { MessageSenderService } from './services/message-sender.service';
import { MultimodalService } from './services/multimodal.service';
import { WhisperService } from './services/whisper.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [WhatsappController],
  providers: [
    WebhookQueueService,
    MessageSenderService,
    MultimodalService,
    WhisperService,
    PrismaService,
  ],
  exports: [MessageSenderService],
})
export class WhatsappModule {}
