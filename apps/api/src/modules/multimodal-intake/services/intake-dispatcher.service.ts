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
      const intent = classifiedData.primary_intent || 'GENERAL';
      const registeredItems: Array<{ type: string; id: string; description?: string }> = [];

      // 1. FINANCE / HYBRID
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
      if (intent === 'NUTRITION' || intent === 'HYBRID') {
        if (classifiedData.nutrition_data) {
          const mealLog = await this.prisma.mealLog.create({
            data: {
              userId,
              loggedAt: new Date(),
            },
          });

          const items = classifiedData.nutrition_data.items || [];
          if (items.length > 0) {
            for (const item of items) {
              await this.prisma.mealItem.create({
                data: {
                  mealLogId: mealLog.id,
                  name: item.name || 'Alimento',
                  calories: item.calories ? parseFloat(item.calories) : null,
                },
              });
            }
          } else {
            await this.prisma.mealItem.create({
              data: {
                mealLogId: mealLog.id,
                name: classifiedData.nutrition_data.meal_type || 'Refeição',
                calories: classifiedData.nutrition_data.total_calories ? parseFloat(classifiedData.nutrition_data.total_calories) : null,
              },
            });
          }
          registeredItems.push({ type: 'NUTRITION', id: mealLog.id, description: 'Refeição registrada' });
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

      return {
        intent: classifiedData.primary_intent || 'GENERAL',
        registeredItems,
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
