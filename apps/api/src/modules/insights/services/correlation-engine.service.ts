import { Injectable } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Injectable()
export class CorrelationEngineService {
  constructor(private readonly insightsService: InsightsService) {}

  async analyzeCorrelations(userId: string) {
    // In a real application, this would fetch the last 30 days of HealthLogs and Transactions
    // from the respective services/repositories and run analytics or ML models to find correlations.
    
    // Simulated insights generation based on hardcoded rules/patterns
    
    const insightsToGenerate = [
      {
        userId,
        title: 'Sleep and Delivery Expenses',
        description: 'Você gasta 35% a mais com delivery quando dorme menos de 6 horas.',
        severity: 'medium' as const,
        dataPayload: { sleepThreshold: 6, expenseIncreasePercentage: 35, category: 'Food & Dining' }
      },
      {
        userId,
        title: 'Exercise and Stress Levels',
        description: 'Sua média de estresse cai 40% nos dias em que realiza exercícios físicos.',
        severity: 'low' as const,
        dataPayload: { stressReductionPercentage: 40, activityType: 'Exercise' }
      }
    ];

    const generated = [];
    for (const data of insightsToGenerate) {
      const insight = await this.insightsService.createInsight(data);
      generated.push(insight);
    }

    return generated;
  }
}
