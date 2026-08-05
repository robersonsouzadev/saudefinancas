import { Injectable } from '@nestjs/common';

export interface CategorizationResult {
  category: string;
  confidence: number;
}

@Injectable()
export class CategorizerService {
  private readonly keywordRules: Record<string, string[]> = {
    'Food & Dining': ['restaurant', 'pizza', 'burger', 'uber eats', 'ifood', 'grocery', 'supermarket'],
    'Transportation': ['uber', 'gas', 'shell', 'petrobras', 'bus', 'train', 'flight'],
    'Utilities': ['electric', 'water', 'internet', 'comcast', 'vivo', 'claro'],
    'Entertainment': ['netflix', 'spotify', 'cinema', 'movie', 'steam'],
    'Health': ['pharmacy', 'doctor', 'hospital', 'cvs', 'walgreens', 'drogasil']
  };

  async categorizeDescription(description: string): Promise<CategorizationResult> {
    const lowerDesc = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.keywordRules)) {
      if (keywords.some(kw => lowerDesc.includes(kw))) {
        return { category, confidence: 0.85 }; // Simple rule-based match
      }
    }
    
    // Default fallback or simulated AI call
    return { category: 'Other', confidence: 0.4 };
  }
}
