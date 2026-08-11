import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LabExamsService } from '../../lab-exams/services/lab-exams.service';

@Injectable()
export class IntakeDispatcherService {
  private readonly logger = new Logger(IntakeDispatcherService.name);

  constructor(
    private prisma: PrismaService,
    private labExamsService: LabExamsService,
  ) {}

  async dispatch(userId: string, classifiedData: any, mediaData?: { imageBase64?: string; mimeType?: string; skipAutoSave?: boolean }): Promise<any> {
    try {
      this.logger.log(`Dispatching intent ${classifiedData.primary_intent} for user ${userId}`);
      const intent = classifiedData.primary_intent || 'GENERAL';
      const registeredItems: Array<{ type: string; id: string; description?: string }> = [];

      // 1. FINANCE / HYBRID
      if ((intent === 'FINANCE' || intent === 'HYBRID') && !mediaData?.skipAutoSave) {
        if (classifiedData.finance_data?.transactions?.length > 0) {
          let account = await this.prisma.financialAccount.findFirst({
            where: { userId },
          });

          if (!account) {
            account = await this.prisma.financialAccount.create({
              data: {
                userId,
                name: 'Conta Principal',
                balance: 0,
              },
            });
          }

          for (const tx of classifiedData.finance_data.transactions) {
            const catName = tx.category || 'Outros';
            let category = await this.prisma.transactionCategory.findFirst({
              where: { name: catName },
            });

            if (!category) {
              category = await this.prisma.transactionCategory.create({
                data: { name: catName },
              });
            }

            const transaction = await this.prisma.transaction.create({
              data: {
                userId,
                accountId: account.id,
                categoryId: category.id,
                amount: Math.abs(parseFloat(tx.amount) || 0),
                description: tx.description || 'Despesa registrada via Vita',
                date: new Date(),
              },
            });
            registeredItems.push({ type: 'FINANCE', id: transaction.id, description: tx.description });
          }
        }
      }

      // 2. NUTRITION / HYBRID
      if ((intent === 'NUTRITION' || intent === 'HYBRID') && !mediaData?.skipAutoSave) {
        if (classifiedData.nutrition_data) {
          const nut = classifiedData.nutrition_data;
          const items = nut.items || [];

          let totalCal = nut.total_calories ? parseFloat(nut.total_calories) : 0;
          let totalProt = 0;
          let totalCarb = 0;
          let totalFatG = 0;

          if (items.length > 0) {
            items.forEach((it: any) => {
              totalProt += parseFloat(it.protein_g || it.protein) || 0;
              totalCarb += parseFloat(it.carbs_g || it.carbs) || 0;
              totalFatG += parseFloat(it.fat_g || it.fat) || 0;
              if (!totalCal) totalCal += parseFloat(it.calories) || 0;
            });
          }

          const mealLog = await this.prisma.mealLog.create({
            data: {
              userId,
              mealType: nut.meal_type_code || 'SNACK',
              mealTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              totalCalories: Math.round(totalCal || 450),
              totalProtein: Math.round(totalProt * 10) / 10 || 30,
              totalCarbs: Math.round(totalCarb * 10) / 10 || 45,
              totalFat: Math.round(totalFatG * 10) / 10 || 12,
              confirmed: true,
              loggedAt: new Date(),
            },
          });

          if (items.length > 0) {
            for (const item of items) {
              await this.prisma.mealItem.create({
                data: {
                  mealLogId: mealLog.id,
                  name: item.name || 'Alimento',
                  weightG: item.weight_g ? parseFloat(item.weight_g) : 100,
                  calories: item.calories ? parseFloat(item.calories) : 150,
                  proteinG: item.protein_g ? parseFloat(item.protein_g) : 10,
                  carbsG: item.carbs_g ? parseFloat(item.carbs_g) : 20,
                  fatG: item.fat_g ? parseFloat(item.fat_g) : 5,
                  confidence: 0.95,
                },
              });
            }
          } else {
            await this.prisma.mealItem.create({
              data: {
                mealLogId: mealLog.id,
                name: nut.meal_type || 'Refeição Registrada',
                weightG: 250,
                calories: totalCal || 450,
                proteinG: 30,
                carbsG: 45,
                fatG: 12,
                confidence: 0.9,
              },
            });
          }
          registeredItems.push({ type: 'NUTRITION', id: mealLog.id, description: nut.meal_type || 'Refeição registrada' });
        }
      }

      // 3. HEALTH
      if (intent === 'HEALTH') {
        const healthLog = await this.prisma.healthLog.create({
          data: {
            userId,
            type: 'biometrics',
            value: 1.0,
            unit: 'registro',
            loggedAt: new Date(),
          },
        });
        registeredItems.push({ type: 'HEALTH', id: healthLog.id, description: 'Métrica de saúde' });
      }

      // 4. MEDICATION
      if (intent === 'MEDICATION') {
        const med = await this.prisma.medication.findFirst({ where: { userId } });
        if (med) {
          const medicationLog = await this.prisma.medicationIntakeLog.create({
            data: {
              medicationId: med.id,
              userId,
              scheduledAt: new Date(),
              loggedAt: new Date(),
              status: 'TOMADO',
            },
          });
          registeredItems.push({ type: 'MEDICATION', id: medicationLog.id, description: `Medicamento: ${med.name}` });
        }
      }

      // 5. LAB_EXAM
      if (intent === 'LAB_EXAM') {
        if (mediaData?.imageBase64 && mediaData?.mimeType) {
          this.logger.log('Delegating LAB_EXAM to LabExamsService');
          const result = await this.labExamsService.createExamFromOCR(
            userId, 
            mediaData.imageBase64, 
            mediaData.mimeType, 
            'Exame Laboratorial via Assistente'
          );
          registeredItems.push({ type: 'LAB_EXAM', id: result.exam.id, description: result.exam.title });
        } else {
          const examLog = await this.prisma.labExam.create({
            data: {
              userId,
              title: 'Exame de Sangue / Laboratorial',
              laboratory: 'Detectado via Vita IA',
              examDate: new Date(),
              aiProcessed: true,
              aiInsight: classifiedData.vita_insight || 'Laudo registrado com sucesso.',
            },
          });
          registeredItems.push({ type: 'LAB_EXAM', id: examLog.id, description: 'Laudo Laboratorial' });
        }
      }

      // 6. WORKOUT
      if (intent === 'WORKOUT') {
        const workoutLog = await this.prisma.workoutSession.findFirst({
          where: { userId, finishedAt: null },
        });
        registeredItems.push({
          type: 'WORKOUT',
          id: workoutLog?.id || 'workout',
          description: 'Consulta ao Coach Iron — Treinos Físicos',
        });
      }

      return {
        intent: classifiedData.primary_intent || 'GENERAL',
        registeredItems,
        nutrition_data: classifiedData.nutrition_data,
        items: classifiedData.nutrition_data?.items || [],
        vitaInsight: classifiedData.vita_insight || 'Mensagem processada com sucesso.',
      };
    } catch (error: any) {
      this.logger.error('Error dispatching intake data', error);
      return {
        intent: classifiedData?.primary_intent || 'GENERAL',
        registeredItems: [],
        vitaInsight: classifiedData?.vita_insight || 'Mensagem processada.',
      };
    }
  }
}
