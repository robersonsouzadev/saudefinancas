import { INDICATOR_CONFIGS } from './body-constants';

export interface GoalProgressResult {
  currentValue: number;
  targetValue: number;
  startValue: number;
  progressPercent: number;
  remaining: number;
  isHigherBetter: boolean;
  isAchieved: boolean;
  unit: string;
}

export interface VelocityResult {
  monthlyRate: number; // ex: -1.2 (% ou kg por mês)
  weeklyRate: number;
  isMovingTowardsGoal: boolean;
}

export interface TimeToGoalEstimate {
  estimatedMonths: number | null; // ex: 3.5 meses
  estimatedWeeks: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEVER';
  description: string;
}

export interface GoalStatus {
  code: 'ACHIEVED' | 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'AT_RISK';
  label: string;
  color: string;
  bg: string;
  borderColor: string;
}

/**
 * Calcula o progresso percentual de uma meta
 */
export function calculateGoalProgress(
  currentValue: number,
  startValue: number,
  targetValue: number,
  isHigherBetter: boolean,
  unit: string = ''
): GoalProgressResult {
  if (startValue === targetValue) {
    const isAchieved = isHigherBetter ? currentValue >= targetValue : currentValue <= targetValue;
    return {
      currentValue,
      targetValue,
      startValue,
      progressPercent: isAchieved ? 100 : 0,
      remaining: 0,
      isHigherBetter,
      isAchieved,
      unit,
    };
  }

  let totalDistance = Math.abs(targetValue - startValue);
  let distanceCovered = isHigherBetter
    ? currentValue - startValue
    : startValue - currentValue;

  let rawPercent = (distanceCovered / totalDistance) * 100;
  let progressPercent = Math.max(0, Math.min(100, Math.round(rawPercent)));

  let remaining = Math.max(0, parseFloat(Math.abs(targetValue - currentValue).toFixed(1)));
  let isAchieved = isHigherBetter ? currentValue >= targetValue : currentValue <= targetValue;

  if (isAchieved) {
    progressPercent = 100;
    remaining = 0;
  }

  return {
    currentValue,
    targetValue,
    startValue,
    progressPercent,
    remaining,
    isHigherBetter,
    isAchieved,
    unit,
  };
}

/**
 * Calcula a velocidade histórica de mudança de um indicador baseada nos últimos exames
 */
