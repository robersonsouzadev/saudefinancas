import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DRE (Demonstração do Resultado do Exercício)
   * Suporta Regime de Competência (baseado em competenceDate dos títulos) e Regime de Caixa (baixas e transações pagas)
   */
  async getDRE(userId: string, year: number, month: number, regime: 'COMPETENCE' | 'CASH' = 'COMPETENCE') {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    if (regime === 'COMPETENCE') {
      // Regime de Competência: Títulos gerados com competenceDate no mês
      const titles = await this.prisma.financialTitle.findMany({
        where: {
          userId,
          competenceDate: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        include: { category: true, costCenter: true },
      });

      let grossRevenue = 0; // Receita Bruta (RECEIVABLE)
      let grossExpense = 0; // Custos/Despesas (PAYABLE)

      const revenueByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};
      const expenseByCostCenter: Record<string, number> = {};

      for (const title of titles) {
        const catName = title.category?.name || 'Outros';
        const ccName = title.costCenter?.name || 'Sem Centro de Custo';

        if (title.type === 'RECEIVABLE') {
          grossRevenue += title.originalAmount;
          revenueByCategory[catName] = (revenueByCategory[catName] || 0) + title.originalAmount;
        } else {
          grossExpense += title.originalAmount;
          expenseByCategory[catName] = (expenseByCategory[catName] || 0) + title.originalAmount;
          expenseByCostCenter[ccName] = (expenseByCostCenter[ccName] || 0) + title.originalAmount;
        }
      }

      const netIncome = grossRevenue - grossExpense;

      return {
        year,
        month,
        regime: 'COMPETENCE',
        summary: {
          grossRevenue,
          grossExpense,
          netIncome,
          marginPercent: grossRevenue > 0 ? ((netIncome / grossRevenue) * 100).toFixed(2) : 0,
        },
        revenueByCategory,
        expenseByCategory,
        expenseByCostCenter,
      };
    } else {
      // Regime de Caixa: Transações pagas e Baixas efetuadas no mês
      const transactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        include: { category: true, costCenter: true },
      });

      let grossRevenue = 0;
      let grossExpense = 0;

      const revenueByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      for (const tx of transactions) {
        const catName = tx.category?.name || 'Outros';
        if (tx.type === 'INCOME') {
          grossRevenue += tx.amount;
          revenueByCategory[catName] = (revenueByCategory[catName] || 0) + tx.amount;
        } else if (tx.type === 'EXPENSE') {
          grossExpense += tx.amount;
          expenseByCategory[catName] = (expenseByCategory[catName] || 0) + tx.amount;
        }
      }

      const netIncome = grossRevenue - grossExpense;

      return {
        year,
        month,
        regime: 'CASH',
        summary: {
          grossRevenue,
          grossExpense,
          netIncome,
          marginPercent: grossRevenue > 0 ? ((netIncome / grossRevenue) * 100).toFixed(2) : 0,
        },
        revenueByCategory,
        expenseByCategory,
      };
    }
  }

  /**
   * Fluxo de Caixa Dual (Projetado vs Realizado)
   */
  async getCashFlowForecast(userId: string, days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Busca saldo atual das contas
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { userId, isActive: true },
    });
    const currentBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    // Títulos a Pagar/Receber no período
    const titles = await this.prisma.financialTitle.findMany({
      where: {
        userId,
        dueDate: { gte: today, lte: endDate },
        status: { in: ['OPEN', 'DUE_TODAY', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
    });

    const dailyForecastMap: Record<string, { date: string; inflow: number; outflow: number; projectedBalance: number }> = {};

    let cumulativeBalance = currentBalance;

    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const dayTitles = titles.filter((t) => {
        const titleDueStr = new Date(t.dueDate).toISOString().split('T')[0];
        return titleDueStr === dateStr;
      });

      let inflow = 0;
      let outflow = 0;

      for (const t of dayTitles) {
        const remaining = (t.originalAmount - (t.discountAmount || 0) + (t.interestAmount || 0)) - t.paidAmount;
        if (t.type === 'RECEIVABLE') inflow += remaining;
        else outflow += remaining;
      }

      cumulativeBalance += inflow - outflow;

      dailyForecastMap[dateStr] = {
        date: dateStr,
        inflow,
        outflow,
        projectedBalance: cumulativeBalance,
      };
    }

    return {
      currentBalance,
      projectedEndBalance: cumulativeBalance,
      days,
      timeline: Object.values(dailyForecastMap),
    };
  }

  /**
   * Score de Saúde Financeira (0-100)
   */
  async getFinancialHealthScore(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Saldo Total
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { userId, isActive: true },
    });
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    // Títulos em Atraso (Overdue)
    const overdueTitles = await this.prisma.financialTitle.findMany({
      where: { userId, status: 'OVERDUE' },
    });
    const totalOverdueAmount = overdueTitles.reduce((acc, t) => acc + (t.originalAmount - t.paidAmount), 0);

    // Receitas e Despesas do Mês Atual
    const monthTransactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: firstDayOfMonth } },
    });

    const monthIncome = monthTransactions.filter((t) => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const monthExpense = monthTransactions.filter((t) => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

    // Cálculo do Score (0-100)
    let score = 70; // Pontuação base

    // Fator 1: Liquidez (Saldo positivo atrai pontos)
    if (totalBalance > 5000) score += 15;
    else if (totalBalance > 1000) score += 5;
    else if (totalBalance < 0) score -= 20;

    // Fator 2: Inadimplência (Títulos atrasados tiram pontos)
    if (totalOverdueAmount === 0) score += 10;
    else if (totalOverdueAmount > 1000) score -= 25;
    else score -= 10;

    // Fator 3: Taxa de Poupança (Receita > Despesa)
    if (monthIncome > 0) {
      const savingsRatio = (monthIncome - monthExpense) / monthIncome;
      if (savingsRatio >= 0.2) score += 15; // economizando 20%+
      else if (savingsRatio < 0) score -= 15; // gastando mais do que ganha
    }

    score = Math.max(0, Math.min(100, score));

    let statusLabel = 'EXCELENTE';
    if (score < 40) statusLabel = 'CRÍTICO';
    else if (score < 65) statusLabel = 'ATENÇÃO';
    else if (score < 85) statusLabel = 'BOM';

    return {
      score,
      statusLabel,
      metrics: {
        totalBalance,
        totalOverdueAmount,
        overdueCount: overdueTitles.length,
        monthIncome,
        monthExpense,
        savingsRate: monthIncome > 0 ? (((monthIncome - monthExpense) / monthIncome) * 100).toFixed(1) + '%' : '0%',
      },
    };
  }
}
