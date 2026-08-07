export const MUSCLE_GROUP_MAP: Record<string, string> = {
  pectorals: 'PEITORAL',
  lats: 'DORSAL',
  delts: 'OMBRO',
  biceps: 'BICEPS',
  triceps: 'TRICEPS',
  quads: 'QUADRICEPS',
  hamstrings: 'POSTERIOR_COXA',
  abs: 'ABDOMEN',
  glutes: 'GLUTEOS',
  calves: 'PANTURRILHA',
  forearms: 'ANTEBRACO',
  traps: 'TRAPEZIO',
  'upper-back': 'DORSAL',
  abductors: 'GLUTEOS',
  adductors: 'COXA',
  cardio: 'CARDIO',
  'levator-scapulae': 'TRAPEZIO',
  'serratus-anterior': 'ABDOMEN',
  spine: 'LOMBAR',
};

export const EQUIPMENT_TRANSLATION: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halter',
  cable: 'Cabo / Pulley',
  machine: 'Máquina',
  bodyweight: 'Peso Corporal',
  band: 'Elástico / Band',
  kettlebell: 'Kettlebell',
  smith: 'Máquina Smith',
  'stability ball': 'Bola Suíça',
  weighted: 'Com Carga',
  other: 'Outro',
};

export const EXERCISE_NAME_PT_MAP: Record<string, string> = {
  'barbell bench press': 'Supino Reto com Barra',
  'dumbbell incline bench press': 'Supino Inclinado com Halteres',
  'push-up': 'Flexão de Braço',
  'cable pulldown': 'Puxada Frontal no Cabo',
  'pull-up': 'Barra Fixa Pronada',
  'barbell standing wide military press': 'Desenvolvimento Militar com Barra',
  'dumbbell lateral raise': 'Elevação Lateral com Halteres',
  'barbell curl': 'Rosca Direta com Barra',
  'dumbbell hammer curl': 'Rosca Martelo com Halteres',
  'barbell lying triceps extension': 'Tríceps Testa com Barra',
  'barbell bench squat': 'Agachamento Livre com Barra',
  'barbell straight leg deadlift': 'Stiff com Barra',
  '3-4 sit-up': 'Abdominal Supra no Solo',
  'barbell deadlift': 'Levantamento Terra com Barra',
  'barbell hip thrust': 'Elevação Pélvica com Barra',
  'cable triceps pushdown': 'Tríceps Pulley no Cabo',
  'dumbbell bicep curl': 'Rosca Direta com Halteres',
  'dumbbell shoulder press': 'Desenvolvimento com Halteres',
  'lat pulldown': 'Puxada Frontal Aberta',
  'incline dumbbell press': 'Supino Inclinado com Halteres',
  'decline bench press': 'Supino Declinado',
  'chest fly': 'Crucifixo no Banco',
  'cable crossover': 'Crossover no Cabo',
  'dips': 'Paralelas / Mergulho',
  'chin-up': 'Barra Fixa Supinada',
  'bent over row': 'Remada Curvada com Barra',
  'seated cable row': 'Remada Baixa no Cabo',
  'front raise': 'Elevação Frontal',
  'face pull': 'Face Pull no Cabo',
  'preacher curl': 'Rosca Scott',
  'concentration curl': 'Rosca Concentrada',
  'tricep extension': 'Extensão de Tríceps',
  'skull crusher': 'Tríceps Testa',
  'goblet squat': 'Agachamento Goblet',
  'leg press': 'Leg Press 45°',
  'leg extension': 'Cadeira Extensora',
  'leg curl': 'Mesa Flexora',
  'lunges': 'Passada / Afundo',
  'romanian deadlift': 'Levantamento Terra Romano',
  'calf raise': 'Gêmeos / Panturrilha',
  'plank': 'Prancha Abdominal',
  'russian twist': 'Torção Russa',
  'leg raise': 'Elevação de Pernas',
};

/**
 * Translates English exercise name to Portuguese when a match is found,
 * otherwise formats title-cased English name cleanly.
 */
export function translateExerciseName(nameEn: string): { namePt: string; nameEn: string } {
  const cleanEn = nameEn.trim();
  const lower = cleanEn.toLowerCase();
  
  if (EXERCISE_NAME_PT_MAP[lower]) {
    return { namePt: EXERCISE_NAME_PT_MAP[lower], nameEn: cleanEn };
  }

  // Fallback: translate common fitness words in the name
  let pt = cleanEn
    .replace(/\bBarbell\b/gi, 'com Barra')
    .replace(/\bDumbbell\b/gi, 'com Halteres')
    .replace(/\bCable\b/gi, 'no Cabo')
    .replace(/\bBand\b/gi, 'com Elástico')
    .replace(/\bKettlebell\b/gi, 'com Kettlebell')
    .replace(/\bMachine\b/gi, 'na Máquina')
    .replace(/\bSmith\b/gi, 'no Smith')
    .replace(/\bBench Press\b/gi, 'Supino')
    .replace(/\bSquat\b/gi, 'Agachamento')
    .replace(/\bDeadlift\b/gi, 'Levantamento Terra')
    .replace(/\bCurl\b/gi, 'Rosca')
    .replace(/\bPushdown\b/gi, 'Extensão')
    .replace(/\bPulldown\b/gi, 'Puxada')
    .replace(/\bRow\b/gi, 'Remada')
    .replace(/\bRaise\b/gi, 'Elevação')
    .replace(/\bExtension\b/gi, 'Extensão')
    .replace(/\bCrunch\b/gi, 'Abdominal')
    .replace(/\bFly\b/gi, 'Crucifixo');

  pt = pt.trim();
  return { namePt: pt, nameEn: cleanEn };
}
