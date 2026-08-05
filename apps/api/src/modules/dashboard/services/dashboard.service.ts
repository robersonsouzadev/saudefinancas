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
    // Gather data from various services
    const financeOverview = await this.financeService.getFinancialOverview(userId, 'current_month');
    const recentTransactions = await this.financeService.getTransactions(userId);
    const activeInsights = await this.insightsService.getInsights(userId);
    const dailySummary = await this.dailySummaryService.generateDailySummary(userId, new Date());

    // Health data would ideally come from a HealthService, mocked here for dashboard completeness
    const recentHealthLogs = [
      { id: '1', type: 'sleep', value: '7 hours', date: new Date() },
      { id: '2', type: 'exercise', value: '30 mins running', date: new Date() }
    ];
    
    const calorieTracker = {
      consumed: dailySummary.metrics.caloriesConsumed,
      burned: dailySummary.metrics.caloriesBurned,
      target: 2000
    };

    return {
      scores: {
        wellbeing: dailySummary.wellbeingScore,
        financialHealth: dailySummary.financialHealthScore
      },
      finance: {
        overview: financeOverview,
        recentTransactions: recentTransactions.slice(0, 5), // Top 5 recent
        categoryChartData: Object.entries(financeOverview.categoryBreakdown).map(([category, amount]) => ({
          category,
          amount
        }))
      },
      health: {
        recentLogs: recentHealthLogs,
        calorieTracker
      },
      insights: activeInsights,
      dailySummary
    };
  }
}
