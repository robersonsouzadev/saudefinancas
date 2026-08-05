import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'sk-proj-...') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
          dimensions: 1536,
        });
        return response.data[0].embedding;
      } catch (err: any) {
        this.logger.warn(`OpenAI embedding failed, using vector fallback: ${err.message}`);
      }
    }

    // Deterministic 1536-dimensional vector fallback based on text hash
    return this.generateDeterministicVector(text, 1536);
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.createEmbedding(t)));
  }

  private generateDeterministicVector(text: string, dimensions: number): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const vec: number[] = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      const val = Math.sin(hash + i) * 10000;
      vec[i] = val - Math.floor(val);
    }
    return vec;
  }
}
