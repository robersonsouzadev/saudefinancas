import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class VisionProcessorService {
  private readonly logger = new Logger(VisionProcessorService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async analyzeImage(imageBase64: string, mimeType: string, context?: string): Promise<any> {
    try {
      this.logger.log('Analyzing image with GPT-4o-mini Vision');
      
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      const systemPrompt = `Você é um assistente de inteligência artificial para o projeto Saúde & Finanças.
Sua tarefa é analisar a imagem fornecida e extrair os dados. 
Retorne um objeto JSON com a seguinte estrutura:
{
  "primary_intent": "FINANCE" | "NUTRITION" | "HEALTH" | "MEDICATION" | "HYBRID",
  "confidence": número de 0.0 a 1.0,
  "nutrition_data": { "meal_type": string, "items": [{"name": string, "weight_g": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}], "total_calories": number } | null,
  "finance_data": { "transactions": [{"amount": number, "description": string, "category": string}] } | null,
  "health_data": null,
  "medication_data": null,
  "vita_insight": string (Uma breve mensagem motivacional ou dica em português relacionada ao que foi identificado)
}
Categorias financeiras permitidas: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'.
Contexto adicional: ${context || 'Nenhum'}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise esta imagem e retorne o JSON solicitado.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Error analyzing image', error);
      throw error;
    }
  }
}
