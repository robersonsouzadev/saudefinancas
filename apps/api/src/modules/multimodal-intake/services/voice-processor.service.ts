import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class VoiceProcessorService {
  private readonly logger = new Logger(VoiceProcessorService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY') || 'mock-key',
    });
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      this.logger.log(`Transcribing audio of type ${mimeType}, size ${audioBuffer.length} bytes`);
      
      const file = new File([audioBuffer as any], 'audio.webm', { type: mimeType });
      
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'pt',
      });

      return response.text;
    } catch (error) {
      this.logger.error('Error transcribing audio', error);
      return 'Transcrição de áudio via assistente';
    }
  }
}
