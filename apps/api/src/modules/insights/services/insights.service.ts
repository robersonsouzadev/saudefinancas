import { Injectable } from '@nestjs/common';

export interface InsightLog {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  dataPayload?: any;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
}

@Injectable()
export class InsightsService {
  private insights: InsightLog[] = [];

  async createInsight(data: Partial<InsightLog>): Promise<InsightLog> {
    const insight = {
      id: Math.random().toString(),
      isRead: false,
      isDismissed: false,
      createdAt: new Date(),
      ...data
    } as InsightLog;
    this.insights.push(insight);
    return insight;
  }

  async getInsights(userId: string): Promise<InsightLog[]> {
    return this.insights.filter(i => i.userId === userId && !i.isDismissed);
  }

  async markAsRead(id: string): Promise<InsightLog> {
    const idx = this.insights.findIndex(i => i.id === id);
    if (idx > -1) {
      this.insights[idx].isRead = true;
      return this.insights[idx];
    }
    throw new Error('Insight not found');
  }

  async dismissInsight(id: string): Promise<InsightLog> {
    const idx = this.insights.findIndex(i => i.id === id);
    if (idx > -1) {
      this.insights[idx].isDismissed = true;
      return this.insights[idx];
    }
    throw new Error('Insight not found');
  }
}
