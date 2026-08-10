import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BodyMeasurementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra uma nova medição corporal para o usuário
   */
  async createMeasurement(userId: string, data: any) {
    const measuredAt = data.measuredAt ? new Date(data.measuredAt) : new Date();

    return this.prisma.bodyMeasurement.create({
      data: {
        userId,
        measuredAt,
        weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
        bodyFatPercent: data.bodyFatPercent ? parseFloat(data.bodyFatPercent) : null,
        waistCm: data.waistCm ? parseFloat(data.waistCm) : null,
        hipCm: data.hipCm ? parseFloat(data.hipCm) : null,
        chestCm: data.chestCm ? parseFloat(data.chestCm) : null,
        neckCm: data.neckCm ? parseFloat(data.neckCm) : null,
        shoulderCm: data.shoulderCm ? parseFloat(data.shoulderCm) : null,
        abdomenCm: data.abdomenCm ? parseFloat(data.abdomenCm) : null,
        leftBicepCm: data.leftBicepCm ? parseFloat(data.leftBicepCm) : null,
        rightBicepCm: data.rightBicepCm ? parseFloat(data.rightBicepCm) : null,
        leftForearmCm: data.leftForearmCm ? parseFloat(data.leftForearmCm) : null,
        rightForearmCm: data.rightForearmCm ? parseFloat(data.rightForearmCm) : null,
        leftThighCm: data.leftThighCm ? parseFloat(data.leftThighCm) : null,
        rightThighCm: data.rightThighCm ? parseFloat(data.rightThighCm) : null,
        leftCalfCm: data.leftCalfCm ? parseFloat(data.leftCalfCm) : null,
        rightCalfCm: data.rightCalfCm ? parseFloat(data.rightCalfCm) : null,
        notes: data.notes || null,
      },
    });
  }

  /**
   * Lista o histórico de medições corporais do usuário
   */
  async listMeasurements(userId: string, limit = 50) {
    return this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retorna a medição mais recente do usuário
   */
  async getLatestMeasurement(userId: string) {
    return this.prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });
  }

  /**
   * Exclui um registro de medição
   */
  async deleteMeasurement(userId: string, id: string) {
    const item = await this.prisma.bodyMeasurement.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Medição corporal não encontrada');

    return this.prisma.bodyMeasurement.delete({ where: { id } });
  }

  /**
   * Calcula a idade exata em anos a partir da data de nascimento
   */
  calculateAge(birthDate?: Date | string | null): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Calcula o IMC (Índice de Massa Corporal) e sua classificação OMS
   */
  calculateBMI(weightKg?: number | null, heightCm?: number | null) {
    if (!weightKg || !heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    let classification = 'Normal';
    let statusColor = '#4ade80'; // verde

    if (bmi < 18.5) {
      classification = 'Abaixo do peso';
      statusColor = '#60a5fa'; // azul
    } else if (bmi >= 18.5 && bmi < 25.0) {
      classification = 'Peso normal';
      statusColor = '#4ade80'; // verde
    } else if (bmi >= 25.0 && bmi < 30.0) {
      classification = 'Sobrepeso';
      statusColor = '#facc15'; // amarelo
    } else if (bmi >= 30.0 && bmi < 35.0) {
      classification = 'Obesidade Grau I';
      statusColor = '#fb923c'; // laranja
    } else if (bmi >= 35.0 && bmi < 40.0) {
      classification = 'Obesidade Grau II';
      statusColor = '#f87171'; // vermelho
    } else {
      classification = 'Obesidade Grau III';
      statusColor = '#ef4444'; // vermelho escuro
    }

    return { bmi, classification, statusColor };
  }

  /**
   * Calcula a Taxa Metabólica Basal (TMB) usando Harris-Benedict revisada
   */
  calculateBMR(weightKg?: number | null, heightCm?: number | null, age?: number | null, sex?: string | null) {
    if (!weightKg || !heightCm || !age) return null;

    let bmr = 0;
    if (sex === 'FEMININO') {
      bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
    } else {
      // Padrão ou MASCULINO
      bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
    }

    return Math.round(bmr);
  }

  /**
   * Calcula a Relação Cintura/Quadril (RCQ) e risco cardiovascular
   */
  calculateWaistToHipRatio(waistCm?: number | null, hipCm?: number | null, sex?: string | null) {
    if (!waistCm || !hipCm || hipCm <= 0) return null;
    const ratio = parseFloat((waistCm / hipCm).toFixed(2));

    const isMale = sex !== 'FEMININO';
    let risk = 'Baixo';

    if (isMale) {
      if (ratio > 1.0) risk = 'Alto';
      else if (ratio > 0.95) risk = 'Moderado';
    } else {
      if (ratio > 0.85) risk = 'Alto';
      else if (ratio > 0.80) risk = 'Moderado';
    }

    return { ratio, risk };
  }

  /**
   * Retorna o perfil completo de saúde do usuário com cálculos e histórico
   */
  async getHealthProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappPhone: true,
        birthDate: true,
        biologicalSex: true,
        heightCm: true,
        avatarUrl: true,
        uazapiInstance: true,
        uazapiToken: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Buscar as 2 medições mais recentes para calcular variações (deltas)
    const measurements = await this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      take: 2,
    });

    const latest = measurements[0] || null;
    const previous = measurements[1] || null;

    const age = this.calculateAge(user.birthDate);
    const bmiData = this.calculateBMI(latest?.weightKg, user.heightCm);
    const bmr = this.calculateBMR(latest?.weightKg, user.heightCm, age, user.biologicalSex);
    const waistToHip = this.calculateWaistToHipRatio(latest?.waistCm, latest?.hipCm, user.biologicalSex);

    // Deltas de evolução
    const deltas: Record<string, number | null> = {};
    if (latest && previous) {
      const keys = [
        'weightKg', 'bodyFatPercent', 'waistCm', 'hipCm', 'chestCm',
        'rightBicepCm', 'leftBicepCm', 'rightThighCm', 'leftThighCm',
        'rightCalfCm', 'leftCalfCm', 'abdomenCm',
      ];

      for (const key of keys) {
        const curr = (latest as any)[key];
        const prev = (previous as any)[key];
        if (curr != null && prev != null) {
          deltas[key] = parseFloat((curr - prev).toFixed(1));
        } else {
          deltas[key] = null;
        }
      }
    }

    return {
      user,
      age,
      latestMeasurement: latest,
      previousMeasurement: previous,
      bmi: bmiData,
      bmr,
      waistToHip,
      deltas,
    };
  }
}
