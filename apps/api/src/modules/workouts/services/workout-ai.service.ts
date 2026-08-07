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
  sessionDurationMinutes?: number; // 45, 60, 90
  cardioDaysPerWeek?: number; // 0 to 5
  cardioDurationMinutes?: number; // 15 to 60
  cardioType?: 'LISS' | 'HIIT' | 'MIXED';
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

  private selectDiverseExercises(exercises: any[], maxTotal = 80): any[] {
    const grouped: Record<string, any[]> = {};
    for (const ex of exercises) {
      const g = ex.muscleGroup ? ex.muscleGroup.split('_')[0] : 'OUTROS';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(ex);
    }

    const selected: any[] = [];
    const keys = Object.keys(grouped);
    const perGroup = Math.max(4, Math.floor(maxTotal / Math.max(keys.length, 1)));

    for (const k of keys) {
      selected.push(...grouped[k].slice(0, perGroup));
    }

    return selected.slice(0, maxTotal);
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

    // Pick a diverse sample across all muscle groups (60-80 exercises)
    const sampleExercises = this.selectDiverseExercises(context.availableExercises, 75);

    const exerciseListStr = sampleExercises
      .map((ex) => `- ${ex.namePt} [Grupo: ${ex.muscleGroup}, Equipamento: ${ex.equipment}]`)
      .join('\n');

    const systemPrompt = `Você é o Coach Iron, um Personal Trainer e Preparador Físico de elite especialista em musculação, hipertrofia e fisiologia do exercício (com base nos princípios de Volume Landmarks MEV/MAV/MRV do Dr. Mike Israetel).
Sua missão é montar uma rotina semanal de treinos extremamente completa, científica e alinhada aos objetivos do usuário.

REGRAS OBRIGATÓRIAS DE PRESCRIÇÃO:
1. QUANTIDADE DE EXERCÍCIOS POR SESSÃO (RIGOROSAMENTE OBRIGATÓRIO):
   - Nível INICIANTE: 4 a 5 exercícios por treino (12 a 15 séries totais).
   - Nível INTERMEDIÁRIO: 5 a 6 exercícios por treino (18 a 22 séries totais).
   - Nível AVANÇADO: 6 a 8 exercícios por treino (22 a 30 séries totais).
   NUNCA monte um treino com apenas 2 ou 3 exercícios!

2. ESTRUTURA CIENTÍFICA DA SESSÃO:
   - Exercícios 1 e 2: Compostos Multiarticulares Pesados (Ex: Supino, Agachamento, Levantamento Terra, Remada, Puxada). 4 séries, 6-10 reps, 90-120s descanso.
   - Exercícios 3, 4 e 5: Monoarticulares / Isolamentos Principais (Ex: Elevação Lateral, Tríceps Pulley, Rosca Direta, Leg Extension). 3-4 séries, 10-12 reps, 60-90s descanso.
   - Exercícios 6, 7 e 8 (se Intermediário/Avançado): Trabalho acessório / Bombeamento final (Ex: Crucifixo, Crossover, Panturrilhas, Abdominal). 3-4 séries, 12-15 reps, 45-60s descanso.

3. DIVISÃO DE TREINO (SPLIT) POR FREQUÊNCIA:
   - 3 dias: Full Body A / B / C ou Push / Pull / Legs
   - 4 dias: Upper / Lower 2x (Upper A, Lower A, Upper B, Lower B)
   - 5 dias: Push / Pull / Legs / Upper / Lower (PHAT style)
   - 6 dias: Push / Pull / Legs 2x ou Arnold Split (Peito+Costas, Ombros+Braços, Pernas)

4. RETORNE APENAS UM OBJETO JSON ESTRITO com o formato:
{
  "planName": string,
  "description": string,
  "goal": string,
  "weeklyFrequency": number,
  "workouts": [
    {
      "name": string,
      "color": string (hex color ex: "#6366f1", "#38bdf8", "#4ade80", "#f97316", "#a855f7"),
      "dayOfWeek": number (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 0=Dom),
      "exercises": [
        {
          "exerciseNamePt": string (O NOME EXATO em português de um dos exercícios da lista fornecida abaixo),
          "targetSets": number,
          "targetReps": number,
          "targetWeight": number,
          "restSeconds": number,
          "notes": string
        }
      ]
    }
  ]
}

5. Escolha APENAS exercícios existentes na lista fornecida abaixo. Respeite lesões e focos musculares.`;

    const cardioInfo = dto.cardioDaysPerWeek && dto.cardioDaysPerWeek > 0
      ? `- Cardio: ${dto.cardioDaysPerWeek}x por semana, ${dto.cardioDurationMinutes || 20} minutos (${dto.cardioType || 'LISS'})`
      : '- Cardio: Não solicitado';

    const userPrompt = `
DADOS DO USUÁRIO:
- Nome: ${context.name}
- Peso: ${context.weightKg} kg | Altura: ${context.heightCm} cm
- Sexo: ${context.sex}
- Objetivo: ${goalLabels[dto.goal] || dto.goal}
- Nível de Experiência: ${dto.experienceLevel}
- Frequência Semanal Desejada: ${dto.weeklyFrequency} dias por semana
- Duração da Sessão Desejada: ${dto.sessionDurationMinutes || 60} minutos
${cardioInfo}
- Músculos com Foco Especial: ${dto.focusMuscles?.join(', ') || 'Equilibrado'}
- Lesões ou Restrições: ${dto.injuries || 'Nenhuma'}
- Observações Adicionais: ${dto.additionalNotes || 'Nenhuma'}

EXERCÍCIOS DISPONÍVEIS NO BANCO DE DADOS:
${exerciseListStr}
`;

    if (!openai) {
      return this.generateFallbackPlan(dto, context);
    }

    try {
      const apiCall = openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const timeoutCall = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI timeout exceeded 10s')), 10000)
      );

      const response: any = await Promise.race([apiCall, timeoutCall]);

      const content = response?.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (err) {
      this.logger.warn('Erro ou timeout ao gerar plano via IA OpenAI, usando plano instantâneo fallback:', err);
    }

    return this.generateFallbackPlan(dto, context);
  }

  async saveGeneratedPlan(userId: string, planData: any) {
    const createdTemplates = [];

    const allDbExercises = await this.prisma.exercise.findMany({
      where: { OR: [{ isCustom: false }, { userId }] },
    });

    const findBestMatch = (targetNamePt: string) => {
      if (!targetNamePt) return allDbExercises[0] || null;
      const cleanTarget = targetNamePt.toLowerCase().trim();

      // 1. Exact or substring match both ways
      let match = allDbExercises.find(
        (ex) =>
          ex.namePt.toLowerCase() === cleanTarget ||
          ex.name.toLowerCase() === cleanTarget ||
          cleanTarget.includes(ex.namePt.toLowerCase()) ||
          ex.namePt.toLowerCase().includes(cleanTarget)
      );
      if (match) return match;

      // 2. Word overlap match
      const targetWords = cleanTarget
        .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['com', 'para', 'lado', 'solo', 'barra', 'halter', 'halteres'].includes(w));

      if (targetWords.length > 0) {
        let bestScore = 0;
        let bestEx: any = null;

        for (const ex of allDbExercises) {
          const exNameClean = ex.namePt.toLowerCase();
          let score = 0;
          for (const word of targetWords) {
            if (exNameClean.includes(word)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestEx = ex;
          }
        }
        if (bestEx && bestScore >= 1) return bestEx;
      }

      // 3. Fallback so no exercise is dropped
      return allDbExercises[0] || null;
    };

    for (const [index, workout] of (planData.workouts || []).entries()) {
      const items = [];

      for (const ex of workout.exercises || []) {
        const dbEx = findBestMatch(ex.exerciseNamePt);

        if (dbEx) {
          items.push({
            exerciseId: dbEx.id,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps || 10,
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

  async chatWithCoach(
    userId: string,
    payload: { message: string; history?: Array<{ sender: string; text: string }> } | string,
  ) {
    const userMessage = typeof payload === 'string' ? payload : payload.message;
    const history = typeof payload === 'object' && Array.isArray(payload.history) ? payload.history : [];

    const context = await this.getUserContext(userId);
    const openai = await this.getOpenAIClient();
    const userTemplates = await this.workoutsService.listTemplates(userId);
    const allDbExercises = context.availableExercises || [];

    const findBestMatch = (targetNamePt: string) => {
      if (!targetNamePt) return allDbExercises[0] || null;
      const cleanTarget = targetNamePt.toLowerCase().trim();

      let match = allDbExercises.find(
        (ex: any) =>
          ex.namePt.toLowerCase() === cleanTarget ||
          ex.name.toLowerCase() === cleanTarget ||
          cleanTarget.includes(ex.namePt.toLowerCase()) ||
          ex.namePt.toLowerCase().includes(cleanTarget),
      );
      if (match) return match;

      const targetWords = cleanTarget
        .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\s]/gi, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !['com', 'para', 'lado', 'solo', 'barra', 'halter', 'halteres'].includes(w));

      if (targetWords.length > 0) {
        let bestScore = 0;
        let bestEx: any = null;

        for (const ex of allDbExercises) {
          const exNameClean = ex.namePt.toLowerCase();
          let score = 0;
          for (const word of targetWords) {
            if (exNameClean.includes(word)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestEx = ex;
          }
        }
        if (bestEx && bestScore >= 1) return bestEx;
      }

      return allDbExercises[0] || null;
    };

    if (!openai) {
      return {
        reply: `Olá! Sou o Coach Iron 💪. Para criar planos personalizados e adaptar treinos em tempo real, certifique-se de configurar sua chave da OpenAI nas configurações.`,
      };
    }

    const templatesSummary = userTemplates.length > 0
      ? userTemplates.map((t: any) => `- ID: ${t.id} | Nome: "${t.name}" | Exercícios: [${t.items.map((i: any) => i.exercise?.namePt || i.exercise?.name).join(', ')}]`).join('\n')
      : 'Nenhum treino criado ainda.';

    const systemPrompt = `Seu nome é Coach Iron, um Personal Trainer e Preparador Físico de elite.
Você fala em português de forma motivacional, técnica e direta.

DADOS DO ALUNO:
- Nome: ${context.name}
- Peso: ${context.weightKg} kg | Altura: ${context.heightCm} cm
- Histórico: ${context.recentSessionsCount} treinos recentes concluídos.

ROTINAS/TEMPLATES DE TREINO ATUAIS DO ALUNO:
${templatesSummary}

CAPACIDADE DE AÇÃO EM TEMPO REAL:
Você possui FERRAMENTAS (Tools) ativas para modificar os treinos do aluno diretamente durante a conversa!
- Se o aluno pedir para focar mais em um músculo (ex: "focar em bíceps e tríceps", "dar um grau nos ombros"), use 'adapt_workout_focus' ou 'create_custom_template' para adicionar novos exercícios isolados e salvar no perfil dele.
- Se o aluno relatar dor ou lesão (ex: "dor no ombro", "trocar supino"), use 'swap_exercise' para substituir o exercício por um equivalente seguro.
- Se o aluno pedir um treino totalmente novo ou específico, use 'create_custom_template'.

Sempre explique detalhadamente a alteração feita e encoraje o aluno com entusiasmo!`;

    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const h of history.slice(-6)) {
      formattedMessages.push({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text,
      });
    }

    formattedMessages.push({ role: 'user', content: userMessage });

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'adapt_workout_focus',
          description: 'Modifica uma rotina existente do aluno para focar em grupos musculares específicos (ex: Bíceps, Tríceps, Ombros) adicionando novos exercícios isolados.',
          parameters: {
            type: 'object',
            properties: {
              templateName: { type: 'string', description: 'Nome da rotina a modificar (ex: "Treino B - Costas e Bíceps")' },
              focusMuscles: { type: 'array', items: { type: 'string' }, description: 'Músculos prioritários' },
              exercisesToAdd: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    namePt: { type: 'string', description: 'Nome do exercício em português' },
                    sets: { type: 'number', description: 'Número de séries' },
                    reps: { type: 'number', description: 'Repetições alvo' },
                  },
                  required: ['namePt', 'sets', 'reps'],
                },
                description: 'Novos exercícios focados a incluir',
              },
              reasoning: { type: 'string', description: 'Explicação da adaptação' },
            },
            required: ['exercisesToAdd'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'swap_exercise',
          description: 'Substitui um exercício por outro em uma rotina do aluno devido a dor, lesão ou preferência.',
          parameters: {
            type: 'object',
            properties: {
              templateName: { type: 'string', description: 'Nome da rotina' },
              oldExerciseName: { type: 'string', description: 'Exercício a remover' },
              newExerciseName: { type: 'string', description: 'Novo exercício substituto' },
              reasoning: { type: 'string', description: 'Motivo técnico da troca' },
            },
            required: ['oldExerciseName', 'newExerciseName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_custom_template',
          description: 'Cria uma nova rotina/template de treino customizada no perfil do aluno.',
          parameters: {
            type: 'object',
            properties: {
              templateName: { type: 'string', description: 'Nome da nova rotina' },
              description: { type: 'string', description: 'Descrição da estratégia do treino' },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    namePt: { type: 'string' },
                    targetSets: { type: 'number' },
                    targetReps: { type: 'number' },
                    notes: { type: 'string' },
                  },
                  required: ['namePt', 'targetSets', 'targetReps'],
                },
              },
            },
            required: ['templateName', 'exercises'],
          },
        },
      },
    ];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
      });

      const message = response.choices[0]?.message;
      let actionExecuted: any = null;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || '{}');

        this.logger.log(`Coach Iron executou toolCall: ${fnName} com args: ${JSON.stringify(args)}`);

        if (fnName === 'adapt_workout_focus' || fnName === 'create_custom_template') {
          const tplName = args.templateName || 'Treino Personalizado Foco';
          const exInputList = args.exercisesToAdd || args.exercises || [];

          let targetTemplate = userTemplates.find(
            (t: any) =>
              t.name.toLowerCase().includes((args.templateName || '').toLowerCase()) ||
              (args.templateName || '').toLowerCase().includes(t.name.toLowerCase()),
          );

          const existingItems = targetTemplate ? targetTemplate.items.map((i: any) => ({
            exerciseId: i.exerciseId,
            targetSets: i.targetSets,
            targetReps: i.targetReps,
            targetWeight: i.targetWeight,
            restSeconds: i.restSeconds,
            notes: i.notes,
          })) : [];

          const newItems = [];
          const addedNames: string[] = [];

          for (const exInput of exInputList) {
            const dbEx = findBestMatch(exInput.namePt);
            if (dbEx) {
              newItems.push({
                exerciseId: dbEx.id,
                targetSets: exInput.sets || exInput.targetSets || 3,
                targetReps: exInput.reps || exInput.targetReps || 12,
                targetWeight: 0,
                restSeconds: 60,
                notes: exInput.notes || 'Adaptação do Coach Iron',
              });
              addedNames.push(dbEx.namePt);
            }
          }

          if (targetTemplate && targetTemplate.id) {
            const combinedItems = [...existingItems, ...newItems];
            await this.workoutsService.updateTemplate(targetTemplate.id, userId, {
              name: targetTemplate.name,
              items: combinedItems,
            });

            actionExecuted = {
              type: 'WORKOUT_UPDATED',
              templateName: targetTemplate.name,
              addedExercises: addedNames,
              reasoning: args.reasoning || 'Foco intensificado conforme solicitado.',
            };
          } else {
            const created = await this.workoutsService.createTemplate(userId, {
              name: tplName,
              color: '#6366f1',
              dayOfWeek: 1,
              items: newItems,
            });

            actionExecuted = {
              type: 'TEMPLATE_CREATED',
              templateName: created.name,
              addedExercises: addedNames,
              reasoning: args.reasoning || 'Nova rotina criada pelo Coach Iron.',
            };
          }
        } else if (fnName === 'swap_exercise') {
          const oldName = args.oldExerciseName;
          const newName = args.newExerciseName;
          const newDbEx = findBestMatch(newName);

          let updatedTplName = '';

          for (const tpl of userTemplates) {
            const hasOldEx = tpl.items.some((i: any) =>
              (i.exercise?.namePt || i.exercise?.name || '').toLowerCase().includes(oldName.toLowerCase()),
            );

            if (hasOldEx && newDbEx) {
              const updatedItems = tpl.items.map((i: any) => {
                const isMatch = (i.exercise?.namePt || i.exercise?.name || '').toLowerCase().includes(oldName.toLowerCase());
                if (isMatch) {
                  return {
                    exerciseId: newDbEx.id,
                    targetSets: i.targetSets,
                    targetReps: i.targetReps,
                    targetWeight: i.targetWeight,
                    restSeconds: i.restSeconds,
                    notes: `Substituído por: ${args.reasoning || 'Segurança articular'}`,
                  };
                }
                return {
                  exerciseId: i.exerciseId,
                  targetSets: i.targetSets,
                  targetReps: i.targetReps,
                  targetWeight: i.targetWeight,
                  restSeconds: i.restSeconds,
                  notes: i.notes,
                };
              });

              await this.workoutsService.updateTemplate(tpl.id, userId, {
                name: tpl.name,
                items: updatedItems,
              });

              updatedTplName = tpl.name;
              break;
            }
          }

          actionExecuted = {
            type: 'EXERCISE_SWAPPED',
            templateName: updatedTplName || 'Treino Atualizado',
            oldExercise: oldName,
            newExercise: newDbEx?.namePt || newName,
            reasoning: args.reasoning || 'Substituição realizada para otimizar seus resultados com segurança.',
          };
        }
      }

      const defaultReply = actionExecuted
        ? `Pronto! Realizei as adaptações diretamente na sua ficha de treino. ${actionExecuted.reasoning || ''}`
        : message?.content || 'Continue firme nos treinos! Foco na constância.';

      return {
        reply: message?.content || defaultReply,
        actionExecuted,
      };
    } catch (e) {
      this.logger.error('Erro no chat do Coach Iron:', e);
      return {
        reply: 'Coach Iron está ajustando a carga! Tente enviar a mensagem novamente em instantes.',
      };
    }
  }

  // ----------------------------------------------------
  // FASE 2: MOTOR DE SOBRECARGA PROGRESSIVA E FADIGA
  // ----------------------------------------------------

  async calculateRecoveryStatus(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { gte: sevenDaysAgo },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
      },
      orderBy: { finishedAt: 'desc' },
    });

    const muscleStats: Record<string, { lastTrained: Date | null; totalSets: number }> = {
      PEITORAL: { lastTrained: null, totalSets: 0 },
      DORSAL: { lastTrained: null, totalSets: 0 },
      OMBRO: { lastTrained: null, totalSets: 0 },
      BICEPS: { lastTrained: null, totalSets: 0 },
      TRICEPS: { lastTrained: null, totalSets: 0 },
      QUADRICEPS: { lastTrained: null, totalSets: 0 },
      POSTERIOR_COXA: { lastTrained: null, totalSets: 0 },
      GLUTEOS: { lastTrained: null, totalSets: 0 },
      PANTURRILHA: { lastTrained: null, totalSets: 0 },
      ABDOMEN: { lastTrained: null, totalSets: 0 },
    };

    const mapGroupKey = (mg: string) => {
      if (mg.includes('PEITORAL')) return 'PEITORAL';
      if (mg.includes('DORSAL') || mg.includes('BACK')) return 'DORSAL';
      if (mg.includes('OMBRO') || mg.includes('SHOULDER')) return 'OMBRO';
      if (mg.includes('BICEPS')) return 'BICEPS';
      if (mg.includes('TRICEPS')) return 'TRICEPS';
      if (mg.includes('QUADRICEPS') || mg.includes('QUADS')) return 'QUADRICEPS';
      if (mg.includes('POSTERIOR') || mg.includes('HAMSTRING')) return 'POSTERIOR_COXA';
      if (mg.includes('GLUTE')) return 'GLUTEOS';
      if (mg.includes('PANTURRILHA') || mg.includes('CALV')) return 'PANTURRILHA';
      if (mg.includes('ABDOMEN') || mg.includes('ABS')) return 'ABDOMEN';
      return 'DORSAL';
    };

    for (const session of recentSessions) {
      if (!session.finishedAt) continue;

      for (const sessionEx of session.exercises) {
        const key = mapGroupKey(sessionEx.exercise.muscleGroup || 'DORSAL');
        const completedSetsCount = sessionEx.sets.filter((s) => s.isCompleted).length;

        if (completedSetsCount > 0) {
          if (!muscleStats[key].lastTrained || session.finishedAt > muscleStats[key].lastTrained!) {
            muscleStats[key].lastTrained = session.finishedAt;
          }
          muscleStats[key].totalSets += completedSetsCount;
        }
      }
    }

    const now = new Date().getTime();

    return Object.entries(muscleStats).map(([key, data]) => {
      let recoveryPercent = 100;
      let hoursSince = 168; // 7 days

      if (data.lastTrained) {
        hoursSince = Math.floor((now - data.lastTrained.getTime()) / (1000 * 60 * 60));
        // Recovery decay formula: base 48h + 4h per set above 10 sets
        const baseRecoveryNeededHours = Math.min(96, 48 + Math.max(0, data.totalSets - 10) * 4);
        recoveryPercent = Math.min(100, Math.round((hoursSince / baseRecoveryNeededHours) * 100));
      }

      let status: 'OPTIMAL' | 'PARTIAL' | 'FATIGUED' = 'OPTIMAL';
      if (recoveryPercent < 50) status = 'FATIGUED';
      else if (recoveryPercent < 90) status = 'PARTIAL';

      return {
        muscleGroup: key,
        recoveryPercent,
        status,
        hoursSinceLastTrained: hoursSince,
        weeklySets: data.totalSets,
        needsDeload: data.totalSets > 22,
      };
    });
  }

  async suggestProgressiveOverload(userId: string) {
    const recentSessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      orderBy: { finishedAt: 'desc' },
      take: 3,
      include: {
        exercises: {
          include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    const suggestions: Array<{
      exerciseName: string;
      currentWeight: number;
      suggestedWeight: number;
      action: 'INCREASE_WEIGHT' | 'MAINTAIN' | 'DELOAD';
      reason: string;
    }> = [];

    if (recentSessions.length === 0) return suggestions;

    const latestSession = recentSessions[0];

    for (const exItem of latestSession.exercises) {
      const completedSets = exItem.sets.filter((s) => s.isCompleted);
      if (completedSets.length === 0) continue;

      const maxWeight = Math.max(...completedSets.map((s) => s.weight || 0));
      const avgRpe = completedSets.reduce((sum, s) => sum + (s.rpe || 7), 0) / completedSets.length;
      const allCompleted = completedSets.length === exItem.sets.length;

      const isUpper = exItem.exercise.muscleGroup?.includes('PEITORAL') || exItem.exercise.muscleGroup?.includes('DORSAL');
      const isLower = exItem.exercise.muscleGroup?.includes('QUADRICEPS') || exItem.exercise.muscleGroup?.includes('GLUTEOS');
      const increment = isLower ? 5.0 : isUpper ? 2.5 : 1.25;

      if (allCompleted && avgRpe <= 7) {
        suggestions.push({
          exerciseName: exItem.exercise.namePt,
          currentWeight: maxWeight,
          suggestedWeight: maxWeight + increment,
          action: 'INCREASE_WEIGHT',
          reason: `RPE baixo (${avgRpe.toFixed(1)}) e todas as séries concluídas. Aumentar +${increment}kg no próximo treino.`,
        });
      } else if (!allCompleted || avgRpe >= 9.5) {
        suggestions.push({
          exerciseName: exItem.exercise.namePt,
          currentWeight: maxWeight,
          suggestedWeight: maxWeight,
          action: 'MAINTAIN',
          reason: `RPE alto (${avgRpe.toFixed(1)}) ou séries incompletas. Manter ${maxWeight}kg para consolidar a execução.`,
        });
      }
    }

    return suggestions;
  }

  async getCoachInsights(userId: string) {
    const [recovery, overloadSuggestions] = await Promise.all([
      this.calculateRecoveryStatus(userId),
      this.suggestProgressiveOverload(userId),
    ]);

    const fatiguedMuscles = recovery.filter((r) => r.status === 'FATIGUED').map((r) => r.muscleGroup);
    const deloadRecommended = recovery.some((r) => r.needsDeload);

    return {
      recovery,
      overloadSuggestions,
      fatiguedMuscles,
      deloadRecommended,
      summaryTip: deloadRecommended
        ? '⚠️ Alto volume semanal detectado em alguns grupos. Coach Iron recomenda uma semana de Deload (-40% volume).'
        : fatiguedMuscles.length > 0
        ? `🟢 Músculos em recuperação: ${fatiguedMuscles.join(', ')}. Priorize o descanso desses grupos hoje.`
        : '🔥 Todos os grupos musculares estão recuperados e prontos para treinar pesado!',
    };
  }

  // ----------------------------------------------------
  // FASE 3: INOVAÇÕES (SFR LEARNING & RELATÓRIO SEMANAL)
  // ----------------------------------------------------

  async calculateSFRScores(userId: string) {
    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      take: 10,
      orderBy: { finishedAt: 'desc' },
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
    });

    const exerciseMap: Record<string, { name: string; totalSets: number; avgRpe: number; maxWeight: number }> = {};

    for (const s of sessions) {
      for (const exItem of s.exercises) {
        const id = exItem.exerciseId;
        const name = exItem.exercise.namePt;
        const completedSets = exItem.sets.filter((st) => st.isCompleted);
        if (completedSets.length === 0) continue;

        const maxWeight = Math.max(...completedSets.map((st) => st.weight || 0));
        const avgRpe = completedSets.reduce((sum, st) => sum + (st.rpe || 7), 0) / completedSets.length;

        if (!exerciseMap[id]) {
          exerciseMap[id] = { name, totalSets: 0, avgRpe: 0, maxWeight: 0 };
        }

        exerciseMap[id].totalSets += completedSets.length;
        exerciseMap[id].avgRpe = (exerciseMap[id].avgRpe + avgRpe) / 2;
        exerciseMap[id].maxWeight = Math.max(exerciseMap[id].maxWeight, maxWeight);
      }
    }

    return Object.values(exerciseMap).map((item) => {
      // SFR formula: Stimulus (weight * 0.1) / Fatigue (RPE scale modifier)
      const sfrScore = Math.min(10, Math.max(1, Math.round(((item.maxWeight * 0.05) / Math.max(1, item.avgRpe - 5)) * 10) / 10));
      return {
        exerciseName: item.name,
        totalSetsCompleted: item.totalSets,
        avgRpe: Math.round(item.avgRpe * 10) / 10,
        sfrScore,
        tier: sfrScore >= 8 ? 'S-TIER (Excelente Estímulo)' : sfrScore >= 5 ? 'A-TIER (Bom Estímulo)' : 'B-TIER (Fadiga Alta)',
      };
    });
  }

  async getWeeklyExecutiveReport(userId: string) {
    const context = await this.getUserContext(userId);
    const recovery = await this.calculateRecoveryStatus(userId);
    const sfr = await this.calculateSFRScores(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklySessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { gte: sevenDaysAgo } },
      include: { exercises: { include: { exercise: true, sets: true } } },
    });

    const totalVolumeKg = weeklySessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    const totalCaloriesKcal = weeklySessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    const totalWorkouts = weeklySessions.length;

    return {
      period: 'Últimos 7 Dias',
      userName: context.name,
      totalWorkouts,
      totalVolumeKg,
      totalVolumeTons: (totalVolumeKg / 1000).toFixed(1),
      totalCaloriesKcal,
      muscleRecovery: recovery,
      topExercisesSFR: sfr.sort((a, b) => b.sfrScore - a.sfrScore).slice(0, 5),
      coachVerdict: totalWorkouts >= 4
        ? `🏆 Excelente desempenho! Você concluiu ${totalWorkouts} treinos e movimentou ${(totalVolumeKg / 1000).toFixed(1)} toneladas. Mantenha a sobrecarga progressiva nos exercícios S-TIER.`
        : `💪 Bons estímulos registrados (${totalWorkouts} treinos). Busque atingir 4 a 5 sessões na próxima semana para maximizar o volume adaptativo (MAV).`,
    };
  }

  private generateFallbackPlan(dto: GeneratePlanDto, context: any) {
    const exList = context.availableExercises || [];
    const findEx = (namePt: string) => exList.find((e: any) => e.namePt?.toLowerCase().includes(namePt.toLowerCase()))?.namePt || namePt;

    const freq = dto.weeklyFrequency || 4;
    const level = dto.experienceLevel || 'INTERMEDIATE';
    const isAdvanced = level === 'ADVANCED';
    const isBeginner = level === 'BEGINNER';

    const goalLabel = dto.goal === 'HYPERTROPHY' ? 'Hipertrofia Muscular' : dto.goal === 'STRENGTH' ? 'Força Máxima' : dto.goal === 'CUT' ? 'Definição / Cut' : 'Condicionamento';

    const cardioDesc = dto.cardioDaysPerWeek && dto.cardioDaysPerWeek > 0
      ? ` | Cardio sugerido: ${dto.cardioDaysPerWeek}x/semana por ${dto.cardioDurationMinutes || 20} min (${dto.cardioType || 'LISS'}).`
      : '';

    const description = `Plano ${goalLabel} nível ${isBeginner ? 'Iniciante' : isAdvanced ? 'Avançado' : 'Intermediário'} (${freq}x/semana). Prescrição científica com base no Volume Adaptativo (MAV do Dr. Mike Israetel) e sobrecarga progressiva.${cardioDesc}`;

    let workouts: any[] = [];

    if (freq <= 3) {
      // Full Body A / B / C Split (5-6 exercises per workout)
      workouts = [
        {
          name: 'Treino A - Full Body (Foco Empurrar)',
          color: '#6366f1',
          dayOfWeek: 1,
          exercises: [
            { exerciseNamePt: findEx('Supino Reto com Barra'), targetSets: 4, targetReps: isBeginner ? 10 : 8, targetWeight: 40, restSeconds: 90, notes: 'Composto principal de peitoral' },
            { exerciseNamePt: findEx('Agachamento Livre com Barra'), targetSets: 4, targetReps: isBeginner ? 10 : 8, targetWeight: 50, restSeconds: 120, notes: 'Composto principal de quadríceps' },
            { exerciseNamePt: findEx('Puxada Frontal Aberta'), targetSets: 4, targetReps: 10, targetWeight: 45, restSeconds: 90, notes: 'Foco em largura de dorsais' },
            { exerciseNamePt: findEx('Desenvolvimento Militar com Barra'), targetSets: 3, targetReps: 10, targetWeight: 25, restSeconds: 90, notes: 'Ombros e deltoide anterior' },
            { exerciseNamePt: findEx('Tríceps Pulley na Corda'), targetSets: 3, targetReps: 12, targetWeight: 20, restSeconds: 60, notes: 'Extensão de cotovelos' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 3, targetReps: 15, targetWeight: 8, restSeconds: 60, notes: 'Foco no deltoide lateral' },
          ],
        },
        {
          name: 'Treino B - Full Body (Foco Puxar)',
          color: '#38bdf8',
          dayOfWeek: 3,
          exercises: [
            { exerciseNamePt: findEx('Levantamento Terra com Barra'), targetSets: 4, targetReps: 6, targetWeight: 60, restSeconds: 120, notes: 'Cadeia posterior completa' },
            { exerciseNamePt: findEx('Remada Curvada com Barra'), targetSets: 4, targetReps: 8, targetWeight: 40, restSeconds: 90, notes: 'Espessura de costas' },
            { exerciseNamePt: findEx('Supino Inclinado com Halteres'), targetSets: 4, targetReps: 10, targetWeight: 18, restSeconds: 90, notes: 'Porção clavicular do peito' },
            { exerciseNamePt: findEx('Leg Press 45°'), targetSets: 3, targetReps: 12, targetWeight: 100, restSeconds: 90, notes: 'Quadríceps e glúteos' },
            { exerciseNamePt: findEx('Rosca Direta com Barra W'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Flexão de cotovelos' },
            { exerciseNamePt: findEx('Stiff com Barra'), targetSets: 3, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Posterior de coxa em alongamento' },
          ],
        },
        {
          name: 'Treino C - Full Body (Foco Pernas e Acessórios)',
          color: '#4ade80',
          dayOfWeek: 5,
          exercises: [
            { exerciseNamePt: findEx('Agachamento Livre com Barra'), targetSets: 4, targetReps: 10, targetWeight: 50, restSeconds: 120, notes: 'Foco em amplitude' },
            { exerciseNamePt: findEx('Barra Fixa Pronada'), targetSets: 4, targetReps: 8, targetWeight: 0, restSeconds: 90, notes: 'Dorsais e bíceps' },
            { exerciseNamePt: findEx('Flexão de Braço'), targetSets: 3, targetReps: 15, targetWeight: 0, restSeconds: 60, notes: 'Volume metabólico de peito' },
            { exerciseNamePt: findEx('Rosca Martelo com Halteres'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Braquial e antebraço' },
            { exerciseNamePt: findEx('Tríceps Testa com Barra'), targetSets: 3, targetReps: 12, targetWeight: 15, restSeconds: 60, notes: 'Cabeça longa do tríceps' },
            { exerciseNamePt: findEx('Abdominal Supra no Solo'), targetSets: 3, targetReps: 20, targetWeight: 0, restSeconds: 45, notes: 'Fortalecimento de core' },
          ],
        },
      ];
    } else if (freq === 4) {
      // Upper / Lower 4x Split (6-7 exercises per workout)
      workouts = [
        {
          name: 'Treino A - Upper 1 (Peito, Costas e Braços)',
          color: '#6366f1',
          dayOfWeek: 1,
          exercises: [
            { exerciseNamePt: findEx('Supino Reto com Barra'), targetSets: 4, targetReps: 8, targetWeight: 45, restSeconds: 90, notes: 'Fase concêntrica explosiva' },
            { exerciseNamePt: findEx('Puxada Frontal Aberta'), targetSets: 4, targetReps: 10, targetWeight: 45, restSeconds: 90, notes: 'Puxe até o esterno' },
            { exerciseNamePt: findEx('Supino Inclinado com Halteres'), targetSets: 3, targetReps: 10, targetWeight: 18, restSeconds: 60, notes: 'Porção superior do peito' },
            { exerciseNamePt: findEx('Remada Curvada com Barra'), targetSets: 3, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Mantenha a coluna neutra' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 4, targetReps: 15, targetWeight: 8, restSeconds: 60, notes: 'Foco no deltoide lateral' },
            { exerciseNamePt: findEx('Tríceps Pulley na Corda'), targetSets: 3, targetReps: 12, targetWeight: 20, restSeconds: 60, notes: 'Abra a corda embaixo' },
            { exerciseNamePt: findEx('Rosca Direta com Barra W'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Sem balanço do quadril' },
          ],
        },
        {
          name: 'Treino B - Lower 1 (Quadríceps e Panturrilha)',
          color: '#38bdf8',
          dayOfWeek: 2,
          exercises: [
            { exerciseNamePt: findEx('Agachamento Livre com Barra'), targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 120, notes: 'Cadência 3s na descida' },
            { exerciseNamePt: findEx('Leg Press 45°'), targetSets: 4, targetReps: 12, targetWeight: 100, restSeconds: 90, notes: 'Pés na largura dos ombros' },
            { exerciseNamePt: findEx('Stiff com Barra'), targetSets: 4, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Posterior de coxa' },
            { exerciseNamePt: findEx('Cadeira Extensora'), targetSets: 3, targetReps: 15, targetWeight: 35, restSeconds: 60, notes: 'Pico de contração de 1s' },
            { exerciseNamePt: findEx('Mesa Flexora'), targetSets: 3, targetReps: 12, targetWeight: 30, restSeconds: 60, notes: 'Isolamento de flexão de joelho' },
            { exerciseNamePt: findEx('Gêmeos / Panturrilha'), targetSets: 4, targetReps: 15, targetWeight: 40, restSeconds: 60, notes: 'Alongamento completo no fundo' },
          ],
        },
        {
          name: 'Treino C - Upper 2 (Hipertrofia e Ombros)',
          color: '#4ade80',
          dayOfWeek: 4,
          exercises: [
            { exerciseNamePt: findEx('Desenvolvimento Militar com Barra'), targetSets: 4, targetReps: 8, targetWeight: 25, restSeconds: 90, notes: 'Desenvolvimento de ombros' },
            { exerciseNamePt: findEx('Remada Baixa no Cabo'), targetSets: 4, targetReps: 10, targetWeight: 45, restSeconds: 90, notes: 'Retração escapular firme' },
            { exerciseNamePt: findEx('Supino Reto com Halteres'), targetSets: 3, targetReps: 10, targetWeight: 20, restSeconds: 60, notes: 'Amplitude total' },
            { exerciseNamePt: findEx('Crossover no Cabo'), targetSets: 3, targetReps: 15, targetWeight: 15, restSeconds: 60, notes: 'Squeeze no centro' },
            { exerciseNamePt: findEx('Rosca Martelo com Halteres'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Foco no braquiorradial' },
            { exerciseNamePt: findEx('Tríceps Testa com Barra'), targetSets: 3, targetReps: 12, targetWeight: 15, restSeconds: 60, notes: 'Tríceps alongado' },
            { exerciseNamePt: findEx('Face Pull no Cabo'), targetSets: 3, targetReps: 15, targetWeight: 15, restSeconds: 45, notes: 'Manguito e deltoide posterior' },
          ],
        },
        {
          name: 'Treino D - Lower 2 (Posterior e Glúteos)',
          color: '#f97316',
          dayOfWeek: 5,
          exercises: [
            { exerciseNamePt: findEx('Levantamento Terra Romano'), targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 120, notes: 'Hinge de quadril perfeito' },
            { exerciseNamePt: findEx('Agachamento Goblet'), targetSets: 3, targetReps: 12, targetWeight: 18, restSeconds: 90, notes: 'Postura ereta' },
            { exerciseNamePt: findEx('Mesa Flexora'), targetSets: 4, targetReps: 12, targetWeight: 30, restSeconds: 60, notes: 'Posterior sob tensão constante' },
            { exerciseNamePt: findEx('Passada / Afundo'), targetSets: 3, targetReps: 12, targetWeight: 10, restSeconds: 60, notes: 'Unilateral de pernas' },
            { exerciseNamePt: findEx('Elevação Pélvica com Barra'), targetSets: 3, targetReps: 10, targetWeight: 40, restSeconds: 90, notes: 'Ativação máxima de glúteos' },
            { exerciseNamePt: findEx('Abdominal Supra no Solo'), targetSets: 4, targetReps: 20, targetWeight: 0, restSeconds: 45, notes: 'Contração abdominal' },
          ],
        },
      ];
    } else {
      // 5 or 6 Days PPL + Upper/Lower or Arnold Split (6-7 exercises per workout)
      workouts = [
        {
          name: 'Treino A - Push (Peitoral, Ombros e Tríceps)',
          color: '#6366f1',
          dayOfWeek: 1,
          exercises: [
            { exerciseNamePt: findEx('Supino Reto com Barra'), targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 90, notes: 'Fase concêntrica forte' },
            { exerciseNamePt: findEx('Supino Inclinado com Halteres'), targetSets: 3, targetReps: 10, targetWeight: 20, restSeconds: 60, notes: 'Porção superior do peito' },
            { exerciseNamePt: findEx('Desenvolvimento Militar com Barra'), targetSets: 4, targetReps: 8, targetWeight: 30, restSeconds: 90, notes: 'Deltoide anterior e triceps' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 4, targetReps: 15, targetWeight: 10, restSeconds: 60, notes: 'Foco no deltoide lateral' },
            { exerciseNamePt: findEx('Tríceps Pulley na Corda'), targetSets: 3, targetReps: 12, targetWeight: 22, restSeconds: 60, notes: 'Extensão de cotovelos' },
            { exerciseNamePt: findEx('Paralelas / Mergulho'), targetSets: 3, targetReps: 10, targetWeight: 0, restSeconds: 60, notes: 'Tríceps e peitoral inferior' },
            { exerciseNamePt: findEx('Crossover no Cabo'), targetSets: 3, targetReps: 15, targetWeight: 15, restSeconds: 45, notes: 'Isolamento final de peitoral' },
          ],
        },
        {
          name: 'Treino B - Pull (Costas, Bíceps e Antebraço)',
          color: '#38bdf8',
          dayOfWeek: 2,
          exercises: [
            { exerciseNamePt: findEx('Puxada Frontal Aberta'), targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 90, notes: 'Puxe até o peito' },
            { exerciseNamePt: findEx('Remada Curvada com Barra'), targetSets: 4, targetReps: 8, targetWeight: 40, restSeconds: 90, notes: 'Espessura de costas' },
            { exerciseNamePt: findEx('Remada Baixa no Cabo'), targetSets: 3, targetReps: 12, targetWeight: 45, restSeconds: 60, notes: 'Retração escapular' },
            { exerciseNamePt: findEx('Face Pull no Cabo'), targetSets: 4, targetReps: 15, targetWeight: 15, restSeconds: 60, notes: 'Deltoide posterior e manguito' },
            { exerciseNamePt: findEx('Rosca Direta com Barra W'), targetSets: 3, targetReps: 10, targetWeight: 14, restSeconds: 60, notes: 'Rosca direta' },
            { exerciseNamePt: findEx('Rosca Martelo com Halteres'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Foco no braquiorradial' },
            { exerciseNamePt: findEx('Rosca Scott'), targetSets: 3, targetReps: 12, targetWeight: 10, restSeconds: 45, notes: 'Pico de contração de bíceps' },
          ],
        },
        {
          name: 'Treino C - Legs (Pernas Completas e Panturrilhas)',
          color: '#4ade80',
          dayOfWeek: 3,
          exercises: [
            { exerciseNamePt: findEx('Agachamento Livre com Barra'), targetSets: 4, targetReps: 8, targetWeight: 60, restSeconds: 120, notes: 'Amplitude completa' },
            { exerciseNamePt: findEx('Leg Press 45°'), targetSets: 4, targetReps: 10, targetWeight: 120, restSeconds: 90, notes: 'Volume de quadríceps' },
            { exerciseNamePt: findEx('Stiff com Barra'), targetSets: 4, targetReps: 10, targetWeight: 40, restSeconds: 90, notes: 'Posterior de coxa' },
            { exerciseNamePt: findEx('Cadeira Extensora'), targetSets: 3, targetReps: 15, targetWeight: 40, restSeconds: 60, notes: 'Extensão de joelhos' },
            { exerciseNamePt: findEx('Mesa Flexora'), targetSets: 3, targetReps: 12, targetWeight: 35, restSeconds: 60, notes: 'Flexão de joelhos' },
            { exerciseNamePt: findEx('Gêmeos / Panturrilha'), targetSets: 4, targetReps: 15, targetWeight: 45, restSeconds: 60, notes: 'Extensão plantar' },
            { exerciseNamePt: findEx('Passada / Afundo'), targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Trabalho unilateral' },
          ],
        },
        {
          name: 'Treino D - Upper (Foco Força e Tensão)',
          color: '#f97316',
          dayOfWeek: 4,
          exercises: [
            { exerciseNamePt: findEx('Supino Reto com Barra'), targetSets: 4, targetReps: 6, targetWeight: 55, restSeconds: 120, notes: 'Carga pesada' },
            { exerciseNamePt: findEx('Barra Fixa Pronada'), targetSets: 4, targetReps: 8, targetWeight: 0, restSeconds: 90, notes: 'Peso corporal' },
            { exerciseNamePt: findEx('Supino Inclinado com Halteres'), targetSets: 3, targetReps: 10, targetWeight: 22, restSeconds: 90, notes: 'Tensão contínua' },
            { exerciseNamePt: findEx('Remada Baixa no Cabo'), targetSets: 3, targetReps: 10, targetWeight: 50, restSeconds: 90, notes: 'Remada pesada' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 4, targetReps: 15, targetWeight: 10, restSeconds: 60, notes: 'Elevação lateral' },
            { exerciseNamePt: findEx('Tríceps Testa com Barra'), targetSets: 3, targetReps: 10, targetWeight: 18, restSeconds: 60, notes: 'Extensão de tríceps' },
            { exerciseNamePt: findEx('Rosca Direta com Barra W'), targetSets: 3, targetReps: 10, targetWeight: 14, restSeconds: 60, notes: 'Rosca direta' },
          ],
        },
        {
          name: 'Treino E - Lower & Core (Foco Posterior e Abdômen)',
          color: '#a855f7',
          dayOfWeek: 5,
          exercises: [
            { exerciseNamePt: findEx('Levantamento Terra Romano'), targetSets: 4, targetReps: 8, targetWeight: 60, restSeconds: 120, notes: 'Cadeia posterior' },
            { exerciseNamePt: findEx('Agachamento Goblet'), targetSets: 3, targetReps: 12, targetWeight: 22, restSeconds: 90, notes: 'Postura ereta' },
            { exerciseNamePt: findEx('Mesa Flexora'), targetSets: 4, targetReps: 12, targetWeight: 35, restSeconds: 60, notes: 'Posterior de coxa' },
            { exerciseNamePt: findEx('Leg Press 45°'), targetSets: 3, targetReps: 15, targetWeight: 110, restSeconds: 90, notes: 'Queima metabólica' },
            { exerciseNamePt: findEx('Gêmeos / Panturrilha'), targetSets: 4, targetReps: 15, targetWeight: 45, restSeconds: 60, notes: 'Panturrilhas' },
            { exerciseNamePt: findEx('Abdominal Supra no Solo'), targetSets: 4, targetReps: 20, targetWeight: 0, restSeconds: 45, notes: 'Core' },
            { exerciseNamePt: findEx('Prancha Abdominal'), targetSets: 3, targetReps: 45, targetWeight: 0, restSeconds: 45, notes: 'Isometria de core (45s)' },
          ],
        },
      ];

      if (freq >= 6) {
        workouts.push({
          name: 'Treino F - Arms & Delts (Pump e Acessórios)',
          color: '#ec4899',
          dayOfWeek: 6,
          exercises: [
            { exerciseNamePt: findEx('Desenvolvimento com Halteres'), targetSets: 4, targetReps: 10, targetWeight: 16, restSeconds: 90, notes: 'Desenvolvimento em 90°' },
            { exerciseNamePt: findEx('Elevação Frontal'), targetSets: 3, targetReps: 12, targetWeight: 8, restSeconds: 60, notes: 'Deltoide anterior' },
            { exerciseNamePt: findEx('Rosca Scott'), targetSets: 4, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Bíceps em isolamento' },
            { exerciseNamePt: findEx('Tríceps Pulley no Cabo'), targetSets: 4, targetReps: 12, targetWeight: 25, restSeconds: 60, notes: 'Tríceps barra reta' },
            { exerciseNamePt: findEx('Rosca Concentrada'), targetSets: 3, targetReps: 12, targetWeight: 10, restSeconds: 45, notes: 'Pico de bíceps' },
            { exerciseNamePt: findEx('Elevação Lateral com Halteres'), targetSets: 4, targetReps: 20, targetWeight: 8, restSeconds: 45, notes: 'Burnout final' },
          ],
        });
      }
    }

    return {
      planName: `Plano Coach Iron ${goalLabel} (${freq}x/semana)`,
      description,
      goal: dto.goal,
      weeklyFrequency: freq,
      workouts,
    };
  }
}

