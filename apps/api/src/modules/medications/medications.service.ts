import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserMedications(userId: string) {
    return this.prisma.medication.findMany({
      where: { userId, isActive: true },
      include: {
        schedules: true,
        intakeLogs: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMedicationById(id: string, userId: string) {
    const med = await this.prisma.medication.findFirst({
      where: { id, userId },
      include: { schedules: true, intakeLogs: true },
    });
    if (!med) throw new NotFoundException('Medicamento não encontrado');
    return med;
  }

  async createMedication(userId: string, data: {
    name: string;
    type?: any;
    category?: any;
    priority?: any;
    dosage: string;
    unit: string;
    instructions?: string;
    currentStock?: number;
    stockAlertAt?: number;
    costPerUnit?: number;
    pharmacy?: string;
    color?: string;
    notes?: string;
    schedules: Array<{
      time: string;
      windowMinutes?: number;
      period?: any;
      frequency?: any;
      notifyWhatsapp?: boolean;
      notifyPush?: boolean;
      escalateToFamily?: boolean;
      escalateAfterMin?: number;
    }>;
  }) {
    return this.prisma.medication.create({
      data: {
        userId,
        name: data.name,
        type: data.type || 'MEDICAMENTO',
        category: data.category || 'CONTINUO',
        priority: data.priority || 'IMPORTANTE',
        dosage: data.dosage,
        unit: data.unit,
        instructions: data.instructions,
        currentStock: data.currentStock ?? 30,
        stockAlertAt: data.stockAlertAt ?? 5,
        costPerUnit: data.costPerUnit,
        pharmacy: data.pharmacy,
        color: data.color || '#5e6ad2',
        notes: data.notes,
        schedules: {
          create: data.schedules.map((s) => ({
            time: s.time,
            windowMinutes: s.windowMinutes ?? 30,
            period: s.period || 'MANHA',
            frequency: s.frequency || 'DIARIO',
            notifyWhatsapp: s.notifyWhatsapp ?? true,
            notifyPush: s.notifyPush ?? true,
            escalateToFamily: s.escalateToFamily ?? false,
            escalateAfterMin: s.escalateAfterMin ?? 45,
          })),
        },
      },
      include: { schedules: true },
    });
  }

  async updateMedication(id: string, userId: string, data: Partial<{
    name: string;
    dosage: string;
    currentStock: number;
    costPerUnit: number;
    isActive: boolean;
  }>) {
    const med = await this.getMedicationById(id, userId);
    return this.prisma.medication.update({
      where: { id: med.id },
      data,
    });
  }

  async deleteMedication(id: string, userId: string) {
    const med = await this.getMedicationById(id, userId);
    return this.prisma.medication.update({
      where: { id: med.id },
      data: { isActive: false },
    });
  }

  async logIntake(medicationId: string, userId: string, status: 'TOMADO' | 'PULADO' | 'ATRASADO', skipReason?: string) {
    const med = await this.getMedicationById(medicationId, userId);

    if (status === 'TOMADO' && med.currentStock > 0) {
      await this.prisma.medication.update({
        where: { id: medicationId },
        data: { currentStock: med.currentStock - 1 },
      });
    }

    return this.prisma.medicationIntakeLog.create({
      data: {
        medicationId,
        userId,
        scheduledAt: new Date(),
        loggedAt: new Date(),
        status: status as any,
        skipReason,
        respondedVia: 'app',
      },
    });
  }

  async getAdherenceScore(userId: string) {
    const logs = await this.prisma.medicationIntakeLog.findMany({
      where: { userId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) return { score: 100, taken: 0, total: 0, text: 'Sem histórico ainda' };

    const taken = logs.filter((l) => l.status === 'TOMADO').length;
    const score = Math.round((taken / logs.length) * 100);

    return {
      score,
      taken,
      total: logs.length,
      text: score >= 90 ? 'Excelente' : score >= 75 ? 'Bom' : 'Atenção necessária',
    };
  }

  async getMonthlyCosts(userId: string) {
    const medications = await this.prisma.medication.findMany({
      where: { userId, isActive: true },
      include: { schedules: true },
    });

    let totalMonthlyCost = 0;
    const items = medications.map((med) => {
      const dailyDoses = med.schedules.length || 1;
      const monthlyDoses = dailyDoses * 30;
      const unitCost = med.costPerUnit || 0;
      const estimatedCost = monthlyDoses * unitCost;

      totalMonthlyCost += estimatedCost;

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        dailyDoses,
        unitCost,
        estimatedCost,
        currentStock: med.currentStock,
        stockAlert: med.currentStock <= med.stockAlertAt,
      };
    });

    return {
      totalMonthlyCost,
      medicationsCount: medications.length,
      items,
    };
  }
}