export function calculateVelocity(
  assessments: any[],
  indicator: string,
  targetValue: number,
  isHigherBetter: boolean
): VelocityResult {
  if (!assessments || assessments.length < 2) {
    return { monthlyRate: 0, weeklyRate: 0, isMovingTowardsGoal: false };
  }

  const sorted = [...assessments].sort(
    (a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const firstVal = first[indicator];
  const lastVal = last[indicator];

  if (firstVal == null || lastVal == null) {
    return { monthlyRate: 0, weeklyRate: 0, isMovingTowardsGoal: false };
  }

  const d1 = new Date(first.assessmentDate).getTime();
  const d2 = new Date(last.assessmentDate).getTime();

  const diffDays = Math.max(7, (d2 - d1) / (1000 * 60 * 60 * 24));
  const diffMonths = Math.max(0.25, diffDays / 30.4375);
  const diffWeeks = Math.max(1, diffDays / 7);

  const valDiff = lastVal - firstVal;
  const monthlyRate = parseFloat((valDiff / diffMonths).toFixed(2));
  const weeklyRate = parseFloat((valDiff / diffWeeks).toFixed(2));

  const isMovingTowardsGoal = isHigherBetter ? monthlyRate > 0 : monthlyRate < 0;

  return {
    monthlyRate,
    weeklyRate,
    isMovingTowardsGoal,
  };
}

/**
 * Estima o tempo necessário para atingir a meta (ETG - Estimated Time to Goal)
 */
export function estimateTimeToGoal(
  remaining: number,
  monthlyRate: number,
  isHigherBetter: boolean,
  deadlineMonths?: number | null
): TimeToGoalEstimate {
  if (remaining <= 0) {
    return {
      estimatedMonths: 0,
      estimatedWeeks: 0,
      confidence: 'HIGH',
      description: 'Meta Atingida!',
    };
  }

  const isMovingCorrectly = isHigherBetter ? monthlyRate > 0 : monthlyRate < 0;

  if (!isMovingCorrectly || Math.abs(monthlyRate) < 0.01) {
    return {
      estimatedMonths: null,
      estimatedWeeks: null,
      confidence: 'NEVER',
      description: 'Sem ritmo em direção à meta',
    };
  }

  const absRate = Math.abs(monthlyRate);
  const months = parseFloat((remaining / absRate).toFixed(1));
  const weeks = Math.round(months * 4.33);

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (months <= 3) confidence = 'HIGH';
  else if (months > 12) confidence = 'LOW';

  let description = `~${months} ${months === 1 ? 'mês' : 'meses'}`;
  if (deadlineMonths && deadlineMonths > 0) {
    if (months <= deadlineMonths) {
      description += ` (No prazo de ${deadlineMonths}m)`;
    } else {
      description += ` (Atrás do prazo de ${deadlineMonths}m)`;
    }
  }

  return {
    estimatedMonths: months,
    estimatedWeeks: weeks,
    confidence,
    description,
  };
}

/**
 * Retorna o status visual e classificação da meta
 */
export function getGoalStatus(
  progressPercent: number,
  isAchieved: boolean,
  velocity: VelocityResult,
  deadlineMonths?: number | null
): GoalStatus {
  if (isAchieved || progressPercent >= 100) {
    return {
      code: 'ACHIEVED',
      label: '🎉 Meta Atingida!',
      color: '#4ade80',
      bg: '#4ade8015',
      borderColor: '#4ade8040',
    };
  }

  if (velocity.isMovingTowardsGoal) {
    if (progressPercent >= 75) {
      return {
        code: 'AHEAD',
        label: '🚀 Reta Final',
        color: '#60a5fa',
        bg: '#60a5fa15',
        borderColor: '#60a5fa40',
      };
    }
    return {
      code: 'ON_TRACK',
      label: '🟢 No Ritmo',
      color: '#4ade80',
      bg: '#4ade8015',
      borderColor: '#4ade8040',
    };
  }

  if (progressPercent > 0) {
    return {
      code: 'BEHIND',
      label: '🟡 Ritmo Lento',
      color: '#fbbf24',
      bg: '#fbbf2415',
      borderColor: '#fbbf2440',
    };
  }

  return {
    code: 'AT_RISK',
    label: '🔴 Fora do Ritmo',
    color: '#f87171',
    bg: '#f8717115',
    borderColor: '#f8717140',
  };
}

/**
 * Gera dicas contextuais inteligentes baseadas no indicador e progresso
 */
export function getGoalTip(
  indicator: string,
  statusCode: string,
  velocity: VelocityResult,
  progressPercent: number
): string {
  if (statusCode === 'ACHIEVED') {
    return 'Excelente conquista! Mantenha a consistência na sua rotina para consolidar os resultados.';
  }

  const conf = INDICATOR_CONFIGS[indicator];
  const name = conf?.name || indicator;

  switch (indicator) {
    case 'bodyFatPercent':
    case 'fatMassKg':
      if (statusCode === 'ON_TRACK' || statusCode === 'AHEAD') {
        return 'Ótimo ritmo de perda lipídica. Mantenha proteína adequada (1.8-2.2g/kg) para preservar massa magra.';
      }
      return 'Para acelerar a perda de gordura, garanta um déficit calórico sustentável e adicione 20-30 min de cardio pós-treino.';

    case 'skeletalMuscleMassKg':
    case 'leanMassKg':
      if (statusCode === 'ON_TRACK' || statusCode === 'AHEAD') {
        return 'Excelente progresso muscular! Garanta progressão contínua de cargas e 7-9h de sono reparador.';
      }
      return 'Para estimular hipertrofia, aumente a densidade do treino, consuma 2g/kg de proteína e revise a hidratação.';

    case 'waistCm':
    case 'waistHeightRatio':
      if (statusCode === 'ON_TRACK' || statusCode === 'AHEAD') {
        return 'Redução da circunferência abdominal é o melhor indicador de queda no risco cardiometabólico.';
      }
      return 'Foque em alimentos in natura com baixo índice glicêmico e evite ultraprocessados para reduzir gordura visceral.';

    case 'totalBodyWaterPercent':
    case 'hydrationIndex':
      return 'Garanta ingestão hídrica de 35-45 ml por kg de peso corporal ao longo do dia para otimizar o ecossistema celular.';

    case 'phaseAngle':
      return 'O ângulo de fase reflete integridade de membrana. Mantenha boa ingestão de Ômega-3 e antioxidantes na dieta.';

    default:
      if (velocity.isMovingTowardsGoal) {
        return `Você está no caminho certo para atingir sua meta de ${name}. Mantenha o plano!`;
      }
      return `Revise seus hábitos diários de treino e nutrição para acelerar o progresso em ${name}.`;
  }
}

/**
 * Retorna lista de milestones (25%, 50%, 75%, 100%)
 */
export function getMilestones(progressPercent: number) {
  const steps = [25, 50, 75, 100];
  return steps.map((step) => ({
    percent: step,
    isReached: progressPercent >= step,
  }));
}
