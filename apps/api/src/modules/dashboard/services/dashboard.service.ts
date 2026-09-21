import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InsightsService } from '../../insights/services/insights.service';
import { DailySummaryService } from '../../insights/services/daily-summary.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
    private readonly dailySummaryService: DailySummaryService,
  ) {}

  async getDashboardSummary(userId: string) {
    const activeInsights = await this.insightsService.getInsights(userId);
    const dailySummary = await this.dailySummaryService.generateDailySummary(userId, new Date());

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Refeições e Metas Nutricionais do Dia
    const mealsToday = await this.prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let consumedCalories = 0;
    let consumedCarbs = 0;
    let consumedProtein = 0;
    let consumedFat = 0;

    mealsToday.forEach((m) => {
      consumedCalories += m.totalCalories || 0;
      consumedCarbs += m.totalCarbs || 0;
      consumedProtein += m.totalProtein || 0;
      consumedFat += m.totalFat || 0;
    });

    const nutritionGoal = await this.prisma.nutritionGoal.findUnique({ where: { userId } });

    // 2. Log de Hábitos do Dia (Sono, Água, Humor)
    const todayLog = await this.prisma.dailyHealthLog.findUnique({
      where: { userId_date: { userId, date: startOfDay } },
    });

    // 3. Ofensiva / Streak
    const streak = await this.prisma.healthStreak.findUnique({ where: { userId } });

    // 4. Treinos: Último treino e templates da semana
    const [recentWorkout, templates] = await Promise.all([
      this.prisma.workoutSession.findFirst({
        where: { userId, finishedAt: { not: null } },
        orderBy: { finishedAt: 'desc' },
        include: { template: true },
      }),
      this.prisma.workoutTemplate.findMany({
        where: { userId, isActive: true },
        orderBy: { dayOfWeek: 'asc' },
        include: { items: { include: { exercise: true } } },
      }),
    ]);

    // 5. Medicamentos do dia
    const todayStr = new Date().toISOString().split('T')[0];
    const medications = await this.prisma.medication.findMany({
      where: { userId, isActive: true },
      include: {
        schedules: true,
        intakeLogs: {
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        },
      },
    });

    const medsSummary = medications.map((m) => {
      const sched = m.schedules[0];
      const log = m.intakeLogs[0];
      return {
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        time: sched?.time || '08:00',
        status: log ? log.status : 'PENDENTE',
        color: m.color,
      };
    });

    // 6. Última Avaliação Corporal
    const latestAssessment = await this.prisma.bodyAssessment.findFirst({
      where: { userId },
      orderBy: { assessmentDate: 'desc' },
    });

    // 7. Cálculo do Score de Vitalidade Integrado (0-100)
    let vitalityScore = 75;
    if (todayLog) {
      if (todayLog.vitalityScore) {
        vitalityScore = Math.round(todayLog.vitalityScore);
      } else {
        const sleepPts = Math.min(30, ((todayLog.sleepHours || 7) / 8) * 30);
        const waterGoal = todayLog.waterGoalMl || 2500;
        const waterPts = Math.min(30, (todayLog.waterIntakeMl / waterGoal) * 30);
        const moodPts = ((todayLog.moodScore || 4) / 5) * 40;
        vitalityScore = Math.round(sleepPts + waterPts + moodPts);
      }
    }

    return {
      vitalityScore,
      streak: {
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        shieldsRemaining: streak?.shieldsRemaining ?? 1,
      },
      nutrition: {
        consumedCalories: Math.round(consumedCalories),
        targetCalories: nutritionGoal?.targetCalories || 2200,
        consumedProtein: Math.round(consumedProtein),
        targetProtein: nutritionGoal?.targetProteinG || 140,
        consumedCarbs: Math.round(consumedCarbs),
        targetCarbs: nutritionGoal?.targetCarbsG || 250,
        consumedFat: Math.round(consumedFat),
        targetFat: nutritionGoal?.targetFatG || 65,
        mealsCount: mealsToday.length,
      },
      habits: {
        sleepHours: todayLog?.sleepHours || null,
        sleepQuality: todayLog?.sleepQuality || null,
        waterIntakeMl: todayLog?.waterIntakeMl || 0,
        waterGoalMl: todayLog?.waterGoalMl || 2500,
        moodScore: todayLog?.moodScore || null,
        stressLevel: todayLog?.stressLevel || null,
        energyLevel: todayLog?.energyLevel || null,
      },
      workouts: {
        recentWorkout: recentWorkout
          ? {
              id: recentWorkout.id,
              title: recentWorkout.title || recentWorkout.template?.name || 'Treino Concluído',
              finishedAt: recentWorkout.finishedAt,
              durationMinutes: recentWorkout.durationMinutes,
              caloriesBurned: recentWorkout.caloriesBurned,
              totalVolume: recentWorkout.totalVolume,
            }
          : null,
        activeTemplatesCount: templates.length,
      },
      medications: medsSummary,
      bodyComposition: latestAssessment
        ? {
            weightKg: latestAssessment.weightKg,
            bodyFatPercent: latestAssessment.bodyFatPercent,
            skeletalMuscleMassKg: latestAssessment.skeletalMuscleMassKg,
            bmi: latestAssessment.bmi,
            assessmentDate: latestAssessment.assessmentDate,
          }
        : null,
      insights: activeInsights,
      dailySummary,
    };
  }
}
