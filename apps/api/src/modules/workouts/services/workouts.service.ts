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

    const finishedAt = new Date();
    const durationMinutes = Math.max(1, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / (1000 * 60)));

    // Calculate total volume (sum of completed sets weight * reps)
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
        if (s.isCompleted) {
          totalVolume += s.weight * s.reps;
        }
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
}
