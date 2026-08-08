import { Injectable } from '@nestjs/common';

export interface CalculatedBodyMetrics {
  bmi?: number;
  waistHeightRatio?: number;
  fatMassKg?: number;
  bodyFatPercent?: number;
  leanMassKg?: number;
  leanMassPercent?: number;
  skeletalMuscleMassKg?: number;
  skeletalMusclePercent?: number;
  muscleFatRatio?: number;
  cellularAgeDiff?: number;
}

@Injectable()
export class BodyAssessmentCalculatorService {
  /**
   * Completa e calcula todos os indicadores derivados de uma avaliação corporal
   */
  calculateDerivedMetrics(data: {
    weightKg: number;
    heightCm: number;
    waistCm?: number;
    fatMassKg?: number;
    bodyFatPercent?: number;
    leanMassKg?: number;
    leanMassPercent?: number;
    skeletalMuscleMassKg?: number;
    skeletalMusclePercent?: number;
    muscleFatRatio?: number;
    age?: number;
    cellularAge?: number;
  }): CalculatedBodyMetrics {
    const { weightKg, heightCm, waistCm, age, cellularAge } = data;
    let {
      fatMassKg,
      bodyFatPercent,
      leanMassKg,
      leanMassPercent,
      skeletalMuscleMassKg,
      skeletalMusclePercent,
      muscleFatRatio,
    } = data;

    const heightM = heightCm / 100;

    // 1. IMC = Peso / Altura²
    const bmi = heightM > 0 ? parseFloat((weightKg / (heightM * heightM)).toFixed(1)) : undefined;

    // 2. RCEst = Cintura / Altura
    const waistHeightRatio = waistCm && heightCm > 0
      ? parseFloat((waistCm / heightCm).toFixed(2))
      : undefined;

    // 3. Massa Gorda (kg ou %)
    if (fatMassKg === undefined || fatMassKg === null) {
      if (bodyFatPercent !== undefined && bodyFatPercent !== null) {
        fatMassKg = parseFloat(((weightKg * bodyFatPercent) / 100).toFixed(1));
      }
    } else if (bodyFatPercent === undefined || bodyFatPercent === null) {
      if (fatMassKg > 0 && weightKg > 0) {
        bodyFatPercent = parseFloat(((fatMassKg / weightKg) * 100).toFixed(1));
      }
    }

    // 4. Massa Magra (kg ou %)
    if (leanMassKg === undefined || leanMassKg === null) {
      if (fatMassKg !== undefined && fatMassKg !== null) {
        leanMassKg = parseFloat((weightKg - fatMassKg).toFixed(1));
      }
    }
    if ((leanMassPercent === undefined || leanMassPercent === null) && leanMassKg && weightKg > 0) {
      leanMassPercent = parseFloat(((leanMassKg / weightKg) * 100).toFixed(1));
    }

    // 5. Percentual de Massa Muscular
    if ((skeletalMusclePercent === undefined || skeletalMusclePercent === null) && skeletalMuscleMassKg && weightKg > 0) {
      skeletalMusclePercent = parseFloat(((skeletalMuscleMassKg / weightKg) * 100).toFixed(1));
    }

    // 6. Relação Músculo / Gordura
    if ((muscleFatRatio === undefined || muscleFatRatio === null) && skeletalMuscleMassKg && fatMassKg && fatMassKg > 0) {
      muscleFatRatio = parseFloat((skeletalMuscleMassKg / fatMassKg).toFixed(2));
    }

    // 7. Diferença Idade Celular - Cronológica
    const cellularAgeDiff = cellularAge !== undefined && age !== undefined
      ? parseFloat((cellularAge - age).toFixed(1))
      : undefined;

    return {
      bmi,
      waistHeightRatio,
      fatMassKg,
      bodyFatPercent,
      leanMassKg,
      leanMassPercent,
      skeletalMuscleMassKg,
      skeletalMusclePercent,
      muscleFatRatio,
      cellularAgeDiff,
    };
  }

  /**
   * Calcula deltas (variações) em relação à avaliação anterior
   */
  calculateDeltas(current: any, previous: any) {
    if (!previous) return {};

    const diff = (a?: number, b?: number, decimals = 1) =>
      a !== undefined && a !== null && b !== undefined && b !== null
        ? parseFloat((a - b).toFixed(decimals))
        : undefined;

    return {
      deltaWeight: diff(current.weightKg, previous.weightKg),
      deltaFatPercent: diff(current.bodyFatPercent, previous.bodyFatPercent),
      deltaFatMass: diff(current.fatMassKg, previous.fatMassKg),
      deltaLeanMass: diff(current.leanMassKg, previous.leanMassKg),
      deltaMuscleMass: diff(current.skeletalMuscleMassKg, previous.skeletalMuscleMassKg),
      deltaWaist: diff(current.waistCm, previous.waistCm),
      deltaPhaseAngle: diff(current.phaseAngle, previous.phaseAngle),
      deltaIntracellularWater: diff(current.intracellularWaterL, previous.intracellularWaterL),
    };
  }

  /**
   * Calcula um Body Score de 0 a 100 baseado no equilíbrio da composição corporal
   */
  calculateBodyScore(assessment: any): number {
    let score = 70; // Pontuação base

    if (!assessment) return 70;

    // Gordura Corporal (ideal: homens 8-20%, mulheres 15-28%)
    const fat = assessment.bodyFatPercent;
    if (fat) {
      if (assessment.sex === 'MASCULINO') {
        if (fat >= 10 && fat <= 18) score += 10;
        else if (fat > 20) score -= Math.min(20, (fat - 20) * 1.5);
        else if (fat < 8) score -= 5;
      } else {
        if (fat >= 18 && fat <= 25) score += 10;
        else if (fat > 28) score -= Math.min(20, (fat - 28) * 1.5);
        else if (fat < 15) score -= 5;
      }
    }

    // Relação Cintura / Estatura (ideal < 0.50)
    const rcest = assessment.waistHeightRatio;
    if (rcest) {
      if (rcest <= 0.49) score += 10;
      else if (rcest >= 0.60) score -= 15;
      else if (rcest >= 0.53) score -= 8;
    }

    // Ângulo de Fase (ideal > 6.5°)
    const pa = assessment.phaseAngle;
    if (pa) {
      if (pa >= 7.5) score += 10;
      else if (pa >= 6.5) score += 5;
      else if (pa < 5.0) score -= 10;
    }

    // Relação Músculo / Gordura (ideal > 1.5)
    const mgr = assessment.muscleFatRatio;
    if (mgr) {
      if (mgr >= 1.8) score += 10;
      else if (mgr >= 1.4) score += 5;
      else if (mgr < 1.0) score -= 8;
    }

    return Math.max(10, Math.min(100, Math.round(score)));
  }
}
