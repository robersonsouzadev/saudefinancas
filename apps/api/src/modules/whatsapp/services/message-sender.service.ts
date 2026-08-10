import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MessageSenderService {
  private readonly logger = new Logger(MessageSenderService.name);

  /**
   * Envia mensagem de texto via UazAPI para o destinatário
   */
  async sendMessage(to: string, text: string, instanceName?: string, token?: string) {
    let cleanPhone = (to || '').replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const serverUrl = process.env.UAZAPI_SERVER_URL || 'https://coliseu.uazapi.com';
    const instance = instanceName || process.env.UAZAPI_INSTANCE || 'Roberson';
    const authToken = token || process.env.UAZAPI_TOKEN || '';

    this.logger.log(`Tentando enviar mensagem WhatsApp para ${cleanPhone} via instância UazAPI "${instance}"`);

    // Endpoints padrões do UazAPI
    const endpoints = [
      `${serverUrl.replace(/\/$/, '')}/send/text`,
      `${serverUrl.replace(/\/$/, '')}/message/sendText`,
      `${serverUrl.replace(/\/$/, '')}/instance/${instance}/send-text`,
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: authToken,
            apikey: authToken,
            'x-api-key': authToken,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text,
            instance,
            message: text,
          }),
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          this.logger.log(`Mensagem WhatsApp enviada com sucesso para ${cleanPhone}`);
          return { success: true, data };
        }
      } catch (err: any) {
        this.logger.warn(`Tentativa em ${url}: ${err.message}`);
      }
    }

    return {
      success: false,
      message: 'Requisição enviada, mas o servidor UazAPI precisa estar ativo e conectado para concluir a entrega.',
    };
  }

  async sendMedia(to: string, mediaUrl: string, instanceName?: string, token?: string) {
    return this.sendMessage(to, `[Mídia]: ${mediaUrl}`, instanceName, token);
  }
}
