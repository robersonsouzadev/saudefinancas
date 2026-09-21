import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InsightsService } from './insights.service';

@Injectable()
export class CorrelationEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
  ) {}

  async analyzeCorrelations(userId: string) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [healthLogs, workouts, meals] = await Promise.all([
      this.prisma.dailyHealthLog.findMany({
        where: { userId, date: { gte: fourteenDaysAgo } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.workoutSession.findMany({
        where: { userId, startedAt: { gte: fourteenDaysAgo }, finishedAt: { not: null } },
      }),
      this.prisma.mealLog.findMany({
        where: { userId, loggedAt: { gte: fourteenDaysAgo } },
      }),
    ]);

    const generated = [];

    // 1. Correlação Sono x Energia / Estresse
    const poorSleepDays = healthLogs.filter((l) => l.sleepHours !== null && (l.sleepHours || 0) < 6.5);
    if (poorSleepDays.length > 0) {
      const avgStressPoorSleep =
        poorSleepDays.reduce((sum, l) => sum + (l.stressLevel || 3), 0) / poorSleepDays.length;
      
      const insight = await this.insightsService.createInsight({
        userId,
        title: 'Privação de Sono e Estresse Biológico',
        description: `Em dias com menos de 6h30 de sono, seu nível médio de estresse sobe para ${avgStressPoorSleep.toFixed(1)}/5 e a energia percebida cai. Priorizar uma rotina noturna consistente reduzirá o cortisol matinal.`,
        severity: avgStressPoorSleep >= 3.5 ? 'high' : 'medium',
        dataPayload: { poorSleepCount: poorSleepDays.length, avgStress: avgStressPoorSleep },
      });
      generated.push(insight);
    } else {
      const insight = await this.insightsService.createInsight({
        userId,
        title: 'Sono Restaurador e Otimização Hormonal',
        description: 'Seu padrão de sono nas últimas duas semanas manteve uma média protetora acima de 7 horas, favorecendo a recuperação muscular e a produção de GH.',
        severity: 'low',
        dataPayload: { status: 'OPTIMAL' },
      });
      generated.push(insight);
    }

    // 2. Correlação Treino x Vitalidade
    if (workouts.length >= 3) {
      const totalVolumeKg = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
      const insight = await this.insightsService.createInsight({
        userId,
        title: 'Frequência de Treinos e Volume Acumulado',
        description: `Você completou ${workouts.length} sessões nos últimos 14 dias, acumulando mais de ${Math.round(totalVolumeKg).toLocaleString('pt-BR')} kg de volume total de carga. Essa adesão mantém seu metabolismo basal elevado.`,
        severity: 'low',
        dataPayload: { workoutsCount: workouts.length, totalVolumeKg },
      });
      generated.push(insight);
    }

    // 3. Hidratação x Performance
    const lowWaterDays = healthLogs.filter((l) => l.waterIntakeMl > 0 && l.waterIntakeMl < (l.waterGoalMl * 0.7));
    if (lowWaterDays.length > 0) {
      const insight = await this.insightsService.createInsight({
        userId,
        title: 'Déficit Hídrico Intermitente',
        description: `Em ${lowWaterDays.length} dias nos últimos 14 dias sua ingestão hídrica ficou abaixo de 70% da meta. A hidratação adequada é o fator número 1 para evitar fadiga muscular e retenção celular.`,
        severity: 'medium',
        dataPayload: { lowWaterDays: lowWaterDays.length },
      });
      generated.push(insight);
    }

    return generated;
  }
}
