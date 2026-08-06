import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class IntakeDispatcherService {
  private readonly logger = new Logger(IntakeDispatcherService.name);

  constructor(private prisma: PrismaService) {}

  async dispatch(userId: string, classifiedData: any): Promise<any> {
    try {
      this.logger.log(`Dispatching intent ${classifiedData.primary_intent} for user ${userId}`);
      const intent = classifiedData.primary_intent;
      const registeredItems = [];

      if (intent === 'FINANCE' || intent === 'HYBRID') {
        if (classifiedData.finance_data?.transactions?.length > 0) {
          // Find or create default financial account
          let account = await this.prisma.financialAccount.findFirst({
            where: { userId },
          });

          if (!account) {
            account = await this.prisma.financialAccount.create({
              data: {
                userId,
                name: 'Conta Principal',
                type: 'CHECKING',
                balance: 0,
              },
            });
          }

          for (const tx of classifiedData.finance_data.transactions) {
            const transaction = await this.prisma.transaction.create({
              data: {
                userId,
                accountId: account.id,
                amount: tx.amount,
                description: tx.description,
                type: 'EXPENSE',
                category: tx.category || 'Outros',
                date: new Date(),
              },
            });
            registeredItems.push({ type: 'FINANCE', id: transaction.id, description: tx.description });
          }
        }
      }

      if (intent === 'NUTRITION' || intent === 'HYBRID') {
        if (classifiedData.nutrition_data) {
          const mealType = classifiedData.nutrition_data.meal_type || 'SNACK';
          
          const mealLog = await this.prisma.mealLog.create({
            data: {
              userId,
              mealType,
              date: new Date(),
              totalCalories: classifiedData.nutrition_data.total_calories || 0,
              items: {
                create: (classifiedData.nutrition_data.items || []).map(item => ({
                  name: item.name,
                  weightG: item.weight_g || 0,
                  calories: item.calories || 0,
                  proteinG: item.protein_g || 0,
                  carbsG: item.carbs_g || 0,
                  fatG: item.fat_g || 0,
                })),
              },
            },
          });
          registeredItems.push({ type: 'NUTRITION', id: mealLog.id, mealType });
        }
      }

      if (intent === 'HEALTH') {
        const healthLog = await this.prisma.healthLog.create({
          data: {
            userId,
            date: new Date(),
            notes: 'Registro criado via assistente',
          },
        });
        registeredItems.push({ type: 'HEALTH', id: healthLog.id });
      }

      if (intent === 'MEDICATION') {
        const medicationLog = await this.prisma.medicationIntakeLog.create({
          data: {
            userId,
            takenAt: new Date(),
            status: 'TAKEN',
            notes: 'Registrado via assistente',
          },
        });
        registeredItems.push({ type: 'MEDICATION', id: medicationLog.id });
      }

      return {
        intent: classifiedData.primary_intent,
        registeredItems,
        vitaInsight: classifiedData.vita_insight,
      };
    } catch (error) {
      this.logger.error('Error dispatching intake data', error);
      throw error;
    }
  }
}
