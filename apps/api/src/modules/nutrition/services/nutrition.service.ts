import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TacoDatabaseService } from './taco-database.service';

export interface CreateMealDto {
  mealType: string; // BREAKFAST, LUNCH, DINNER, SNACK
  loggedAt?: string; // ISO String ou YYYY-MM-DD
  mealTime?: string; // HH:mm
  notes?: string;
  items: Array<{
    name: string;
    tacoId?: number;
    weightG?: number;
    calories: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    fiberG?: number;
    confidence?: number;
    isManual?: boolean;
  }>;
}

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(
    private prisma: PrismaService,
    private tacoService: TacoDatabaseService,
  ) {}

  /**
   * Retorna as refeições do usuário em uma data específica (default: hoje)
   */
  async getDailyMeals(userId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const meals = await this.prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        loggedAt: 'asc',
      },
    });

    return meals.map((m) => {
      const computedItems = m.items.map((it) => ({
        ...it,
        weightG: it.weightG ?? (it as any).weight_g ?? 100,
        calories: it.calories ?? 100,
        proteinG: it.proteinG ?? (it as any).protein_g ?? 0,
        carbsG: it.carbsG ?? (it as any).carbs_g ?? 0,
        fatG: it.fatG ?? (it as any).fat_g ?? 0,
      }));

      const itemCalories = computedItems.reduce((acc, i) => acc + (i.calories || 0), 0);
      const itemProtein = computedItems.reduce((acc, i) => acc + (i.proteinG || 0), 0);
      const itemCarbs = computedItems.reduce((acc, i) => acc + (i.carbsG || 0), 0);
      const itemFat = computedItems.reduce((acc, i) => acc + (i.fatG || 0), 0);

      return {
        ...m,
        totalCalories: m.totalCalories || Math.round(itemCalories),
        totalProtein: m.totalProtein || Math.round(itemProtein * 10) / 10,
        totalCarbs: m.totalCarbs || Math.round(itemCarbs * 10) / 10,
        totalFat: m.totalFat || Math.round(itemFat * 10) / 10,
        items: computedItems,
      };
    });
  }

  /**
   * Cria um registro ou rascunho de refeição
   */
  async createMealLog(userId: string, dto: CreateMealDto) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    const itemsData = dto.items.map((item) => {
      const c = item.calories || 0;
      const p = item.proteinG || 0;
      const carb = item.carbsG || 0;
      const f = item.fatG || 0;
      const fib = item.fiberG || 0;

      totalCalories += c;
      totalProtein += p;
      totalCarbs += carb;
      totalFat += f;
      totalFiber += fib;

      return {
        name: item.name,
        tacoId: item.tacoId || null,
        weightG: item.weightG || 100,
        calories: c,
        proteinG: p,
        carbsG: carb,
        fatG: f,
        fiberG: fib,
        confidence: item.confidence || 0.9,
        isManual: item.isManual || false,
      };
    });

    const mealLog = await this.prisma.mealLog.create({
      data: {
        userId,
        mealType: dto.mealType || 'SNACK',
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
        mealTime: dto.mealTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        notes: dto.notes,
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        totalFiber: Math.round(totalFiber * 10) / 10,
        confirmed: true,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return mealLog;
  }

  /**
   * Confirma e atualiza uma refeição após a tela de inspeção / revisão
   */
  async confirmMeal(userId: string, mealId: string, items: any[]) {
    const meal = await this.prisma.mealLog.findFirst({
      where: { id: mealId, userId },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');

    // Remove itens antigos e reinsere atualizados
    await this.prisma.mealItem.deleteMany({ where: { mealLogId: mealId } });

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    const newItemsData = items.map((item) => {
      const c = item.calories || 0;
      const p = item.proteinG || 0;
      const carb = item.carbsG || 0;
      const f = item.fatG || 0;
      const fib = item.fiberG || 0;

      totalCalories += c;
      totalProtein += p;
      totalCarbs += carb;
      totalFat += f;
      totalFiber += fib;

      return {
        mealLogId: mealId,
        name: item.name,
        tacoId: item.tacoId || null,
        weightG: item.weightG || 100,
        calories: c,
        proteinG: p,
        carbsG: carb,
        fatG: f,
        fiberG: fib,
        confidence: item.confidence || 1.0,
        isManual: item.isManual || false,
      };
    });

    await this.prisma.mealItem.createMany({ data: newItemsData });

    const updatedMeal = await this.prisma.mealLog.update({
      where: { id: mealId },
      data: {
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        totalFiber: Math.round(totalFiber * 10) / 10,
        confirmed: true,
      },
      include: { items: true },
    });

    return updatedMeal;
  }

  /**
   * Exclui uma refeição
   */
  async deleteMeal(userId: string, mealId: string) {
    const meal = await this.prisma.mealLog.findFirst({
      where: { id: mealId, userId },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');

    await this.prisma.mealLog.delete({ where: { id: mealId } });
    return { success: true, message: 'Refeição removida com sucesso' };
  }

  /**
   * Resumo nutricional diário (Consumo real vs Meta)
   */
  async getDailySummary(userId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    const meals = await this.prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { items: true },
    });

    let consumedCalories = 0;
    let consumedProtein = 0;
    let consumedCarbs = 0;
    let consumedFat = 0;
    let consumedFiber = 0;

    meals.forEach((m) => {
      consumedCalories += m.totalCalories || 0;
      consumedProtein += m.totalProtein || 0;
      consumedCarbs += m.totalCarbs || 0;
      consumedFat += m.totalFat || 0;
      consumedFiber += m.totalFiber || 0;
    });

    const goals = await this.getNutritionGoals(userId);

    return {
      date: startOfDay.toISOString().split('T')[0],
      mealsCount: meals.length,
      consumed: {
        calories: Math.round(consumedCalories),
        proteinG: Math.round(consumedProtein * 10) / 10,
        carbsG: Math.round(consumedCarbs * 10) / 10,
        fatG: Math.round(consumedFat * 10) / 10,
        fiberG: Math.round(consumedFiber * 10) / 10,
      },
      target: {
        calories: goals.targetCalories,
        proteinG: goals.targetProteinG,
        carbsG: goals.targetCarbsG,
        fatG: goals.targetFatG,
        fiberG: goals.targetFiberG || 25,
      },
      remaining: {
        calories: Math.max(0, goals.targetCalories - Math.round(consumedCalories)),
        proteinG: Math.max(0, Math.round((goals.targetProteinG - consumedProtein) * 10) / 10),
        carbsG: Math.max(0, Math.round((goals.targetCarbsG - consumedCarbs) * 10) / 10),
        fatG: Math.max(0, Math.round((goals.targetFatG - consumedFat) * 10) / 10),
      },
      percentages: {
        calories: Math.min(100, Math.round((consumedCalories / goals.targetCalories) * 100)),
        protein: Math.min(100, Math.round((consumedProtein / goals.targetProteinG) * 100)),
        carbs: Math.min(100, Math.round((consumedCarbs / goals.targetCarbsG) * 100)),
        fat: Math.min(100, Math.round((consumedFat / goals.targetFatG) * 100)),
      },
    };
  }

  /**
   * Resumo dos últimos 7 dias (médias calóricas e de macros)
   */
  async getWeeklySummary(userId: string) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const meals = await this.prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: sevenDaysAgo },
      },
    });

    const daysMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

    // Inicializar os últimos 7 dias
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    meals.forEach((m) => {
      const key = m.loggedAt.toISOString().split('T')[0];
      if (daysMap[key]) {
        daysMap[key].calories += m.totalCalories || 0;
        daysMap[key].protein += m.totalProtein || 0;
        daysMap[key].carbs += m.totalCarbs || 0;
        daysMap[key].fat += m.totalFat || 0;
      }
    });

    const daysList = Object.entries(daysMap).map(([date, val]) => ({
      date,
      calories: Math.round(val.calories),
      proteinG: Math.round(val.protein * 10) / 10,
      carbsG: Math.round(val.carbs * 10) / 10,
      fatG: Math.round(val.fat * 10) / 10,
    }));

    const avgCalories = Math.round(daysList.reduce((acc, d) => acc + d.calories, 0) / 7);

    return {
      days: daysList,
      averageCalories: avgCalories,
    };
  }

  /**
   * Retorna ou cria metas nutricionais padrão baseadas no perfil único do usuário
   */
  async getNutritionGoals(userId: string) {
    let goal = await this.prisma.nutritionGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      // Tenta buscar biometria centralizada mais recente
      const latestBody = await this.prisma.bodyMeasurement.findFirst({
        where: { userId },
        orderBy: { measuredAt: 'desc' },
      });

      const weight = latestBody?.weightKg || 75; // kg
      const height = 175; // cm
      const age = 30; // default anos
      const gender = 'M'; // default

      // Formula de Mifflin-St Jeor para Taxa Metabólica Basal (TMB)
      const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'M' ? 5 : -161);
      const tdee = bmr * 1.55; // Nível Moderado

      goal = await this.prisma.nutritionGoal.create({
        data: {
          userId,
          objectiveType: 'MAINTAIN',
          targetCalories: Math.round(tdee),
          targetProteinG: Math.round(weight * 2.0), // 2g por kg
          targetCarbsG: Math.round((tdee * 0.45) / 4), // 45% das calorias
          targetFatG: Math.round((tdee * 0.25) / 9), // 25% das calorias
          targetFiberG: 25,
          activityLevel: 'MODERATE',
        },
      });
    }

    return goal;
  }

  /**
   * Resumo de dias do mês selecionado para o Heatmap Mensal de Aderência
   */
  async getMonthlyCalendar(userId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const goals = await this.getNutritionGoals(userId);
    const targetCal = goals.targetCalories || 2200;

    const meals = await this.prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startDate, lte: endDate },
      },
    });

    const daysInMonth = endDate.getDate();
    const resultMap: Record<string, { calories: number; count: number }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      resultMap[dayStr] = { calories: 0, count: 0 };
    }

    meals.forEach((m) => {
      const dayStr = m.loggedAt.toISOString().split('T')[0];
      if (resultMap[dayStr]) {
        resultMap[dayStr].calories += m.totalCalories || 0;
        resultMap[dayStr].count += 1;
      }
    });

    return Object.entries(resultMap).map(([date, val]) => {
      const calories = Math.round(val.calories);
      const pct = Math.round((calories / targetCal) * 100);
      let status: 'empty' | 'below' | 'in_target' | 'above' = 'empty';
      if (val.count > 0) {
        if (pct >= 80 && pct <= 110) status = 'in_target';
        else if (pct > 110) status = 'above';
        else status = 'below';
      }

      return {
        date,
        calories,
        mealsCount: val.count,
        percentage: pct,
        status,
      };
    });
  }

  /**
   * IA Sugestões Inteligentes: Recomenda refeições baseadas nos macros restantes do dia
   */
  async getAiMealSuggestions(userId: string, dateStr?: string) {
    const summary = await this.getDailySummary(userId, dateStr);
    const rem = summary.remaining;

    const remCal = Math.max(0, rem.calories);
    const remProt = Math.max(0, rem.proteinG);
    const remCarbs = Math.max(0, rem.carbsG);
    const remFat = Math.max(0, rem.fatG);

    if (remCal <= 50) {
      return {
        message: 'Você já atingiu sua meta calórica de hoje! Excelente trabalho mantendo a disciplina.',
        suggestions: [],
      };
    }

    const suggestions = [
      {
        id: 'sug-1',
        title: 'Omelete Proteico com Queijo Minas',
        description: 'Ideal para bater a meta de proteínas sem estourar carboidratos.',
        targetMeal: remCal > 400 ? 'Jantar' : 'Lanche',
        estimatedCalories: Math.round(remCal * 0.7),
        proteinG: Math.round(Math.min(remProt, (remCal * 0.7 * 0.35) / 4)),
        carbsG: Math.round(Math.min(remCarbs, (remCal * 0.7 * 0.15) / 4)),
        fatG: Math.round(Math.min(remFat, (remCal * 0.7 * 0.5) / 9)),
        items: [
          { name: 'Ovos cozidos/mexidos', weightG: 120, calories: 180, proteinG: 15, carbsG: 1, fatG: 12 },
          { name: 'Queijo minas frescal', weightG: 50, calories: 130, proteinG: 9, carbsG: 2, fatG: 9 },
        ],
      },
      {
        id: 'sug-2',
        title: 'Iogurte Natural com Whey & Morangos',
        description: 'Refeição de alta densidade nutricional, rica em proteína e saciedade.',
        targetMeal: 'Lanche',
        estimatedCalories: Math.round(remCal * 0.5),
        proteinG: Math.round(Math.min(remProt, 28)),
        carbsG: Math.round(Math.min(remCarbs, 20)),
        fatG: Math.round(Math.min(remFat, 4)),
        items: [
          { name: 'Iogurte natural desnatado', weightG: 170, calories: 90, proteinG: 10, carbsG: 12, fatG: 0 },
          { name: 'Whey Protein Concentrado', weightG: 30, calories: 120, proteinG: 24, carbsG: 2, fatG: 2 },
          { name: 'Morango fresco', weightG: 100, calories: 32, proteinG: 1, carbsG: 7, fatG: 0 },
        ],
      },
      {
        id: 'sug-3',
        title: 'Grelhado com Batata Doce & Salada',
        description: 'Refeição completa e equilibrada para fechar o dia com energia limpa.',
        targetMeal: 'Jantar',
        estimatedCalories: Math.round(remCal * 0.85),
        proteinG: Math.round(remProt),
        carbsG: Math.round(remCarbs),
        fatG: Math.round(remFat),
        items: [
          { name: 'Peito de frango grelhado', weightG: 150, calories: 240, proteinG: 46, carbsG: 0, fatG: 5 },
          { name: 'Batata doce cozida', weightG: 120, calories: 103, proteinG: 2, carbsG: 24, fatG: 0 },
          { name: 'Salada de tomate e alface', weightG: 100, calories: 20, proteinG: 1, carbsG: 4, fatG: 0 },
        ],
      },
    ];

    return {
      message: `Encontramos 3 opções personalizadas pela IA para cobrir os seus ${remCal} kcal restantes (${remProt}g P | ${remCarbs}g C | ${remFat}g G):`,
      suggestions,
    };
  }

  /**
   * Atualização manual de metas pelo usuário em configurações
   */
  async updateNutritionGoals(userId: string, data: any) {
    const goal = await this.prisma.nutritionGoal.upsert({
      where: { userId },
      update: {
        objectiveType: data.objectiveType,
        targetCalories: data.targetCalories ? parseInt(data.targetCalories) : undefined,
        targetProteinG: data.targetProteinG ? parseInt(data.targetProteinG) : undefined,
        targetCarbsG: data.targetCarbsG ? parseInt(data.targetCarbsG) : undefined,
        targetFatG: data.targetFatG ? parseInt(data.targetFatG) : undefined,
        targetFiberG: data.targetFiberG ? parseInt(data.targetFiberG) : undefined,
        activityLevel: data.activityLevel,
      },
      create: {
        userId,
        objectiveType: data.objectiveType || 'MAINTAIN',
        targetCalories: data.targetCalories ? parseInt(data.targetCalories) : 2200,
        targetProteinG: data.targetProteinG ? parseInt(data.targetProteinG) : 140,
        targetCarbsG: data.targetCarbsG ? parseInt(data.targetCarbsG) : 250,
        targetFatG: data.targetFatG ? parseInt(data.targetFatG) : 65,
        targetFiberG: data.targetFiberG ? parseInt(data.targetFiberG) : 25,
        activityLevel: data.activityLevel || 'MODERATE',
      },
    });

    return goal;
  }
}
