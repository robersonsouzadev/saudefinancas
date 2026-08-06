import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class IntakeClassifierService {
  private readonly logger = new Logger(IntakeClassifierService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async classifyText(text: string): Promise<any> {
    try {
      this.logger.log(`Classifying text: "${text.substring(0, 50)}..."`);
      
      const systemPrompt = `Você é um assistente de inteligência artificial para o projeto Saúde & Finanças.
Sua tarefa é classificar o texto fornecido e extrair os dados estruturados.
Retorne um objeto JSON com a seguinte estrutura:
{
  "primary_intent": "FINANCE" | "NUTRITION" | "HEALTH" | "MEDICATION" | "LAB_EXAM" | "HYBRID",
  "confidence": número de 0.0 a 1.0,
  "nutrition_data": { "meal_type": string, "items": [{"name": string, "weight_g": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}], "total_calories": number } | null,
  "finance_data": { "transactions": [{"amount": number, "description": string, "category": string}] } | null,
  "health_data": null,
  "medication_data": null,
  "vita_insight": string (Uma breve mensagem motivacional ou dica em português relacionada ao que foi identificado, seja amigável e encorajador)
}
Categorias financeiras permitidas: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'.

Exemplos:
- "Comprei pão 4 reais" -> FINANCE com transaction {amount: 4, description: 'Pão', category: 'Alimentação'}
- "Almocei arroz com feijão e bife" -> NUTRITION com items e calories
- "Dormi 7 horas" -> HEALTH com dados de sono
- "Tomei meu remédio da pressão" -> MEDICATION
- "Segue meu laudo de exame de sangue Fleury" -> LAB_EXAM
- "Gastei 30 reais no almoço, comi arroz feijão e bife" -> HYBRID (ambos FINANCE e NUTRITION preenchidos)
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Error classifying text', error);
      throw error;
    }
  }
}
