import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------
  // EXERCÍCIOS
  // ----------------------------------------------------
  // ----------------------------------------------------
  // EXERCÍCIOS
  // ----------------------------------------------------
  async listExercises(userId: string, muscleGroup?: string, search?: string) {
    // Auto-seed exercises if table is empty
    const count = await this.prisma.exercise.count();
    if (count === 0) {
      await this.autoSeedExercises();
    }

    const whereClause: any = {
      OR: [
        { isCustom: false },
        { userId },
      ],
    };

    if (muscleGroup && muscleGroup !== 'ALL') {
      whereClause.muscleGroup = muscleGroup;
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

    return this.prisma.exercise.findMany({
      where: whereClause,
      orderBy: { namePt: 'asc' },
    });
  }

  private async autoSeedExercises() {
    const defaultExercises = [
      { namePt: 'Supino Reto com Barra', nameEn: 'Barbell Bench Press', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Tríceps, Deltoide Anterior', equipment: 'BARBELL', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg' },
      { namePt: 'Supino Inclinado com Halteres', nameEn: 'Incline Dumbbell Press', muscleGroup: 'PEITORAL_SUPERIOR', secondaryMuscle: 'Deltoide Anterior, Tríceps', equipment: 'DUMBBELL', metValue: 5.5, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Bench_Press/0.jpg' },
      { namePt: 'Flexão de Braço', nameEn: 'Push-up', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Tríceps, Core', equipment: 'BODYWEIGHT', metValue: 5.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-up/0.jpg' },
      { namePt: 'Puxada Frontal Aberta', nameEn: 'Wide Lat Pulldown', muscleGroup: 'DORSAL', secondaryMuscle: 'Bíceps, Deltoide Posterior', equipment: 'CABLE', metValue: 5.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg' },
      { namePt: 'Remada Curvada com Barra', nameEn: 'Bent-Over Barbell Row', muscleGroup: 'DORSAL', secondaryMuscle: 'Trapézio, Bíceps, Lombar', equipment: 'BARBELL', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Row/0.jpg' },
      { namePt: 'Barra Fixa Pronada', nameEn: 'Pull-up', muscleGroup: 'DORSAL', secondaryMuscle: 'Bíceps, Core', equipment: 'BODYWEIGHT', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull-up/0.jpg' },
      { namePt: 'Desenvolvimento Militar com Barra', nameEn: 'Overhead Military Press', muscleGroup: 'OMBRO_ANTERIOR', secondaryMuscle: 'Deltoide Lateral, Tríceps', equipment: 'BARBELL', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg' },
      { namePt: 'Elevação Lateral com Halteres', nameEn: 'Dumbbell Lateral Raise', muscleGroup: 'OMBRO_LATERAL', secondaryMuscle: 'Trapézio', equipment: 'DUMBBELL', metValue: 4.5, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lateral_Raise/0.jpg' },
      { namePt: 'Rosca Direta com Barra W', nameEn: 'EZ-Bar Biceps Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Antebraço', equipment: 'BARBELL', metValue: 4.5, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-bar_Curl/0.jpg' },
      { namePt: 'Rosca Martelo', nameEn: 'Dumbbell Hammer Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Braquiorradial', equipment: 'DUMBBELL', metValue: 4.5, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Hammer_Curl/0.jpg' },
      { namePt: 'Tríceps Pulley na Corda', nameEn: 'Rope Pushdown', muscleGroup: 'TRICEPS', secondaryMuscle: 'Antebraço', equipment: 'CABLE', metValue: 4.5, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg' },
      { namePt: 'Agachamento Livre com Barra', nameEn: 'Barbell Back Squat', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos, Isquiotibiais', equipment: 'BARBELL', metValue: 7.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg' },
      { namePt: 'Leg Press 45°', nameEn: '45° Leg Press', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos', equipment: 'MACHINE', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg' },
      { namePt: 'Stiff com Barra', nameEn: 'Barbell Stiff Leg Deadlift', muscleGroup: 'POSTERIOR_COXA', secondaryMuscle: 'Glúteos, Lombar', equipment: 'BARBELL', metValue: 6.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/0.jpg' },
      { namePt: 'Abdominal Supra no Solo', nameEn: 'Abdominal Crunch', muscleGroup: 'ABDOMEN', secondaryMuscle: 'Nenhum', equipment: 'BODYWEIGHT', metValue: 4.0, gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunch/0.jpg' },
    ];

    for (const ex of defaultExercises) {
      await this.prisma.exercise.create({
        data: {
          name: `${ex.namePt} (${ex.nameEn})`,
          namePt: ex.namePt,
          nameEn: ex.nameEn,
          muscleGroup: ex.muscleGroup,
          secondaryMuscle: ex.secondaryMuscle,
          equipment: ex.equipment,
          metValue: ex.metValue,
          gifUrl: ex.gifUrl,
          instructions: `Execução correta de ${ex.namePt}. Mantenha a postura e expire na fase concêntrica.`,
        },
      });
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
