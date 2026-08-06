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

  async dispatch(userId: string, classifiedData: any, mediaData?: { imageBase64: string; mimeType: string }): Promise<any> {
    try {
      this.logger.log(`Dispatching intent ${classifiedData.primary_intent} for user ${userId}`);
      const intent = classifiedData.primary_intent;
      const registeredItems: Array<{ type: string; id: string; description?: string }> = [];

      if (intent === 'FINANCE' || intent === 'HYBRID') {
        if (classifiedData.finance_data?.transactions?.length > 0) {
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
              } as any,
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
              } as any,
            });
            registeredItems.push({ type: 'FINANCE', id: transaction.id, description: tx.description });
          }
        }
      }

      if (intent === 'NUTRITION' || intent === 'HYBRID') {
        if (classifiedData.nutrition_data) {
          const mealLog = await this.prisma.mealLog.create({
            data: {
              userId,
              mealType: classifiedData.nutrition_data.meal_type,
              date: new Date(),
              totalCalories: classifiedData.nutrition_data.total_calories || 0,
              items: {
                create: (classifiedData.nutrition_data.items || []).map((item: any) => ({
                  name: item.name,
                  weightG: item.weight_g || 0,
                  calories: item.calories || 0,
                  proteinG: item.protein_g || 0,
                  carbsG: item.carbs_g || 0,
                  fatG: item.fat_g || 0,
                })),
              },
            } as any,
          });
          registeredItems.push({ type: 'NUTRITION', id: mealLog.id, description: 'Refeição registrada' });
        }
      }

      if (intent === 'HEALTH') {
        const healthLog = await this.prisma.healthLog.create({
          data: {
            userId,
            date: new Date(),
            notes: 'Registro criado via assistente',
          } as any,
        });
        registeredItems.push({ type: 'HEALTH', id: healthLog.id, description: 'Métrica de saúde' });
      }

      if (intent === 'MEDICATION') {
        // Find user's first medication or create log
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
