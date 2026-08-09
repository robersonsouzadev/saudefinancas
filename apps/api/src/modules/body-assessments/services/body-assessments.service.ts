import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BodyAssessmentCalculatorService } from './body-assessment-calculator.service';

@Injectable()
export class BodyAssessmentsService {
  constructor(
    private prisma: PrismaService,
    private calculator: BodyAssessmentCalculatorService,
  ) {}

  /**
   * Criar nova avaliação corporal com cálculos automáticos e busca de avaliação anterior
   */
  async create(userId: string, dto: any) {
    // Buscar última avaliação do usuário para comparar
    const previous = await this.prisma.bodyAssessment.findFirst({
      where: { userId },
      orderBy: { assessmentDate: 'desc' },
    });

    // Buscar perfil do usuário para Sexo / Idade / Altura de fallback se necessário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { biologicalSex: true, birthDate: true, heightCm: true },
    });

    const sex = dto.sex || user?.biologicalSex || 'MASCULINO';
    const heightCm = dto.heightCm || user?.heightCm || 170;

    let age = dto.age;
    if (!age && user?.birthDate) {
      const birth = new Date(user.birthDate);
      const now = new Date(dto.assessmentDate || Date.now());
      age = now.getFullYear() - birth.getFullYear();
    }
    age = age || 30;

    // Calcular métricas derivadas
    const calculated = this.calculator.calculateDerivedMetrics({
      weightKg: dto.weightKg,
      heightCm,
      waistCm: dto.waistCm,
      fatMassKg: dto.fatMassKg,
      bodyFatPercent: dto.bodyFatPercent,
      leanMassKg: dto.leanMassKg,
      leanMassPercent: dto.leanMassPercent,
      skeletalMuscleMassKg: dto.skeletalMuscleMassKg,
      skeletalMusclePercent: dto.skeletalMusclePercent,
      muscleFatRatio: dto.muscleFatRatio,
      age,
      cellularAge: dto.cellularAge,
    });

    const currentMetrics = {
      ...dto,
      heightCm,
      age,
      sex,
      ...calculated,
    };

    // Calcular deltas
    const deltas = this.calculator.calculateDeltas(currentMetrics, previous);

    // Se solicitado, atualizar a altura padrão no perfil do usuário
    if (dto.updateUserProfileHeight && dto.heightCm) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { heightCm: dto.heightCm },
      });
    }

    const created = await this.prisma.bodyAssessment.create({
      data: {
        userId,
        assessmentDate: dto.assessmentDate ? new Date(dto.assessmentDate) : new Date(),
        assessorName: dto.assessorName,
        equipmentName: dto.equipmentName,
        notes: dto.notes,
        sourceType: dto.sourceType || 'MANUAL',

        weightKg: dto.weightKg,
        heightCm,
        age,
        sex,
        waistCm: dto.waistCm,

        fatMassKg: calculated.fatMassKg,
        bodyFatPercent: calculated.bodyFatPercent,
        leanMassKg: calculated.leanMassKg,
        leanMassPercent: calculated.leanMassPercent,
        skeletalMuscleMassKg: dto.skeletalMuscleMassKg,
        skeletalMusclePercent: calculated.skeletalMusclePercent,
        muscleFatRatio: calculated.muscleFatRatio,

        totalBodyWaterL: dto.totalBodyWaterL,
        totalBodyWaterPercent: dto.totalBodyWaterPercent,
        leanMassWaterPercent: dto.leanMassWaterPercent,
        hydrationIndex: dto.hydrationIndex,
        intracellularWaterL: dto.intracellularWaterL,
        intracellularWaterPercent: dto.intracellularWaterPercent,
        extracellularWaterL: dto.extracellularWaterL,
        extracellularWaterPercent: dto.extracellularWaterPercent,

        basalMetabolicRate: dto.basalMetabolicRate,
        phaseAngle: dto.phaseAngle,
        cellularAge: dto.cellularAge,

        bmi: calculated.bmi,
        waistHeightRatio: calculated.waistHeightRatio,

        previousAssessmentId: previous?.id,
        ...deltas,
      },
    });

    return created;
  }

  /**
   * Listar histórico de avaliações do usuário
   */
  async findAll(userId: string) {
    return this.prisma.bodyAssessment.findMany({
      where: { userId },
      orderBy: { assessmentDate: 'desc' },
    });
  }

  /**
   * Buscar última avaliação
   */
  async findLatest(userId: string) {
    return this.prisma.bodyAssessment.findFirst({
      where: { userId },
      orderBy: { assessmentDate: 'desc' },
    });
  }

  /**
   * Dados consolidados para o Dashboard
   */
  async getDashboardSummary(userId: string) {
    const assessments = await this.prisma.bodyAssessment.findMany({
      where: { userId },
      orderBy: { assessmentDate: 'desc' },
      take: 2,
    });

    if (assessments.length === 0) {
      return null;
    }

    const latest = assessments[0];
    const previous = assessments[1] || null;

    const bodyScore = this.calculator.calculateBodyScore(latest);
    const goals = await this.prisma.bodyAssessmentGoal.findMany({
      where: { userId, isActive: true },
    });

    return {
      latest,
      previous,
      bodyScore,
      totalAssessmentsCount: await this.prisma.bodyAssessment.count({ where: { userId } }),
      goals,
    };
  }

  /**
   * Dados de série temporal para gráficos
   */
  async getEvolutionSeries(userId: string) {
    const assessments = await this.prisma.bodyAssessment.findMany({
      where: { userId },
      orderBy: { assessmentDate: 'asc' },
    });

    return assessments.map((a) => ({
      id: a.id,
      date: a.assessmentDate.toISOString().split('T')[0],
      weightKg: a.weightKg,
      bodyFatPercent: a.bodyFatPercent,
      fatMassKg: a.fatMassKg,
      skeletalMuscleMassKg: a.skeletalMuscleMassKg,
      leanMassKg: a.leanMassKg,
      totalBodyWaterPercent: a.totalBodyWaterPercent,
      intracellularWaterL: a.intracellularWaterL,
      extracellularWaterL: a.extracellularWaterL,
      phaseAngle: a.phaseAngle,
      waistCm: a.waistCm,
      waistHeightRatio: a.waistHeightRatio,
      bmi: a.bmi,
      cellularAge: a.cellularAge,
      age: a.age,
    }));
  }

  /**
   * Comparação detalhada entre 2 avaliações (ou última vs anterior)
   */
  async compare(userId: string, id1?: string, id2?: string) {
    let a1: any;
    let a2: any;

    if (id1 && id2) {
      a1 = await this.prisma.bodyAssessment.findUnique({ where: { id: id1 } });
      a2 = await this.prisma.bodyAssessment.findUnique({ where: { id: id2 } });
    } else {
      const list = await this.prisma.bodyAssessment.findMany({
        where: { userId },
        orderBy: { assessmentDate: 'desc' },
        take: 2,
      });
      a2 = list[0]; // mais recente
      a1 = list[1]; // anterior
    }

    if (!a2) {
      throw new NotFoundException('Avaliação não encontrada para comparação.');
    }

    const deltas = this.calculator.calculateDeltas(a2, a1);

    return {
      previous: a1 || null,
      current: a2,
      deltas,
    };
  }

  /**
   * Buscar avaliação por ID
   */
  async findOne(userId: string, id: string) {
    const assessment = await this.prisma.bodyAssessment.findFirst({
      where: { id, userId },
    });
    if (!assessment) throw new NotFoundException('Avaliação não encontrada.');
    return assessment;
  }

  /**
   * Atualizar avaliação
   */
  async update(userId: string, id: string, dto: any) {
    await this.findOne(userId, id);
    return this.prisma.bodyAssessment.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Deletar avaliação
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.bodyAssessment.delete({
      where: { id },
    });
  }

  /**
   * CRUD Metas
   */
  async createGoal(userId: string, dto: any) {
    return this.prisma.bodyAssessmentGoal.create({
      data: {
        userId,
        indicator: dto.indicator,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        unit: dto.unit || 'kg',
        deadlineMonths: dto.deadlineMonths,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });
  }

  async findGoals(userId: string) {
    return this.prisma.bodyAssessmentGoal.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGoal(userId: string, id: string, dto: any) {
    return this.prisma.bodyAssessmentGoal.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGoal(userId: string, id: string) {
    return this.prisma.bodyAssessmentGoal.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
