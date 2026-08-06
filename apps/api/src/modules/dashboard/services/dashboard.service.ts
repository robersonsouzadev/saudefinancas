import { Injectable } from '@nestjs/common';
import { FinanceService } from '../../finance/services/finance.service';
import { InsightsService } from '../../insights/services/insights.service';
import { DailySummaryService } from '../../insights/services/daily-summary.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly financeService: FinanceService,
    private readonly insightsService: InsightsService,
    private readonly dailySummaryService: DailySummaryService,
  ) {}

  async getDashboardSummary(userId: string) {
    const financeOverview = await this.financeService.getFinancialOverview(userId);
    const recentTransactions = await this.financeService.getTransactions(userId);
    const activeInsights = await this.insightsService.getInsights(userId);
    const dailySummary = await this.dailySummaryService.generateDailySummary(userId, new Date());

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
          consumed: dailySummary.metrics?.caloriesConsumed || 0,
          burned: dailySummary.metrics?.caloriesBurned || 0,
          target: 2200,
        },
      },
      insights: activeInsights,
      dailySummary,
    };
  }
}
