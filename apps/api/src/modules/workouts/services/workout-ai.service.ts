import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { WorkoutsService } from './workouts.service';
import OpenAI from 'openai';

export interface GeneratePlanDto {
  goal: 'HYPERTROPHY' | 'STRENGTH' | 'CUT' | 'ATHLETIC';
  weeklyFrequency: number; // 3 to 6
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  focusMuscles?: string[];
  injuries?: string;
  additionalNotes?: string;
}

@Injectable()
export class WorkoutAIService {
  private readonly logger = new Logger(WorkoutAIService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private workoutsService: WorkoutsService,
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
      this.logger.warn('Could not initialize OpenAI client in WorkoutAIService', e);
    }
    return null;
  }

  private async getUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        heightCm: true,
        biologicalSex: true,
        birthDate: true,
      },
    });

    const latestMeasurement = await this.prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const recentSessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        exercises: {
          include: { exercise: true },
        },
      },
    });

    const exercises = await this.prisma.exercise.findMany({
      where: {
        OR: [{ isCustom: false }, { userId }],
      },
      select: {
        id: true,
        namePt: true,
        nameEn: true,
        muscleGroup: true,
        equipment: true,
      },
    });

    return {
      name: user?.name || 'Atleta',
      heightCm: user?.heightCm || 175,
      weightKg: latestMeasurement?.weightKg || 70,
      bodyFatPercent: latestMeasurement?.bodyFatPercent || null,
      sex: user?.biologicalSex || 'MASCULINO',
      recentSessionsCount: recentSessions.length,
      availableExercises: exercises,
    };
  }

  async generatePlan(userId: string, dto: GeneratePlanDto) {
    const context = await this.getUserContext(userId);
    const openai = await this.getOpenAIClient();

    const goalLabels: Record<string, string> = {
      HYPERTROPHY: 'Hipertrofia Muscular (Ganho de Massa)',
      STRENGTH: 'Força Máxima e Cargas Pesadas',
      CUT: 'Definição Muscular e Queima de Gordura',
      ATHLETIC: 'Condicionamento Físico e Desempenho Atlético',
    };

    const exerciseListStr = context.availableExercises
      .map((ex) => `- ${ex.namePt} [Grupo: ${ex.muscleGroup}, Equipamento: ${ex.equipment}]`)
      .join('\n');

    const systemPrompt = `Você é o Coach Iron, um Personal Trainer e Preparador Físico de elite especialista em musculação, hipertrofia e fisiologia do exercício.
Sua missão é montar uma rotina semanal de treinos extremamente otimizada, segura e alinhada aos objetivos do usuário.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS um objeto JSON estrito com a estrutura abaixo (sem Markdown ou texto adicional):
{
  "planName": string (Ex: "Plano Hipertrofia Peitoral - 4 Semanas"),
  "description": string (Breve explicação da estratégia do treino),
  "goal": string,
  "weeklyFrequency": number,
  "workouts": [
    {
      "name": string (Ex: "Treino A - Peitoral e Tríceps"),
      "color": string (hex color ex: "#6366f1", "#38bdf8", "#4ade80", "#f97316"),
      "dayOfWeek": number (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 0=Dom),
      "exercises": [
        {
          "exerciseNamePt": string (O NOME EXATO em português de um dos exercícios da lista fornecida),
          "targetSets": number (Geralmente 3 a 5),
          "targetReps": number (Geralmente 6 a 15),
          "targetWeight": number (Estimativa inicial de carga em kg baseada no peso do usuário ou 0 se livre),
          "restSeconds": number (30, 60, 90 ou 120),
          "notes": string (Dica de execução técnica ou cadence ex: "Fase concêntrica explosiva, 3s excêntrica")
        }
      ]
    }
  ]
}

2. Escolha APENAS exercícios existentes na lista de exercícios fornecida abaixo.
3. Respeite os focos musculares e restrições de lesões do usuário.`;

    const userPrompt = `
DADOS DO USUÁRIO:
- Nome: ${context.name}
- Peso: ${context.weightKg} kg | Altura: ${context.heightCm} cm
- Sexo: ${context.sex}
- Objetivo: ${goalLabels[dto.goal] || dto.goal}
- Nível de Experiência: ${dto.experienceLevel}
- Frequência Semanal Desejada: ${dto.weeklyFrequency} dias por semana
- Músculos com Foco Especial: ${dto.focusMuscles?.join(', ') || 'Equilibrado'}
- Lesões ou Restrições: ${dto.injuries || 'Nenhuma'}
- Observações Adicionais: ${dto.additionalNotes || 'Nenhuma'}

EXERCÍCIOS DISPONÍVEIS NO BANCO DE DADOS:
${exerciseListStr}
`;

    if (!openai) {
      // Fallback sem OpenAI key: gera plano estático inteligente
      return this.generateFallbackPlan(dto, context);
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (err) {
      this.logger.error('Erro ao gerar plano via IA OpenAI:', err);
    }

    return this.generateFallbackPlan(dto, context);
  }

  async saveGeneratedPlan(userId: string, planData: any) {
    const createdTemplates = [];

    for (const [index, workout] of planData.workouts.entries()) {
      const items = [];

      for (const [exIdx, ex] of workout.exercises.entries()) {
        const dbEx = await this.prisma.exercise.findFirst({
          where: {
            OR: [
              { namePt: { contains: ex.exerciseNamePt, mode: 'insensitive' } },
              { name: { contains: ex.exerciseNamePt, mode: 'insensitive' } },
            ],
          },
        });

        if (dbEx) {
          items.push({
            exerciseId: dbEx.id,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps || 12,
            targetWeight: ex.targetWeight || 0,
            restSeconds: ex.restSeconds || 60,
            notes: ex.notes || null,
          });
        }
      }

      if (items.length > 0) {
        const tpl = await this.workoutsService.createTemplate(userId, {
          name: workout.name,
          color: workout.color || '#6366f1',
          dayOfWeek: workout.dayOfWeek !== undefined ? workout.dayOfWeek : index + 1,
          items,
        });
        createdTemplates.push(tpl);
      }
    }

    return createdTemplates;
  }

  async chatWithCoach(userId: string, userMessage: string) {
    const context = await this.getUserContext(userId);
    const openai = await this.getOpenAIClient();

    if (!openai) {
      return {
        reply: `Olá! Sou o Coach Iron 💪. Para criar planos personalizados e responder com IA avançada, certifique-se de configurar sua chave da OpenAI nas configurações.`,
      };
    }

    const systemPrompt = `Seu nome é Coach Iron, um Personal Trainer e Preparador Físico Virtual de elite.
Você fala em português de forma motivacional, técnica e direta.
Você tem acesso ao perfil do aluno:
- Peso: ${context.weightKg} kg | Altura: ${context.heightCm} cm
- Histórico: ${context.recentSessionsCount} treinos recentes concluídos.

Responda à dúvida do aluno de forma clara, usando tópicos e dicas práticas de musculação, cargas e séries.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      });

      return {
        reply: response.choices[0]?.message?.content || 'Continue firme nos treinos! Foco na constância.',
      };
    } catch (e) {
      return {
        reply: 'Coach Iron está ajustando os equipamentos! Tente novamente em instantes.',
      };
    }
  }

  private generateFallbackPlan(dto: GeneratePlanDto, context: any) {
    const exList = context.availableExercises;
    const findEx = (namePt: string) => exList.find((e: any) => e.namePt.includes(namePt))?.namePt || namePt;

    return {
      planName: `Plano IA de ${dto.goal === 'HYPERTROPHY' ? 'Hipertrofia' : 'Força'} (${dto.weeklyFrequency}x/semana)`,
      description: 'Plano estruturado com divisão por grupos musculares e Volume Landmarks adaptados.',
      goal: dto.goal,
      weeklyFrequency: dto.weeklyFrequency,
      workouts: [
        {
          name: 'Treino A - Peitoral e Tríceps',
          color: '#6366f1',
          dayOfWeek: 1,
          exercises: [
            { exerciseNamePt: findEx('Supino Reto com Barra'), targetSets: 4, targetReps: 10, targetWeight: 40, restSeconds: 90, notes: 'Carga progressiva' },
            { exerciseNamePt: findEx('Supino Inclinado com Halteres'), targetSets: 3, targetReps: 12, targetWeight: 18, restSeconds: 60, notes: 'Foco na porção superior' },
            { exerciseNamePt: findEx('Crossover na Polia Alta'), targetSets: 3, targetReps: 15, targetWeight: 15, restSeconds: 60, notes: 'Pico de contração de 1s' },
            { exerciseNamePt: findEx('Tríceps Pulley na Corda'), targetSets: 4, targetReps: 12, targetWeight: 20, restSeconds: 60, notes: 'Abra a corda no final' },
          ],
        },
        {
          name: 'Treino B - Costas e Bíceps',
          color: '#38bdf8',
          dayOfWeek: 2,
          exercises: [
            { exerciseNamePt: findEx('Puxada Frontal Aberta'), targetSets: 4, targetReps: 10, targetWeight: 45, restSeconds: 90, notes: 'Puxe até o peito' },
            { exerciseNamePt: findEx('Remada Curvada com Barra'), targetSets: 4, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Coluna ereta' },
            { exerciseNamePt: findEx('Rosca Direta com Barra W'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Sem roubar no quadril' },
            { exerciseNamePt: findEx('Rosca Martelo'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Foco em antebraço e braquial' },
          ],
        },
        {
          name: 'Treino C - Pernas e Ombros',
          color: '#f97316',
          dayOfWeek: 4,
          exercises: [
            { exerciseNamePt: findEx('Agachamento Livre com Barra'), targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 120, notes: 'Amplitude completa' },
            { exerciseNamePt: findEx('Leg Press 45°'), targetSets: 4, targetReps: 12, targetWeight: 100, restSeconds: 90, notes: 'Pés na largura dos ombros' },
            { exerciseNamePt: findEx('Desenvolvimento Militar com Barra'), targetSets: 4, targetReps: 10, targetWeight: 25, restSeconds: 90, notes: 'Mantenha o core firme' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 4, targetReps: 15, targetWeight: 8, restSeconds: 60, notes: 'Eleve até a linha dos ombros' },
          ],
        },
      ],
    };
  }
}
