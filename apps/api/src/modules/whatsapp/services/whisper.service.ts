import { Injectable } from '@nestjs/common';

@Injectable()
export class WhisperService {
  async transcribeAudio(audioBuffer: Buffer) {
    // Mock Whisper API call
    return { text: 'mock transcription' };
  }
}
