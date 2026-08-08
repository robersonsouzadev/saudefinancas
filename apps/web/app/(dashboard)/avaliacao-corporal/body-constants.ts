export interface IndicatorConfig {
  key: string;
  name: string;
  unit: string;
  category: 'GORDURA' | 'MASSA_MAGRA' | 'HIDRATACAO' | 'CELULAR' | 'METABOLISMO' | 'MEDIDAS';
  isHigherBetter: boolean;
  optimalRange?: { min: number; max: number };
  description: string;
}

export const INDICATOR_CONFIGS: Record<string, IndicatorConfig> = {
  weightKg: {
    key: 'weightKg',
    name: 'Peso Total',
    unit: 'kg',
    category: 'MEDIDAS',
    isHigherBetter: false,
    description: 'Massa corporal total incluindo tecidos moles, ossos e líquidos.',
  },
  bodyFatPercent: {
    key: 'bodyFatPercent',
    name: 'Percentual de Gordura',
    unit: '%',
    category: 'GORDURA',
    isHigherBetter: false,
    optimalRange: { min: 8.0, max: 19.9 },
    description: 'Proporção de tecido adiposo no organismo em relação ao peso total.',
  },
  fatMassKg: {
    key: 'fatMassKg',
    name: 'Massa Gorda',
    unit: 'kg',
    category: 'GORDURA',
    isHigherBetter: false,
    description: 'Peso absoluto de tecido adiposo corporal em quilogramas.',
  },
  skeletalMuscleMassKg: {
    key: 'skeletalMuscleMassKg',
    name: 'Massa Muscular Esquelética',
    unit: 'kg',
    category: 'MASSA_MAGRA',
    isHigherBetter: true,
    description: 'Massa muscular voluntária responsável pela força e locomoção.',
  },
  leanMassKg: {
    key: 'leanMassKg',
    name: 'Massa Magra Total',
    unit: 'kg',
    category: 'MASSA_MAGRA',
    isHigherBetter: true,
    description: 'Massa total livre de gordura (músculos, ossos, órgãos e líquidos).',
  },
  muscleFatRatio: {
    key: 'muscleFatRatio',
    name: 'Razão Músculo / Gordura',
    unit: '',
    category: 'MASSA_MAGRA',
    isHigherBetter: true,
    optimalRange: { min: 1.5, max: 3.0 },
    description: 'Quilo de músculo por cada quilo de gordura corporal.',
  },
  totalBodyWaterPercent: {
    key: 'totalBodyWaterPercent',
    name: 'Água Corporal Total',
    unit: '%',
    category: 'HIDRATACAO',
    isHigherBetter: true,
    optimalRange: { min: 50.0, max: 65.0 },
    description: 'Percentual de água em relação ao peso corporal total.',
  },
  totalBodyWaterL: {
    key: 'totalBodyWaterL',
    name: 'Água Corporal Total (Litros)',
    unit: 'L',
    category: 'HIDRATACAO',
    isHigherBetter: true,
    description: 'Volume absoluto de líquidos corporais em litros.',
  },
  hydrationIndex: {
    key: 'hydrationIndex',
    name: 'Índice de Hidratação',
    unit: '',
    category: 'HIDRATACAO',
    isHigherBetter: true,
    optimalRange: { min: 3.5, max: 4.5 },
    description: 'Indicador do estado de hidratação e resistividade celular.',
  },
  intracellularWaterPercent: {
    key: 'intracellularWaterPercent',
    name: 'Água Intracelular (%)',
    unit: '%',
    category: 'HIDRATACAO',
    isHigherBetter: true,
    optimalRange: { min: 58.0, max: 62.0 },
    description: 'Proporção de água localizada no interior das células.',
  },
  extracellularWaterPercent: {
    key: 'extracellularWaterPercent',
    name: 'Água Extracelular (%)',
    unit: '%',
    category: 'HIDRATACAO',
    isHigherBetter: false,
    optimalRange: { min: 38.0, max: 42.0 },
    description: 'Proporção de água localizada fora das células (plasma e interstício).',
  },
  phaseAngle: {
    key: 'phaseAngle',
    name: 'Ângulo de Fase',
    unit: '°',
    category: 'CELULAR',
    isHigherBetter: true,
    optimalRange: { min: 6.5, max: 9.5 },
    description: 'Indicador direto de integridade de membrana celular e vitalidade.',
  },
  cellularAge: {
    key: 'cellularAge',
    name: 'Idade Celular',
    unit: 'anos',
    category: 'CELULAR',
    isHigherBetter: false,
    description: 'Estimativa da idade biológica baseada na integridade celular.',
  },
  bmi: {
    key: 'bmi',
    name: 'Índice de Massa Corporal (IMC)',
    unit: 'kg/m²',
    category: 'MEDIDAS',
    isHigherBetter: false,
    optimalRange: { min: 18.5, max: 24.9 },
    description: 'Relação entre peso e altura ao quadrado (padrão OMS).',
  },
  waistCm: {
    key: 'waistCm',
    name: 'Circunferência Abdominal',
    unit: 'cm',
    category: 'MEDIDAS',
    isHigherBetter: false,
    optimalRange: { min: 60.0, max: 94.0 },
    description: 'Medida da cintura no ponto médio entre a última costela e crista ilíaca.',
  },
  waistHeightRatio: {
    key: 'waistHeightRatio',
    name: 'Relação Cintura / Estatura (RCEst)',
    unit: '',
    category: 'MEDIDAS',
    isHigherBetter: false,
    optimalRange: { min: 0.40, max: 0.49 },
    description: 'Indicador de risco cardiometabólico. Mantido idealmente < 0,50.',
  },
  basalMetabolicRate: {
    key: 'basalMetabolicRate',
    name: 'Taxa Metabólica Basal (TMB)',
    unit: 'kcal/dia',
    category: 'METABOLISMO',
    isHigherBetter: true,
    description: 'Calorias mínimas consumidas pelo corpo em repouso absoluto 24h.',
  },
};

/**
 * Retorna classe de cor de tendência para um indicador
 */
export function getTrendBadge(delta: number | undefined | null, isHigherBetter: boolean) {
  if (delta === undefined || delta === null || delta === 0) {
    return { text: 'Estável', color: 'text-[#8a8f98]', bg: 'bg-[#8a8f9815]', icon: '➡️' };
  }
  const isPositive = delta > 0;
  const isGood = isHigherBetter ? isPositive : !isPositive;

  if (isGood) {
    return {
      text: `${isPositive ? '+' : ''}${delta}`,
      color: 'text-[#4ade80]',
      bg: 'bg-[#4ade8015]',
      icon: isPositive ? '↗️' : '↘️',
    };
  } else {
    return {
      text: `${isPositive ? '+' : ''}${delta}`,
      color: 'text-[#f87171]',
      bg: 'bg-[#f8717115]',
      icon: isPositive ? '↗️' : '↘️',
    };
  }
}
