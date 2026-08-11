import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FinanceService } from '../../finance/services/finance.service';
import { InsightsService } from '../../insights/services/insights.service';
import { DailySummaryService } from '../../insights/services/daily-summary.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
    private readonly insightsService: InsightsService,
    private readonly dailySummaryService: DailySummaryService,
  ) {}

  async getDashboardSummary(userId: string) {
    const financeOverview = await this.financeService.getFinancialOverview(userId);
    const recentTransactions = await this.financeService.getTransactions(userId);
    const activeInsights = await this.insightsService.getInsights(userId);
    const dailySummary = await this.dailySummaryService.generateDailySummary(userId, new Date());

    // Busca refeições reais do dia no Prisma
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

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

    // Busca meta nutricional
    const goal = await this.prisma.nutritionGoal.findUnique({ where: { userId } });

    return {
      scores: {
        wellbeing: dailySummary.wellbeingScore,
        financialHealth: dailySummary.financialHealthScore,
      },
      finance: {
        overview: financeOverview,
        recentTransactions: recentTransactions.slice(0, 5),
        categoryChartData: Object.entries(financeOverview.categoryBreakdown || {}).map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      health: {
        recentLogs: [],
        calorieTracker: {
          consumed: Math.round(consumedCalories),
          burned: dailySummary.metrics?.caloriesBurned || 0,
          target: goal?.targetCalories || 2200,
          carbsG: Math.round(consumedCarbs),
          proteinG: Math.round(consumedProtein),
          fatG: Math.round(consumedFat),
          targetCarbsG: goal?.targetCarbsG || 250,
          targetProteinG: goal?.targetProteinG || 140,
          targetFatG: goal?.targetFatG || 65,
        },
      },
      insights: activeInsights,
      dailySummary,
    };
  }
}
