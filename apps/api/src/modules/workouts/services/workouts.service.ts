import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExerciseDBService } from './exercise-db.service';
import { MUSCLE_GROUP_MAP, EQUIPMENT_TRANSLATION, translateExerciseName, determineMuscleSubGroup, translateInstructions } from '../data/exercise-translations';

@Injectable()
export class WorkoutsService implements OnModuleInit {
  private readonly logger = new Logger(WorkoutsService.name);

  private readonly direct3DMap: Record<string, string> = {
    'Agachamento Livre com Barra': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/quads/barbell-bench-squat.gif',
    'Abdominal Supra no Solo': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/3-4-sit-up.gif',
    'Supino Reto com Barra': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
    'Supino Inclinado com Halteres': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/dumbbell-incline-bench-press.gif',
    'Flexão de Braço': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/push-up.gif',
    'Puxada Frontal Aberta': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/band-underhand-pulldown.gif',
    'Barra Fixa Pronada': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/pull-up.gif',
    'Desenvolvimento Militar com Barra': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/barbell-standing-wide-military-press.gif',
    'Elevação Lateral com Halteres': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/dumbbell-lateral-raise.gif',
    'Rosca Direta com Barra W': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/biceps/barbell-curl.gif',
    'Rosca Martelo': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/biceps/dumbbell-hammer-curl.gif',
    'Tríceps Pulley na Corda': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/triceps/barbell-lying-triceps-extension.gif',
    'Leg Press 45°': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/sled-45-leg-press.gif',
    'Stiff com Barra': 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/hamstrings/barbell-straight-leg-deadlift.gif',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly exerciseDBService: ExerciseDBService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Iniciando migração e sanitização automática de GIFs para 3D CDN...');
      await this.forceUpdateAllExercisesTo3DGifs();
    } catch (err) {
      this.logger.error('Erro na migração de GIFs 3D no módulo init:', err);
    }
  }

  public async forceUpdateAllExercisesTo3DGifs() {
    const exercises = await this.prisma.exercise.findMany();
    let updated = 0;

    for (const ex of exercises) {
      let targetGifUrl: string | null = null;

      // 1. Check exact namePt match
      if (this.direct3DMap[ex.namePt]) {
        targetGifUrl = this.direct3DMap[ex.namePt];
      } else if (
        !ex.gifUrl ||
        ex.gifUrl.includes('yuhonas') ||
        ex.gifUrl.includes('raw.githubusercontent.com') ||
        ex.gifUrl.endsWith('.jpg')
      ) {
        // Replace old yuhonas or raw.githubusercontent URLs with jsDelivr 3D CDN
        targetGifUrl = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/3-4-sit-up.gif';
      }

      if (targetGifUrl && ex.gifUrl !== targetGifUrl) {
        await this.prisma.exercise.update({
          where: { id: ex.id },
          data: { gifUrl: targetGifUrl },
        });
        updated++;
      }
    }

    this.logger.log(`Atualização forçada de GIFs 3D concluída. Exercícios atualizados: ${updated}/${exercises.length}.`);
    return { total: exercises.length, updated };
  }

  // ----------------------------------------------------
  // EXERCÍCIOS
  // ----------------------------------------------------
  async listExercises(userId: string, muscleGroup?: string, search?: string) {
    // Auto-sync 1,323 3D exercises if table count is low
    const count = await this.prisma.exercise.count();
    if (count < 100) {
      await this.autoSeedExercises();
    }

    const whereClause: any = {
      OR: [
        { isCustom: false },
        { userId },
      ],
    };

    if (muscleGroup && muscleGroup !== 'ALL') {
      const groupMap: Record<string, string[]> = {
        PEITORAL_SUPERIOR: ['PEITORAL_SUPERIOR', 'PEITORAL', 'PECTORALS'],
        PEITORAL_MEDIAL: ['PEITORAL_MEDIAL', 'PEITORAL', 'PECTORALS'],
        PEITORAL_INFERIOR: ['PEITORAL_INFERIOR', 'PEITORAL', 'PECTORALS'],
        PEITORAL: ['PEITORAL', 'PEITORAL_SUPERIOR', 'PEITORAL_MEDIAL', 'PEITORAL_INFERIOR', 'PECTORALS'],
        DORSAL: ['DORSAL', 'COSTAS', 'LATS', 'UPPER-BACK'],
        TRAPEZIO: ['TRAPEZIO', 'TRAPS', 'LEVATOR-SCAPULAE'],
        LOMBAR: ['LOMBAR', 'SPINE'],
        OMBRO_ANTERIOR: ['OMBRO_ANTERIOR', 'OMBRO', 'DELTS'],
        OMBRO_LATERAL: ['OMBRO_LATERAL', 'OMBRO', 'DELTS'],
        OMBRO_POSTERIOR: ['OMBRO_POSTERIOR', 'OMBRO', 'DELTS'],
        OMBRO: ['OMBRO', 'OMBRO_ANTERIOR', 'OMBRO_LATERAL', 'OMBRO_POSTERIOR', 'DELTS'],
        BICEPS: ['BICEPS'],
        TRICEPS: ['TRICEPS'],
        ANTEBRACO: ['ANTEBRACO', 'FOREARMS'],
        QUADRICEPS: ['QUADRICEPS', 'QUADS'],
        POSTERIOR_COXA: ['POSTERIOR_COXA', 'HAMSTRINGS', 'COXA', 'ADDUCTORS'],
        GLUTEOS: ['GLUTEOS', 'GLUTES', 'ABDUCTORS'],
        PANTURRILHA: ['PANTURRILHA', 'CALVES'],
        ABDOMEN: ['ABDOMEN', 'ABS', 'SERRATUS-ANTERIOR'],
        CARDIO: ['CARDIO'],
      };

      const matchGroups = groupMap[muscleGroup] || [muscleGroup];
      whereClause.muscleGroup = { in: matchGroups };
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      whereClause.AND = [
        {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { namePt: { contains: s, mode: 'insensitive' } },
            { nameEn: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const exercises = await this.prisma.exercise.findMany({
      where: whereClause,
      orderBy: { namePt: 'asc' },
    });

    return exercises.map((ex) => {
      let gifUrl = ex.gifUrl;
      if (this.direct3DMap[ex.namePt]) {
        gifUrl = this.direct3DMap[ex.namePt];
      } else if (!gifUrl || gifUrl.includes('yuhonas') || gifUrl.includes('raw.githubusercontent.com') || gifUrl.endsWith('.jpg')) {
        gifUrl = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/3-4-sit-up.gif';
      }

      let instructions = ex.instructions;
      if (instructions) {
        instructions = translateInstructions(instructions);
      } else {
        instructions = `Execução correta de ${ex.namePt}. Mantenha a postura e expire na fase concêntrica.`;
      }

      return { ...ex, gifUrl, instructions };
    });
  }

  public async syncExercisesFromCDN() {
    this.logger.log('Sincronizando 1.323 exercícios 3D a partir do CDN jsDelivr...');
    const cdnItems = await this.exerciseDBService.fetchAllExercisesFromCDN();

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of cdnItems) {
      const { namePt, nameEn } = translateExerciseName(item.name);
      const fullName = `${namePt} (${nameEn})`;
      const baseGroup = MUSCLE_GROUP_MAP[item.muscle] || 'OUTROS';
      const muscleGroup = determineMuscleSubGroup(baseGroup, item.name);
      const equipment = EQUIPMENT_TRANSLATION[item.equipment?.toLowerCase()] || item.equipment || 'Outro';
      const rawInstructions = Array.isArray(item.instructions) && item.instructions.length > 0
        ? item.instructions
        : `Execução correta de ${namePt}. Mantenha a postura e expire na fase concêntrica.`;
      const instructionsText = translateInstructions(rawInstructions);
      const secondaryStr = Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles.join(', ') : item.secondaryMuscles || null;

      const existing = await this.prisma.exercise.findFirst({
        where: {
          OR: [
            { namePt },
            { nameEn },
          ],
        },
      });

      if (!existing) {
        await this.prisma.exercise.create({
          data: {
            name: fullName,
            namePt,
            nameEn,
            muscleGroup,
            secondaryMuscle: secondaryStr,
            equipment,
            metValue: 5.0,
            gifUrl: item.gifUrl,
            instructions: instructionsText,
          },
        });
        createdCount++;
      } else {
        await this.prisma.exercise.update({
          where: { id: existing.id },
          data: {
            name: fullName,
            namePt,
            nameEn,
            muscleGroup,
            gifUrl: item.gifUrl,
            instructions: instructionsText,
            secondaryMuscle: secondaryStr || existing.secondaryMuscle,
            equipment: equipment || existing.equipment,
          },
        });
        updatedCount++;
      }
    }

    this.logger.log(`Sincronização concluída! Criados: ${createdCount}, Atualizados: ${updatedCount}.`);
    return { createdCount, updatedCount, totalCDNItems: cdnItems.length };
  }

  private async autoSeedExercises() {
    try {
      await this.syncExercisesFromCDN();
    } catch (err) {
      this.logger.error('Erro ao auto-semear exercícios do CDN, usando catálogo fallback...', err);
    }
  }

  async createCustomExercise(userId: string, data: {
    namePt: string;
    nameEn?: string;
    muscleGroup: string;
    secondaryMuscle?: string;
    equipment?: string;
    gifUrl?: string;
    instructions?: string;
    metValue?: number;
  }) {
    const fullName = data.nameEn ? `${data.namePt} (${data.nameEn})` : data.namePt;
    return this.prisma.exercise.create({
      data: {
        name: fullName,
        namePt: data.namePt,
        nameEn: data.nameEn,
        muscleGroup: data.muscleGroup,
        secondaryMuscle: data.secondaryMuscle,
        equipment: data.equipment || 'BARBELL',
        gifUrl: data.gifUrl,
        instructions: data.instructions,
        metValue: data.metValue || 5.0,
        isCustom: true,
        userId,
      },
    });
  }

  // ----------------------------------------------------
  // TEMPLATES DE TREINO
  // ----------------------------------------------------
  async listTemplates(userId: string) {
    return this.prisma.workoutTemplate.findMany({
      where: { userId, isActive: true },
      include: {
        items: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createTemplate(userId: string, data: {
    name: string;
    description?: string;
    dayOfWeek?: number;
    color?: string;
    items: {
      exerciseId: string;
      targetSets: number;
      targetReps: number;
      targetWeight?: number;
      restSeconds?: number;
      notes?: string;
    }[];
  }) {
    return this.prisma.workoutTemplate.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        dayOfWeek: data.dayOfWeek,
        color: data.color || '#6366f1',
        items: {
          create: data.items.map((item, index) => ({
            exerciseId: item.exerciseId,
            order: index,
            targetSets: item.targetSets || 3,
            targetReps: item.targetReps || 12,
            targetWeight: item.targetWeight,
            restSeconds: item.restSeconds || 60,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: { exercise: true },
        },
      },
    });
  }

  async updateTemplate(id: string, userId: string, data: {
    name?: string;
    description?: string;
    dayOfWeek?: number;
    color?: string;
    items?: {
      exerciseId: string;
      targetSets: number;
      targetReps: number;
      targetWeight?: number;
      restSeconds?: number;
      notes?: string;
    }[];
  }) {
    const existing = await this.prisma.workoutTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Template de treino não encontrado');
    }

    if (data.items) {
      // Re-create items cleanly
      await this.prisma.workoutTemplateItem.deleteMany({
        where: { templateId: id },
      });
    }

    return this.prisma.workoutTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        dayOfWeek: data.dayOfWeek,
        color: data.color,
        items: data.items
          ? {
              create: data.items.map((item, index) => ({
                exerciseId: item.exerciseId,
                order: index,
                targetSets: item.targetSets || 3,
                targetReps: item.targetReps || 12,
                targetWeight: item.targetWeight,
                restSeconds: item.restSeconds || 60,
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          include: { exercise: true },
        },
      },
    });
  }

  async deleteTemplate(id: string, userId: string) {
    const existing = await this.prisma.workoutTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Template de treino não encontrado');
    }

    return this.prisma.workoutTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ----------------------------------------------------
  // SESSÕES DE TREINO (WORKOUT LOGGING)
  // ----------------------------------------------------
  async startSession(userId: string, data: { templateId?: string; title?: string }) {
    let sessionTitle = data.title || 'Treino Livre';
    let templateItems: any[] = [];

    if (data.templateId) {
      const template = await this.prisma.workoutTemplate.findFirst({
        where: { id: data.templateId, userId },
        include: {
          items: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (template) {
        sessionTitle = template.name;
        templateItems = template.items;
      }
    }

    // Check if there is an unfinished session
    const activeSession = await this.prisma.workoutSession.findFirst({
      where: { userId, finishedAt: null },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (activeSession) {
      return activeSession;
    }

    // Create new session
    const session = await this.prisma.workoutSession.create({
      data: {
        userId,
        templateId: data.templateId,
        title: sessionTitle,
        startedAt: new Date(),
        exercises: {
          create: templateItems.map((item, index) => ({
            exerciseId: item.exerciseId,
            order: index,
            sets: {
              create: Array.from({ length: item.targetSets }).map((_, sIdx) => ({
                setNumber: sIdx + 1,
                reps: item.targetReps,
                weight: item.targetWeight || 0,
                isCompleted: false,
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return session;
  }

  async getActiveSession(userId: string) {
    return this.prisma.workoutSession.findFirst({
      where: { userId, finishedAt: null },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async addExerciseToSession(userId: string, sessionId: string, exerciseId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId, finishedAt: null },
      include: { exercises: true },
    });

    if (!session) {
      throw new NotFoundException('Sessão ativa não encontrada');
    }

    const currentCount = session.exercises.length;

    const sessionExercise = await this.prisma.workoutSessionExercise.create({
      data: {
        sessionId,
        exerciseId,
        order: currentCount,
        sets: {
          create: [
            { setNumber: 1, reps: 12, weight: 0, isCompleted: false },
            { setNumber: 2, reps: 12, weight: 0, isCompleted: false },
            { setNumber: 3, reps: 12, weight: 0, isCompleted: false },
          ],
        },
      },
      include: {
        exercise: true,
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    return sessionExercise;
  }

  async updateSet(userId: string, setId: string, data: {
    reps?: number;
    weight?: number;
    isCompleted?: boolean;
    isWarmup?: boolean;
    isDropset?: boolean;
    rpe?: number;
  }) {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: {
        sessionExercise: {
          include: { session: true },
        },
      },
    });

    if (!set || set.sessionExercise.session.userId !== userId) {
      throw new NotFoundException('Série não encontrada');
    }

    return this.prisma.exerciseSet.update({
      where: { id: setId },
      data: {
        reps: data.reps !== undefined ? data.reps : set.reps,
        weight: data.weight !== undefined ? data.weight : set.weight,
        isCompleted: data.isCompleted !== undefined ? data.isCompleted : set.isCompleted,
        isWarmup: data.isWarmup !== undefined ? data.isWarmup : set.isWarmup,
        isDropset: data.isDropset !== undefined ? data.isDropset : set.isDropset,
        rpe: data.rpe !== undefined ? data.rpe : set.rpe,
      },
    });
  }

  async addSet(userId: string, sessionExerciseId: string) {
    const sessionExercise = await this.prisma.workoutSessionExercise.findUnique({
      where: { id: sessionExerciseId },
      include: {
        sets: { orderBy: { setNumber: 'asc' } },
        session: true,
      },
    });

    if (!sessionExercise || sessionExercise.session.userId !== userId) {
      throw new NotFoundException('Exercício da sessão não encontrado');
    }

    const lastSet = sessionExercise.sets[sessionExercise.sets.length - 1];
    const newSetNumber = sessionExercise.sets.length + 1;

    return this.prisma.exerciseSet.create({
      data: {
        sessionExerciseId,
        setNumber: newSetNumber,
        reps: lastSet ? lastSet.reps : 12,
        weight: lastSet ? lastSet.weight : 0,
        isCompleted: false,
      },
    });
  }

  async removeSet(userId: string, setId: string) {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: {
        sessionExercise: {
          include: { session: true },
        },
      },
    });

    if (!set || set.sessionExercise.session.userId !== userId) {
      throw new NotFoundException('Série não encontrada');
    }

    return this.prisma.exerciseSet.delete({
      where: { id: setId },
    });
  }

  async finishSession(userId: string, sessionId: string, data: {
    rating?: number;
    notes?: string;
    intensity?: string;
  }) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão de treino não encontrada');
    }

    // Auto-mark all sets in the session as completed upon finish
    await this.prisma.exerciseSet.updateMany({
      where: {
        sessionExercise: { sessionId },
      },
      data: { isCompleted: true },
    });

    const finishedAt = new Date();
    const durationMinutes = Math.max(1, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / (1000 * 60)));

    // Calculate total volume (sum of weight * reps for all sets)
    let totalVolume = 0;
    let avgMet = 5.0;
    let metSum = 0;
    let metCount = 0;

    for (const exItem of session.exercises) {
      if (exItem.exercise && exItem.exercise.metValue) {
        metSum += exItem.exercise.metValue;
        metCount++;
      }

      for (const s of exItem.sets) {
        totalVolume += (s.weight || 0) * (s.reps || 0);
      }
    }

    if (metCount > 0) {
      avgMet = metSum / metCount;
    }

    // Get user weight from latest BodyMeasurement
    const latestMeasurement = await this.prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const userWeightKg = latestMeasurement?.weightKg || 70.0;

    // MET Intensity modifier
    const intensity = data.intensity || 'MODERATE';
    let intensityMultiplier = 1.0;
    if (intensity === 'LIGHT') intensityMultiplier = 0.85;
    if (intensity === 'VIGOROUS') intensityMultiplier = 1.25;

    const caloriesBurned = Math.round(((avgMet * intensityMultiplier * 3.5 * userWeightKg) / 200) * durationMinutes);

    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        finishedAt,
        durationMinutes,
        totalVolume,
        caloriesBurned,
        intensity,
        rating: data.rating,
        notes: data.notes,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });
  }

  async reopenSession(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sessão de treino não encontrada');
    }

    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        finishedAt: null,
      },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sessão de treino não encontrada');
    }

    return this.prisma.workoutSession.delete({
      where: { id: sessionId },
    });
  }

  // ----------------------------------------------------
  // HISTÓRICO E ESTATÍSTICAS
  // ----------------------------------------------------
  async listSessions(userId: string, limit = 20) {
    return this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getSessionDetails(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão de treino não encontrada');
    }

    return session;
  }

  async getStats(userId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const completedSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
      },
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
    });

    const thisWeekSessions = completedSessions.filter((s) => s.startedAt >= startOfWeek);

    const totalWorkouts = completedSessions.length;
    const weeklyWorkouts = thisWeekSessions.length;
    const totalCalories = completedSessions.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);
    const totalVolume = completedSessions.reduce((acc, curr) => acc + (curr.totalVolume || 0), 0);

    // Group muscle breakdown
    const muscleMap: Record<string, number> = {};
    for (const session of thisWeekSessions) {
      for (const exItem of session.exercises) {
        const mg = exItem.exercise.muscleGroup || 'OUTROS';
        muscleMap[mg] = (muscleMap[mg] || 0) + exItem.sets.filter((s) => s.isCompleted).length;
      }
    }

    return {
      totalWorkouts,
      weeklyWorkouts,
      totalCalories,
      totalVolume,
      muscleBreakdown: muscleMap,
    };
  }

  // ----------------------------------------------------
  // PROGRESSO SEMANAL COMPLETO (CICLO + DASHBOARD)
  // ----------------------------------------------------
  async getWeeklyProgress(userId: string) {
    const now = new Date();

    // Calculate Monday 00:00 of current week
    const dayOfWeekNow = now.getDay(); // 0=Sun
    const diffToMonday = dayOfWeekNow === 0 ? 6 : dayOfWeekNow - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Previous week range
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);

    // Fetch active templates
    const templates = await this.prisma.workoutTemplate.findMany({
      where: { userId, isActive: true },
      include: {
        items: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Fetch ALL completed sessions this week
    const thisWeekSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        startedAt: { gte: weekStart, lte: weekEnd },
      },
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Fetch previous week sessions for comparison
    const prevWeekSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        startedAt: { gte: prevWeekStart, lte: prevWeekEnd },
      },
    });

    // --- Template Progress ---
    const templateProgress = templates.map((tpl) => {
      const matchingSession = thisWeekSessions.find(
        (s) =>
          s.templateId === tpl.id ||
          (s.title && tpl.name && s.title.toLowerCase().trim() === tpl.name.toLowerCase().trim()),
      );

      return {
        templateId: tpl.id,
        templateName: tpl.name,
        dayOfWeek: tpl.dayOfWeek,
        color: tpl.color,
        isCompleted: !!matchingSession,
        completedSessionId: matchingSession?.id || null,
        completedAt: matchingSession?.finishedAt || null,
        durationMinutes: matchingSession?.durationMinutes || 0,
        totalVolume: matchingSession?.totalVolume || 0,
        caloriesBurned: matchingSession?.caloriesBurned || 0,
        rating: matchingSession?.rating || null,
      };
    });

    // --- Summary ---
    const plannedDays = templates.filter((t) => t.dayOfWeek != null).length;
    const completedDays = templateProgress.filter((t) => t.isCompleted).length;
    const pendingDays = plannedDays - completedDays;

    const totalVolumeWeek = thisWeekSessions.reduce((a, s) => a + (s.totalVolume || 0), 0);
    const totalCaloriesWeek = thisWeekSessions.reduce((a, s) => a + (s.caloriesBurned || 0), 0);
    const totalDurationWeek = thisWeekSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);
    const avgDurationMin = thisWeekSessions.length > 0 ? Math.round(totalDurationWeek / thisWeekSessions.length) : 0;

    const ratings = thisWeekSessions.filter((s) => s.rating).map((s) => s.rating!);
    const avgRating = ratings.length > 0 ? parseFloat((ratings.reduce((a, r) => a + r, 0) / ratings.length).toFixed(1)) : 0;

    // --- Muscle Group Coverage ---
    const trainedMuscles: Record<string, number> = {};
    for (const session of thisWeekSessions) {
      for (const exItem of session.exercises) {
        if (!exItem.exercise) continue;
        const mg = exItem.exercise.muscleGroup || 'OUTROS';
        // For completed sessions, count all sets (or completed sets)
        const completedSetsCount = exItem.sets.filter((s) => s.isCompleted).length || exItem.sets.length || 1;
        trainedMuscles[mg] = (trainedMuscles[mg] || 0) + completedSetsCount;
      }
    }

    // All planned muscle groups from templates
    const allPlannedMuscles = new Set<string>();
    for (const tpl of templates) {
      for (const item of tpl.items) {
        if (item.exercise && item.exercise.muscleGroup) {
          allPlannedMuscles.add(item.exercise.muscleGroup);
        }
      }
    }

    // Only muscles with > 0 sets count as trained
    const trainedMuscleList = Object.keys(trainedMuscles).filter((m) => trainedMuscles[m] > 0);

    // Pending muscles are those in planned templates that have NOT been trained yet this week
    const pendingMuscleList = [...allPlannedMuscles].filter((m) => !trainedMuscleList.includes(m));

    // --- Streaks ---
    const allHistoricalSessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
      take: 365, // Last year max
    });

    // Calculate daily streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (allHistoricalSessions.length > 0) {
      const uniqueDays = new Set<string>();
      for (const s of allHistoricalSessions) {
        uniqueDays.add(s.startedAt.toISOString().split('T')[0]);
      }

      const sortedDays = [...uniqueDays].sort().reverse();

      // Check if trained today or yesterday to start the streak
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (sortedDays[0] === today || sortedDays[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const curr = new Date(sortedDays[i - 1]);
          const prev = new Date(sortedDays[i]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      tempStreak = 1;
      const allSorted = [...uniqueDays].sort();
      for (let i = 1; i < allSorted.length; i++) {
        const curr = new Date(allSorted[i]);
        const prev = new Date(allSorted[i - 1]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }

    // Weekly consistency: how many consecutive weeks the user completed all planned days
    let weeksConsistent = 0;
    if (plannedDays > 0 && completedDays >= plannedDays) {
      weeksConsistent = 1;
      // Check previous weeks
      for (let w = 1; w <= 12; w++) {
        const wStart = new Date(weekStart);
        wStart.setDate(wStart.getDate() - 7 * w);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        const wSessions = await this.prisma.workoutSession.count({
          where: {
            userId,
            finishedAt: { not: null },
            startedAt: { gte: wStart, lte: wEnd },
          },
        });

        if (wSessions >= plannedDays) {
          weeksConsistent++;
        } else {
          break;
        }
      }
    }

    // --- Comparison with previous week ---
    const prevVolume = prevWeekSessions.reduce((a, s) => a + (s.totalVolume || 0), 0);
    const prevCalories = prevWeekSessions.reduce((a, s) => a + (s.caloriesBurned || 0), 0);

    const volumeChange = prevVolume > 0 ? parseFloat((((totalVolumeWeek - prevVolume) / prevVolume) * 100).toFixed(1)) : 0;
    const caloriesChange = prevCalories > 0 ? parseFloat((((totalCaloriesWeek - prevCalories) / prevCalories) * 100).toFixed(1)) : 0;
    const daysChange = thisWeekSessions.length - prevWeekSessions.length;

    // --- Daily Activity Breakdown (Actual Real Dates vs Planned) ---
    const dayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const dailyActivity = [];

    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + d);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOfWeekNum = dayStart.getDay(); // 0=Dom, 1=Seg...
      const label = dayLabels[dayOfWeekNum];

      const plannedTemplate = templates.find((t) => t.dayOfWeek === dayOfWeekNum);

      const daySessions = thisWeekSessions.filter((s) => {
        const sTime = new Date(s.startedAt).getTime();
        return sTime >= dayStart.getTime() && sTime <= dayEnd.getTime();
      });

      dailyActivity.push({
        dayOfWeek: dayOfWeekNum,
        dayLabel: label,
        date: dayStart.toISOString(),
        plannedTemplateName: plannedTemplate?.name || null,
        plannedTemplateId: plannedTemplate?.id || null,
        sessions: daySessions.map((s) => ({
          sessionId: s.id,
          templateId: s.templateId,
          templateName: s.title || plannedTemplate?.name || 'Treino',
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          durationMinutes: s.durationMinutes,
          totalVolume: s.totalVolume,
          caloriesBurned: s.caloriesBurned,
        })),
      });
    }

    return {
      weekStartDate: weekStart.toISOString(),
      weekEndDate: weekEnd.toISOString(),

      templateProgress,
      dailyActivity,

      summary: {
        plannedDays,
        completedDays,
        pendingDays,
        totalVolumeWeek: Math.round(totalVolumeWeek),
        totalCaloriesWeek: Math.round(totalCaloriesWeek),
        totalDurationMin: totalDurationWeek,
        avgDurationMin,
        avgRating,
      },

      muscleGroupCoverage: {
        trained: trainedMuscleList,
        pending: pendingMuscleList,
        setsPerGroup: trainedMuscles,
      },

      streaks: {
        currentStreak,
        longestStreak,
        weeklyGoalMet: plannedDays > 0 && completedDays >= plannedDays,
        weeksConsistent,
      },

      comparison: {
        volumeChange,
        caloriesChange,
        daysChange,
      },
    };
  }

  // ----------------------------------------------------
  // ANALYTICS FITNESS DASHBOARD COMPLETO
  // ----------------------------------------------------
  async getAnalytics(userId: string, rangeDays: number = 30) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - rangeDays);
    startDate.setHours(0, 0, 0, 0);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - rangeDays);

    // Sessions in target range
    const currentSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        startedAt: { gte: startDate, lte: now },
      },
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Sessions in previous comparison range
    const prevSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        startedAt: { gte: prevStartDate, lte: startDate },
      },
    });

    // 1. KPI Summaries & Comparisons
    const totalWorkouts = currentSessions.length;
    const totalVolume = currentSessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
    const totalCalories = currentSessions.reduce((acc, s) => acc + (s.caloriesBurned || 0), 0);
    const totalDurationMin = currentSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const avgDurationMin = totalWorkouts > 0 ? Math.round(totalDurationMin / totalWorkouts) : 0;

    const prevWorkouts = prevSessions.length;
    const prevVolume = prevSessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
    const prevCalories = prevSessions.reduce((acc, s) => acc + (s.caloriesBurned || 0), 0);

    const workoutsChange = prevWorkouts > 0 ? parseFloat((((totalWorkouts - prevWorkouts) / prevWorkouts) * 100).toFixed(1)) : 0;
    const volumeChange = prevVolume > 0 ? parseFloat((((totalVolume - prevVolume) / prevVolume) * 100).toFixed(1)) : 0;
    const caloriesChange = prevCalories > 0 ? parseFloat((((totalCalories - prevCalories) / prevCalories) * 100).toFixed(1)) : 0;

    // 2. Weekly Volume Bar Chart
    const weeklyVolumeMap: Record<string, { weekLabel: string; totalVolume: number; workoutsCount: number }> = {};
    for (const s of currentSessions) {
      const sDate = new Date(s.startedAt);
      const dayOfWeek = sDate.getDay();
      const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monDate = new Date(sDate);
      monDate.setDate(sDate.getDate() - diffToMon);
      const weekKey = `${monDate.getDate().toString().padStart(2, '0')}/${(monDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!weeklyVolumeMap[weekKey]) {
        weeklyVolumeMap[weekKey] = { weekLabel: `Sem. ${weekKey}`, totalVolume: 0, workoutsCount: 0 };
      }
      weeklyVolumeMap[weekKey].totalVolume += Math.round(s.totalVolume || 0);
      weeklyVolumeMap[weekKey].workoutsCount += 1;
    }
    const weeklyVolume = Object.values(weeklyVolumeMap);

    // 3. Exercise 1RM Progression (Top exercises by frequency)
    const exerciseUsageMap: Record<string, { id: string; namePt: string; count: number }> = {};
    const exerciseHistoryMap: Record<string, Array<{ date: string; estimated1RM: number; weight: number; reps: number }>> = {};

    for (const s of currentSessions) {
      const dateStr = new Date(s.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      for (const exItem of s.exercises) {
        if (!exItem.exercise) continue;
        const exId = exItem.exercise.id;
        const exName = exItem.exercise.namePt || exItem.exercise.name;

        if (!exerciseUsageMap[exId]) {
          exerciseUsageMap[exId] = { id: exId, namePt: exName, count: 0 };
          exerciseHistoryMap[exId] = [];
        }
        exerciseUsageMap[exId].count += 1;

        let best1RM = 0;
        let bestWeight = 0;
        let bestReps = 0;

        for (const set of exItem.sets) {
          const w = set.weight || 0;
          const r = set.reps || 0;
          if (w > 0 && r > 0) {
            const epley = w * (1 + r / 30);
            if (epley > best1RM) {
              best1RM = epley;
              bestWeight = w;
              bestReps = r;
            }
          }
        }

        if (best1RM > 0) {
          exerciseHistoryMap[exId].push({
            date: dateStr,
            estimated1RM: Math.round(best1RM * 10) / 10,
            weight: bestWeight,
            reps: bestReps,
          });
        }
      }
    }

    const topExercises = Object.values(exerciseUsageMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const exerciseProgress = topExercises.map((ex) => ({
      exerciseId: ex.id,
      namePt: ex.namePt,
      count: ex.count,
      history: exerciseHistoryMap[ex.id] || [],
    }));

    // 4. Muscle Radar Chart (Grouped into 6 primary body categories)
    const muscleCategoryMap: Record<string, string> = {
      PEITORAL_SUPERIOR: 'Peito', PEITORAL_MEDIAL: 'Peito', PEITORAL_INFERIOR: 'Peito', PEITO: 'Peito',
      DORSAL: 'Costas', COSTAS: 'Costas', TRAPEZIO: 'Costas',
      OMBRO_ANTERIOR: 'Ombros', OMBRO_LATERAL: 'Ombros', OMBRO_POSTERIOR: 'Ombros', OMBROS: 'Ombros',
      BICEPS: 'Braços', TRICEPS: 'Braços', ANTEBRACO: 'Braços', BRACOS: 'Braços',
      QUADRICEPS: 'Pernas', POSTERIOR_COXA: 'Pernas', GLUTEOS: 'Pernas', PANTURRILHA: 'Pernas', PERNAS: 'Pernas',
      ABDOMEN: 'Core', CORE: 'Core',
    };

    const radarStats: Record<string, { muscleCategory: string; sets: number; volume: number }> = {
      Peito: { muscleCategory: 'Peito', sets: 0, volume: 0 },
      Costas: { muscleCategory: 'Costas', sets: 0, volume: 0 },
      Ombros: { muscleCategory: 'Ombros', sets: 0, volume: 0 },
      Braços: { muscleCategory: 'Braços', sets: 0, volume: 0 },
      Pernas: { muscleCategory: 'Pernas', sets: 0, volume: 0 },
      Core: { muscleCategory: 'Core', sets: 0, volume: 0 },
    };

    for (const s of currentSessions) {
      for (const exItem of s.exercises) {
        if (!exItem.exercise) continue;
        const mg = exItem.exercise.muscleGroup || 'OUTROS';
        const category = muscleCategoryMap[mg] || 'Outros';

        if (radarStats[category]) {
          const completedSets = exItem.sets.filter((st) => st.isCompleted).length || exItem.sets.length;
          radarStats[category].sets += completedSets;

          for (const set of exItem.sets) {
            radarStats[category].volume += (set.weight || 0) * (set.reps || 0);
          }
        }
      }
    }

    const muscleRadar = Object.values(radarStats);

    // 5. Daily Heatmap (Frequency)
    const dailyMap: Record<string, { date: string; count: number; title?: string }> = {};

    for (let d = 0; d < rangeDays; d++) {
      const dDate = new Date(startDate);
      dDate.setDate(startDate.getDate() + d);
      const isoStr = dDate.toISOString().split('T')[0];
      dailyMap[isoStr] = { date: isoStr, count: 0 };
    }

    for (const s of currentSessions) {
      const isoStr = new Date(s.startedAt).toISOString().split('T')[0];
      if (dailyMap[isoStr]) {
        dailyMap[isoStr].count += 1;
        dailyMap[isoStr].title = s.title || 'Treino';
      }
    }

    const dailyHeatmap = Object.values(dailyMap);

    // 6. Personal Records (PRs)
    const allHistoricalSessions = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    const prMap: Record<string, { exerciseName: string; weight: number; reps: number; estimated1RM: number; date: string }> = {};

    for (const s of allHistoricalSessions) {
      const dStr = new Date(s.startedAt).toLocaleDateString('pt-BR');
      for (const exItem of s.exercises) {
        if (!exItem.exercise) continue;
        const exName = exItem.exercise.namePt || exItem.exercise.name;

        for (const set of exItem.sets) {
          const w = set.weight || 0;
          const r = set.reps || 0;
          if (w > 0 && r > 0) {
            const e1rm = Math.round(w * (1 + r / 30) * 10) / 10;
            if (!prMap[exName] || e1rm > prMap[exName].estimated1RM) {
              prMap[exName] = {
                exerciseName: exName,
                weight: w,
                reps: r,
                estimated1RM: e1rm,
                date: dStr,
              };
            }
          }
        }
      }
    }

    const personalRecords = Object.values(prMap)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 8);

    // 7. Session Trend (Calories & Duration Area Chart)
    const sessionTrend = currentSessions.map((s) => ({
      date: new Date(s.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      title: s.title || 'Treino',
      caloriesBurned: Math.round(s.caloriesBurned || 0),
      durationMinutes: s.durationMinutes || 0,
      totalVolume: Math.round(s.totalVolume || 0),
    }));

    // 8. Athlete Score (0-100 Gauge)
    const weeksInRange = Math.max(1, Math.round(rangeDays / 7));
    const targetWorkouts = weeksInRange * 4;
    const consistencyScore = Math.min(100, Math.round((totalWorkouts / targetWorkouts) * 100));

    const volumeScore = prevVolume > 0 ? Math.min(100, Math.max(20, Math.round(50 + volumeChange))) : 70;
    const frequencyScore = Math.min(100, Math.round((totalWorkouts / Math.max(1, rangeDays / 7 * 3)) * 100));
    const prScore = Math.min(100, Math.round(60 + personalRecords.length * 5));

    const athleteScore = Math.min(100, Math.round(
      consistencyScore * 0.35 +
      volumeScore * 0.25 +
      frequencyScore * 0.20 +
      prScore * 0.20
    ));

    return {
      rangeDays,
      kpis: {
        totalWorkouts,
        totalVolume: Math.round(totalVolume),
        totalCalories: Math.round(totalCalories),
        totalDurationMin,
        avgDurationMin,
        workoutsChange,
        volumeChange,
        caloriesChange,
      },
      weeklyVolume,
      exerciseProgress,
      muscleRadar,
      dailyHeatmap,
      personalRecords,
      sessionTrend,
      athleteScore: {
        score: athleteScore,
        consistencyScore,
        volumeScore,
        frequencyScore,
        prScore,
      },
    };
  }
}
