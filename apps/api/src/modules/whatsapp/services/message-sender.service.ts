import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageSenderService {
  async sendMessage(to: string, text: string) {
    // Mock Uazapi sending
    return { success: true, to, text };
  }
  
  async sendMedia(to: string, mediaUrl: string) {
    return { success: true, to, mediaUrl };
  }
}
