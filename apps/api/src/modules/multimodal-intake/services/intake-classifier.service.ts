import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import OpenAI from 'openai';

@Injectable()
export class IntakeClassifierService {
  private readonly logger = new Logger(IntakeClassifierService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private async getOpenAIClient(): Promise<OpenAI | null> {
    try {
      let apiKey = this.configService.get('OPENAI_API_KEY');

      if (!apiKey || apiKey.length < 10) {
        const dbProv = await this.prisma.llmProvider.findFirst({ where: { provider: 'openai' } });
        if (dbProv?.apiKey) {
          try {
            apiKey = this.encryption.decrypt(dbProv.apiKey);
          } catch {}
        }
      }

      if (apiKey && apiKey.length > 10) {
        return new OpenAI({ apiKey });
      }
    } catch (e) {
      this.logger.warn('Could not initialize OpenAI client from DB/env', e);
    }
    return null;
  }

  async classifyText(text: string): Promise<any> {
    this.logger.log(`Classifying text: "${text.substring(0, 50)}..."`);
    const cleanText = text.trim();

    const openai = await this.getOpenAIClient();

    if (openai) {
      try {
        const systemPrompt = `Você é a Vita, uma assistente pessoal de inteligência artificial especializada em Saúde, Nutrição e Finanças Pessoais.
Sua tarefa é analisar a mensagem do usuário e extrair dados estruturados ou responder amigavelmente.
Retorne um objeto JSON estrito com esta estrutura:
{
  "primary_intent": "FINANCE" | "NUTRITION" | "HEALTH" | "MEDICATION" | "LAB_EXAM" | "HYBRID" | "GENERAL",
  "confidence": número de 0.0 a 1.0,
  "nutrition_data": { "meal_type": string, "items": [{"name": string, "weight_g": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}], "total_calories": number } | null,
  "finance_data": { "transactions": [{"amount": number, "description": string, "category": string}] } | null,
  "health_data": null,
  "medication_data": null,
  "vita_insight": string (A resposta textual amigável da Vita para o usuário em português. Se for saudação como "olá" ou "quem fala?", apresente-se calorosamente como a Vita, assistente de saúde e finanças)
}
Categorias financeiras permitidas: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanText },
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      } catch (error) {
        this.logger.error('Error calling OpenAI for classification, falling back to rule engine', error);
      }
    }

    // Heuristic Rule Engine Fallback
    const lower = cleanText.toLowerCase();

    // Saudação ou Pergunta de Apresentação
    if (lower.includes('ola') || lower.includes('olá') || lower.includes('oi') || lower.includes('quem fala') || lower.includes('quem e voce') || lower.includes('ajuda')) {
      return {
        primary_intent: 'GENERAL',
        confidence: 0.95,
        nutrition_data: null,
        finance_data: null,
        health_data: null,
        medication_data: null,
        vita_insight: 'Olá! Sou a Vita, sua assistente pessoal de saúde e finanças integradas. Posso registrar seus gastos, refeições, biometria e responder dúvidas sobre seu bem-estar!',
      };
    }

    // Padrão de Gasto
    const moneyMatch = lower.match(/(gastei|paguei|comprei|valor|custou|reais|r\$)\s*(\d+(?:[.,]\d+)?)/i) || lower.match(/(\d+(?:[.,]\d+)?)\s*(reais|r\$)/i);
    let finance_data = null;

    if (moneyMatch) {
      const amount = parseFloat(moneyMatch[2] || moneyMatch[1]);
      let category = 'Outros';
      if (lower.includes('almoço') || lower.includes('jantar') || lower.includes('comida') || lower.includes('pão') || lower.includes('restaurante')) {
        category = 'Alimentação';
      } else if (lower.includes('remédio') || lower.includes('farmácia') || lower.includes('médico')) {
        category = 'Saúde';
      } else if (lower.includes('uber') || lower.includes('gasolina') || lower.includes('ônibus')) {
        category = 'Transporte';
      }

      finance_data = {
        transactions: [
          {
            amount,
            description: cleanText,
            category,
          },
        ],
      };
    }

    return {
      primary_intent: finance_data ? 'FINANCE' : 'GENERAL',
      confidence: 0.85,
      nutrition_data: null,
      finance_data,
      health_data: null,
      medication_data: null,
      vita_insight: finance_data 
        ? `Registrado com sucesso! Despesa de R$ ${finance_data.transactions[0].amount.toFixed(2)} na categoria ${finance_data.transactions[0].category}.` 
        : `Compreendido! Processei a mensagem: "${cleanText}". Seus dados foram sincronizados no painel Vita.`,
    };
  }
}
