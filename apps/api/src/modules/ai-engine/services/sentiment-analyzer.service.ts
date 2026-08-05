import { Injectable } from '@nestjs/common';

@Injectable()
export class SentimentAnalyzerService {
  analyze(text: string) {
    // Mock sentiment analysis
    return { score: 0.8, label: 'positive' };
  }
}
