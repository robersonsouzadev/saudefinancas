import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HealthTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truncar data para formato YYYY-MM-DD (UTC 00:00:00)
   */
  private truncateDate(dateInput?: Date | string): Date {
    const d = dateInput ? new Date(dateInput) : new Date();
    const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return utcDate;
  }

  /**
   * Calcular recomendação de água OMS (35ml por kg de peso)
   */
  async getOmsHydrationRecommendation(userId: string): Promise<number> {
    const latestMeasurement = await this.prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { heightCm: true },
    });

    const weightKg = latestMeasurement?.weightKg || 70; // 70kg fallback
    // OMS: 35ml por kg de peso corporal
    const recommendedMl = Math.round(weightKg * 35);
    return Math.max(1500, Math.min(4500, recommendedMl)); // Entre 1.5L e 4.5L
  }

  /**
   * Calcular Vitality Score (0 a 100)
   */
  private calculateVitalityScore(data: {
    sleepHours?: number | null;
    waterIntakeMl?: number | null;
    waterGoalMl?: number | null;
    moodScore?: number | null;
    energyLevel?: number | null;
    exerciseMinutes?: number | null;
  }): number {
    let score = 0;

    // 1. Sono (máx 30 pts)
    const sleep = data.sleepHours || 0;
    if (sleep >= 7.5 && sleep <= 9) score += 30;
    else if (sleep >= 6.5) score += 24;
    else if (sleep >= 5.5) score += 18;
    else if (sleep > 0) score += 10;

    // 2. Hidratação (máx 25 pts)
    const water = data.waterIntakeMl || 0;
    const goal = data.waterGoalMl || 2500;
    const waterPct = Math.min(1, water / goal);
    score += Math.round(waterPct * 25);

    // 3. Humor (máx 20 pts)
    const mood = data.moodScore || 0; // 1 a 5
    score += Math.round((mood / 5) * 20);

    // 4. Energia (máx 15 pts)
    const energy = data.energyLevel || 0; // 1 a 10
    score += Math.round((energy / 10) * 15);

    // 5. Exercício (máx 10 pts)
    const exercise = data.exerciseMinutes || 0;
    if (exercise >= 30) score += 10;
    else if (exercise > 0) score += Math.round((exercise / 30) * 10);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Buscar ou inicializar log de saúde de uma data específica
   */
  async getDailyLog(userId: string, dateInput?: string) {
    const targetDate = this.truncateDate(dateInput);

    let log = await this.prisma.dailyHealthLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    });

    const omsGoal = await this.getOmsHydrationRecommendation(userId);

    if (!log) {
      // Buscar configuracao de hidratacao
      const settings = await this.getHydrationSettings(userId);
      const goalMl = settings.useOmsCalculation ? omsGoal : settings.dailyGoalMl;

      log = await this.prisma.dailyHealthLog.create({
        data: {
          userId,
          date: targetDate,
          waterIntakeMl: 0,
          waterGoalMl: goalMl,
        },
      });
    }

    const streak = await this.getStreak(userId);

    return {
      log,
      omsRecommendationMl: omsGoal,
      streak,
    };
  }

  /**
   * Salvar/Atualizar log diário de saúde
   */
  async upsertDailyLog(userId: string, dateInput: string, data: any) {
    const targetDate = this.truncateDate(dateInput);
    const existing = await this.prisma.dailyHealthLog.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    });

    const waterGoalMl = data.waterGoalMl || existing?.waterGoalMl || 2500;
    const waterIntakeMl = data.waterIntakeMl !== undefined ? Number(data.waterIntakeMl) : (existing?.waterIntakeMl || 0);

    const vitalityScore = this.calculateVitalityScore({
      sleepHours: data.sleepHours !== undefined ? Number(data.sleepHours) : existing?.sleepHours,
      waterIntakeMl,
      waterGoalMl,
      moodScore: data.moodScore !== undefined ? Number(data.moodScore) : existing?.moodScore,
      energyLevel: data.energyLevel !== undefined ? Number(data.energyLevel) : existing?.energyLevel,
      exerciseMinutes: data.exerciseMinutes !== undefined ? Number(data.exerciseMinutes) : existing?.exerciseMinutes,
    });

    const updatedLog = await this.prisma.dailyHealthLog.upsert({
      where: { userId_date: { userId, date: targetDate } },
      create: {
        userId,
        date: targetDate,
        sleepHours: data.sleepHours != null ? parseFloat(data.sleepHours) : null,
        sleepQuality: data.sleepQuality != null ? parseInt(data.sleepQuality, 10) : null,
        bedTime: data.bedTime || null,
        wakeTime: data.wakeTime || null,
        sleepFactors: Array.isArray(data.sleepFactors) ? data.sleepFactors.join(',') : data.sleepFactors || null,
        waterIntakeMl,
        waterGoalMl,
        moodScore: data.moodScore != null ? parseInt(data.moodScore, 10) : null,
        moodTags: Array.isArray(data.moodTags) ? data.moodTags.join(',') : data.moodTags || null,
        energyLevel: data.energyLevel != null ? parseInt(data.energyLevel, 10) : null,
        stressLevel: data.stressLevel != null ? parseInt(data.stressLevel, 10) : null,
        exerciseMinutes: data.exerciseMinutes != null ? parseInt(data.exerciseMinutes, 10) : null,
        exerciseType: data.exerciseType || null,
        exerciseIntensity: data.exerciseIntensity || null,
        symptoms: Array.isArray(data.symptoms) ? data.symptoms.join(',') : data.symptoms || null,
        notes: data.notes || null,
        vitalityScore,
      },
      update: {
        sleepHours: data.sleepHours != null ? parseFloat(data.sleepHours) : undefined,
        sleepQuality: data.sleepQuality != null ? parseInt(data.sleepQuality, 10) : undefined,
        bedTime: data.bedTime !== undefined ? data.bedTime : undefined,
        wakeTime: data.wakeTime !== undefined ? data.wakeTime : undefined,
        sleepFactors: Array.isArray(data.sleepFactors) ? data.sleepFactors.join(',') : data.sleepFactors,
        waterIntakeMl,
        waterGoalMl,
        moodScore: data.moodScore != null ? parseInt(data.moodScore, 10) : undefined,
        moodTags: Array.isArray(data.moodTags) ? data.moodTags.join(',') : data.moodTags,
        energyLevel: data.energyLevel != null ? parseInt(data.energyLevel, 10) : undefined,
        stressLevel: data.stressLevel != null ? parseInt(data.stressLevel, 10) : undefined,
        exerciseMinutes: data.exerciseMinutes != null ? parseInt(data.exerciseMinutes, 10) : undefined,
        exerciseType: data.exerciseType !== undefined ? data.exerciseType : undefined,
        exerciseIntensity: data.exerciseIntensity !== undefined ? data.exerciseIntensity : undefined,
        symptoms: Array.isArray(data.symptoms) ? data.symptoms.join(',') : data.symptoms,
        notes: data.notes !== undefined ? data.notes : undefined,
        vitalityScore,
      },
    });

    // Atualizar Streak do usuário
    await this.updateStreak(userId, targetDate);

    return updatedLog;
  }

  /**
   * Adicionar consumo rápido de água (+200ml, +250ml, +350ml, +500ml)
   */
  async addWaterIntake(userId: string, amountMl: number, dateInput?: string) {
    const targetDate = this.truncateDate(dateInput);
    const existing = await this.prisma.dailyHealthLog.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    });

    const currentWater = existing?.waterIntakeMl || 0;
    const newWater = Math.max(0, currentWater + amountMl);
    const goalMl = existing?.waterGoalMl || 2500;

    const vitalityScore = this.calculateVitalityScore({
      sleepHours: existing?.sleepHours,
      waterIntakeMl: newWater,
      waterGoalMl: goalMl,
      moodScore: existing?.moodScore,
      energyLevel: existing?.energyLevel,
      exerciseMinutes: existing?.exerciseMinutes,
    });

    const updated = await this.prisma.dailyHealthLog.upsert({
      where: { userId_date: { userId, date: targetDate } },
      create: {
        userId,
        date: targetDate,
        waterIntakeMl: newWater,
        waterGoalMl: goalMl,
        vitalityScore,
      },
      update: {
        waterIntakeMl: newWater,
        vitalityScore,
      },
    });

    await this.updateStreak(userId, targetDate);
    return updated;
  }

  /**
   * Atualizar Sequência (Streak) do usuário
   */
  private async updateStreak(userId: string, logDate: Date) {
    let streak = await this.prisma.healthStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.healthStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastLogDate: logDate,
          shieldsRemaining: 1,
        },
      });
      return streak;
    }

    const last = streak.lastLogDate ? new Date(streak.lastLogDate) : null;
    if (!last) {
      return this.prisma.healthStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(1, streak.longestStreak),
          lastLogDate: logDate,
        },
      });
    }

    const diffDays = Math.round((logDate.getTime() - last.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) {
      // Mesmo dia, mantém streak
      return streak;
    } else if (diffDays === 1) {
      // Dia consecutivo! Incrementa
      const newStreak = streak.currentStreak + 1;
      return this.prisma.healthStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastLogDate: logDate,
        },
      });
    } else {
      // Quebrou a sequência
      if (streak.shieldsRemaining > 0) {
        // Usar escudo automaticamente!
        return this.prisma.healthStreak.update({
          where: { userId },
          data: {
            shieldsRemaining: streak.shieldsRemaining - 1,
            lastLogDate: logDate,
          },
        });
      } else {
        return this.prisma.healthStreak.update({
          where: { userId },
          data: {
            currentStreak: 1,
            lastLogDate: logDate,
          },
        });
      }
    }
  }

  /**
   * Buscar dados da sequência (Streak)
   */
  async getStreak(userId: string) {
    let streak = await this.prisma.healthStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.healthStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          shieldsRemaining: 1,
        },
      });
    }
    return streak;
  }

  /**
   * Usar Escudo de Saúde para congelar streak
   */
  async useShield(userId: string) {
    const streak = await this.getStreak(userId);
    if (streak.shieldsRemaining <= 0) {
      throw new Error('Você não possui escudos de saúde disponíveis nesta semana.');
    }

    return this.prisma.healthStreak.update({
      where: { userId },
      data: {
        shieldsRemaining: streak.shieldsRemaining - 1,
      },
    });
  }

  /**
   * Buscar dados para o Calendário de 14 Dias (últimos 14 dias)
   */
  async getCalendarRange(userId: string, daysCount = 14) {
    const endDate = this.truncateDate(new Date());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (daysCount - 1));

    const logs = await this.prisma.dailyHealthLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const logMap = new Map<string, any>();
    logs.forEach((log) => {
      const key = log.date.toISOString().split('T')[0];
      logMap.set(key, log);
    });

    const calendar = [];
    const curr = new Date(startDate);

    while (curr <= endDate) {
      const key = curr.toISOString().split('T')[0];
      const existing = logMap.get(key);

      calendar.push({
        date: key,
        dayOfWeek: curr.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3).toUpperCase(),
        dayNumber: curr.getDate(),
        isToday: key === endDate.toISOString().split('T')[0],
        hasLog: !!existing,
        vitalityScore: existing?.vitalityScore || 0,
        waterIntakeMl: existing?.waterIntakeMl || 0,
        waterGoalMl: existing?.waterGoalMl || 2500,
        sleepHours: existing?.sleepHours || 0,
        moodScore: existing?.moodScore || 0,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return calendar;
  }

  /**
   * Configurações de Hidratação
   */
  async getHydrationSettings(userId: string) {
    let settings = await this.prisma.hydrationSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      const omsGoal = await this.getOmsHydrationRecommendation(userId);
      settings = await this.prisma.hydrationSetting.create({
        data: {
          userId,
          dailyGoalMl: omsGoal,
          useOmsCalculation: true,
          reminderInterval: 90,
          startHour: 8,
          endHour: 21,
          notifyWhatsapp: true,
        },
      });
    }

    return settings;
  }

  /**
   * Atualizar configurações de Hidratação
   */
  async updateHydrationSettings(userId: string, data: any) {
    const existing = await this.getHydrationSettings(userId);

    return this.prisma.hydrationSetting.update({
      where: { userId },
      data: {
        dailyGoalMl: data.dailyGoalMl ? parseInt(data.dailyGoalMl, 10) : existing.dailyGoalMl,
        useOmsCalculation: data.useOmsCalculation !== undefined ? Boolean(data.useOmsCalculation) : existing.useOmsCalculation,
        reminderInterval: data.reminderInterval ? parseInt(data.reminderInterval, 10) : existing.reminderInterval,
        startHour: data.startHour !== undefined ? parseInt(data.startHour, 10) : existing.startHour,
        endHour: data.endHour !== undefined ? parseInt(data.endHour, 10) : existing.endHour,
        notifyWhatsapp: data.notifyWhatsapp !== undefined ? Boolean(data.notifyWhatsapp) : existing.notifyWhatsapp,
      },
    });
  }
}
