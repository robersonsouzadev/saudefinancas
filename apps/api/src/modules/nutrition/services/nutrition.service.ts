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

    return meals;
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
