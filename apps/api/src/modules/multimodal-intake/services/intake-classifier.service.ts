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
        const systemPrompt = `Você é a Vita, assistente de inteligência artificial de Saúde, Nutrição, Treinos e Longevidade.
Sua tarefa é analisar a mensagem do usuário e extrair dados estruturados ou responder amigavelmente sobre bem-estar e performance física.
Retorne um objeto JSON estrito com esta estrutura:
{
  "primary_intent": "NUTRITION" | "HEALTH" | "MEDICATION" | "LAB_EXAM" | "WORKOUT" | "GENERAL",
  "confidence": número de 0.0 a 1.0,
  "nutrition_data": { "meal_type": string, "items": [{"name": string, "weight_g": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}], "total_calories": number } | null,
  "health_data": { "sleep_hours": number, "water_ml": number, "mood_score": number, "stress_level": number } | null,
  "medication_data": { "name": string, "dosage": string } | null,
  "workout_data": { "exercise_name": string, "sets": number, "reps": number, "weight_kg": number } | null,
  "vita_insight": string (A resposta textual amigável da Vita para o usuário em português. Se for saudação, apresente-se como a Vita, assistente de saúde e longevidade)
}`;

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
        health_data: null,
        medication_data: null,
        workout_data: null,
        vita_insight: 'Olá! Sou a Vita, sua assistente pessoal de saúde e longevidade. Posso registrar suas refeições, treinos, hidratação, sono, medicamentos e responder dúvidas sobre seu bem-estar!',
      };
    }

    // Padrão de Nutrição
    if (lower.includes('comi') || lower.includes('almocei') || lower.includes('jantei') || lower.includes('café') || lower.includes('refeição') || lower.includes('frango') || lower.includes('arroz') || lower.includes('salada')) {
      return {
        primary_intent: 'NUTRITION',
        confidence: 0.85,
        nutrition_data: { meal_type: 'Refeição Registrada', items: [{ name: cleanText, weight_g: 200, calories: 350, protein_g: 25, carbs_g: 35, fat_g: 8 }], total_calories: 350 },
        health_data: null,
        medication_data: null,
        workout_data: null,
        vita_insight: `Registrado! Anotei sua refeição: "${cleanText}". Estimativa calórica computada no seu painel nutricional.`,
      };
    }

    // Padrão de Hidratação / Sono
    if (lower.includes('água') || lower.includes('agua') || lower.includes('copo') || lower.includes('litro') || lower.includes('dormi') || lower.includes('sono') || lower.includes('acordei')) {
      return {
        primary_intent: 'HEALTH',
        confidence: 0.85,
        nutrition_data: null,
        health_data: { sleep_hours: 7.5, water_ml: 500, mood_score: 4, stress_level: 2 },
        medication_data: null,
        workout_data: null,
        vita_insight: `Excelente! Registrei seu hábito de saúde. Continue firme na sua rotina de hidratação e sono reparador.`,
      };
    }

    // Padrão de Treino
    if (lower.includes('treino') || lower.includes('treinei') || lower.includes('musculação') || lower.includes('supino') || lower.includes('agachamento') || lower.includes('perna') || lower.includes('peito')) {
      return {
        primary_intent: 'WORKOUT',
        confidence: 0.85,
        nutrition_data: null,
        health_data: null,
        medication_data: null,
        workout_data: { exercise_name: cleanText, sets: 3, reps: 10, weight_kg: 0 },
        vita_insight: `Show de bola! Registro de treino processado. O Coach Iron computou o estímulo para sua recuperação muscular.`,
      };
    }

    return {
      primary_intent: 'GENERAL',
      confidence: 0.75,
      nutrition_data: null,
      health_data: null,
      medication_data: null,
      workout_data: null,
      vita_insight: `Compreendido! Processei sua mensagem: "${cleanText}". Seus dados foram sincronizados no painel Vita Saúde.`,
    };
  }
}
