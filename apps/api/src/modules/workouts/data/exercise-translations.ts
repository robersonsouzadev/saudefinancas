export const MUSCLE_GROUP_MAP: Record<string, string> = {
  pectorals: 'PEITORAL_MEDIAL',
  lats: 'DORSAL',
  delts: 'OMBRO_LATERAL',
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
  adductors: 'POSTERIOR_COXA',
  cardio: 'CARDIO',
  'levator-scapulae': 'TRAPEZIO',
  'serratus-anterior': 'ABDOMEN',
  spine: 'LOMBAR',
};

export function determineMuscleSubGroup(baseMuscleGroup: string, exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  if (baseMuscleGroup.includes('PEITORAL')) {
    if (lower.includes('incline')) return 'PEITORAL_SUPERIOR';
    if (lower.includes('decline') || lower.includes('dip')) return 'PEITORAL_INFERIOR';
    return 'PEITORAL_MEDIAL';
  }
  if (baseMuscleGroup.includes('OMBRO')) {
    if (lower.includes('lateral') || lower.includes('side')) return 'OMBRO_LATERAL';
    if (lower.includes('rear') || lower.includes('reverse') || lower.includes('face pull') || lower.includes('bent over')) return 'OMBRO_POSTERIOR';
    return 'OMBRO_ANTERIOR';
  }
  return baseMuscleGroup;
}

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

export const INSTRUCTION_SENTENCE_MAP: Record<string, string> = {
  "Adjust the machine to your size and select the load.": "Ajuste a máquina para a sua altura e selecione a carga apropriada.",
  "Adopt the starting position with proper body alignment.": "Assuma a posição inicial mantendo o alinhamento corporal correto.",
  "Anchor the resistance band and maintain initial tension.": "Fixe a faixa elástica e mantenha a tensão inicial adequada.",
  "Breathe: exhale on effort, inhale on the way back.": "Respiração: expire durante a fase de esforço (concêntrica) e inspire ao retornar (excêntrica).",
  "Continue for the planned time or repetitions.": "Continue o movimento pelo tempo ou número de repetições planejadas.",
  "Engage your core and keep an upright posture throughout.": "Mantenha o abdômen contraído e a postura ereta durante todo o exercício.",
  "Execute the movement explosively and land under control.": "Execute o movimento de forma explosiva e aterre de maneira controlada.",
  "Grab a dumbbell in each hand (or the indicated one) with an appropriate weight.": "Segure um halter em cada mão (ou conforme indicado) com a carga adequada.",
  "Grab the kettlebell with an appropriate weight and adopt the position.": "Segure o kettlebell com a carga adequada e assuma a posição inicial.",
  "Hold for 20 to 40 seconds breathing deeply.": "Mantenha a posição de 20 a 40 segundos, respirando profundamente.",
  "Keep a steady pace adapted to your fitness level.": "Mantenha um ritmo constante adaptado ao seu nível de condicionamento físico.",
  "Land softly absorbing with legs and core, then chain the next rep.": "Aterre suavemente amortecendo com as pernas e o core, em seguida inicie a próxima repetição.",
  "Load the EZ-bar with an appropriate weight and grip it firmly.": "Carregue a barra W com o peso adequado e segure-a com firmeza.",
  "Load the bar with an appropriate weight and adopt the starting position.": "Carregue a barra com a carga adequada e assuma a posição inicial.",
  "Move into the the adductors stretch position.": "Posicione-se na postura de Alongamento de Adutores.",
  "Move into the the calves stretch position.": "Posicione-se na postura de Alongamento de Panturrilhas.",
  "Move into the the chest stretch position.": "Posicione-se na postura de Alongamento de Peitoral.",
  "Move into the the core stretch position.": "Posicione-se na postura de Alongamento de Abdômen/Core.",
  "Move into the the forearms stretch position.": "Posicione-se na postura de Alongamento de Antebraço.",
  "Move into the the glutes stretch position.": "Posicione-se na postura de Alongamento de Glúteos.",
  "Move into the the hamstrings stretch position.": "Posicione-se na postura de Alongamento de Posterior de Coxa.",
  "Move into the the lats stretch position.": "Posicione-se na postura de Alongamento de Costas/Dorsal.",
  "Move into the the levator scapulae stretch position.": "Posicione-se na postura de Alongamento de Elevar da Escápula.",
  "Move into the the lower back stretch position.": "Posicione-se na postura de Alongamento de Lombar.",
  "Move into the the quadriceps stretch position.": "Posicione-se na postura de Alongamento de Quadríceps.",
  "Move into the the shoulders stretch position.": "Posicione-se na postura de Alongamento de Ombros.",
  "Move into the the triceps stretch position.": "Posicione-se na postura de Alongamento de Tríceps.",
  "Move into the the upper back stretch position.": "Posicione-se na postura de Alongamento da Parte Superior das Costas.",
  "Perform a brief dip to load tension.": "Realize uma breve flexão para acionar a tensão muscular.",
  "Perform the movement in a controlled manner, keeping good form.": "Execute o movimento de forma controlada, mantendo a postura correta.",
  "Pre-engage the abductors before initiating the movement.": "Contraia os abdutores antes de iniciar o movimento.",
  "Pre-engage the adductors before initiating the movement.": "Contraia os adutores antes de iniciar o movimento.",
  "Pre-engage the biceps before initiating the movement.": "Contraia os bíceps antes de iniciar o movimento.",
  "Pre-engage the calves before initiating the movement.": "Contraia as panturrilhas antes de iniciar o movimento.",
  "Pre-engage the chest before initiating the movement.": "Contraia o peitoral antes de iniciar o movimento.",
  "Pre-engage the core before initiating the movement.": "Contraia o abdômen/core antes de iniciar o movimento.",
  "Pre-engage the forearms before initiating the movement.": "Contraia os antebraços antes de iniciar o movimento.",
  "Pre-engage the glutes before initiating the movement.": "Contraia os glúteos antes de iniciar o movimento.",
  "Pre-engage the hamstrings before initiating the movement.": "Contraia o posterior de coxa antes de iniciar o movimento.",
  "Pre-engage the lats before initiating the movement.": "Contraia as costas/dorsais antes de iniciar o movimento.",
  "Pre-engage the lower back before initiating the movement.": "Contraia a lombar antes de iniciar o movimento.",
  "Pre-engage the quadriceps before initiating the movement.": "Contraia o quadríceps antes de iniciar o movimento.",
  "Pre-engage the serratus anterior before initiating the movement.": "Contraia o serrátil anterior antes de iniciar o movimento.",
  "Pre-engage the shoulders before initiating the movement.": "Contraia os ombros antes de iniciar o movimento.",
  "Pre-engage the traps before initiating the movement.": "Contraia o trapézio antes de iniciar o movimento.",
  "Pre-engage the triceps before initiating the movement.": "Contraia o tríceps antes de iniciar o movimento.",
  "Pre-engage the upper back before initiating the movement.": "Contraia a parte superior das costas antes de iniciar o movimento.",
  "Prepare the equipment and adopt the starting position.": "Prepare o equipamento e assuma a posição inicial.",
  "Return slowly to the starting position and repeat if desired.": "Retorne lentamente à posição inicial e repita o movimento.",
  "Return to the starting position controlling the eccentric phase.": "Retorne à posição inicial controlando a fase excêntrica.",
  "Set the bar on the Smith machine at the right height.": "Ajuste a barra da máquina Smith na altura adequada.",
  "Set the pulley at the required height and select the weight.": "Ajuste a polia do cabo na altura desejada e selecione a carga.",
};

export const EXERCISE_NAME_PT_MAP: Record<string, string> = {
  'barbell bench press': 'Supino Reto com Barra',
  'dumbbell bench press': 'Supino Reto com Halteres',
  'smith bench press': 'Supino Reto no Smith',
  'barbell incline bench press': 'Supino Inclinado com Barra',
  'dumbbell incline bench press': 'Supino Inclinado com Halteres',
  'smith incline bench press': 'Supino Inclinado no Smith',
  'barbell decline bench press': 'Supino Declinado com Barra',
  'dumbbell decline bench press': 'Supino Declinado com Halteres',
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
 * Translates instruction text into Portuguese using sentence splitting and exact sentence mapping
 */
export function translateInstructions(raw: string | string[]): string {
  if (!raw) return 'Execução correta do exercício. Mantenha a postura e expire na fase concêntrica.';

  const inputStr = Array.isArray(raw) ? raw.join(' ') : raw;
  const sentences = inputStr.split(/(?<=\.)\s+/);

  const translatedSentences = sentences.map((s) => {
    let trimmed = s.trim();
    if (!trimmed) return '';

    if (INSTRUCTION_SENTENCE_MAP[trimmed]) {
      return INSTRUCTION_SENTENCE_MAP[trimmed];
    }

    const withDot = trimmed.endsWith('.') ? trimmed : trimmed + '.';
    const withoutDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;

    if (INSTRUCTION_SENTENCE_MAP[withDot]) return INSTRUCTION_SENTENCE_MAP[withDot];
    if (INSTRUCTION_SENTENCE_MAP[withoutDot]) return INSTRUCTION_SENTENCE_MAP[withoutDot];

    // Fallback phrase replacements
    let result = trimmed
      .replace(/Adopt the starting position with proper body alignment\.?/gi, 'Assuma a posição inicial mantendo o alinhamento corporal correto.')
      .replace(/Pre-engage the (\w+(?:\s+\w+)?) before initiating the movement\.?/gi, (_, muscle) => {
        const muscleMap: Record<string, string> = {
          chest: 'o peitoral', core: 'o abdômen/core', biceps: 'os bíceps', triceps: 'os tríceps',
          lats: 'as costas/dorsais', shoulders: 'os ombros', quadriceps: 'o quadríceps',
          hamstrings: 'o posterior de coxa', glutes: 'os glúteos', calves: 'as panturrilhas',
          forearms: 'os antebraços', traps: 'o trapézio', 'lower back': 'a lombar',
          abductors: 'os abdutores', adductors: 'os adutores', 'upper back': 'a parte superior das costas'
        };
        return `Contraia ${muscleMap[muscle.toLowerCase()] || muscle} antes de iniciar o movimento.`;
      })
      .replace(/Perform the movement in a controlled manner, keeping good form\.?/gi, 'Execute o movimento de forma controlada, mantendo a boa postura.')
      .replace(/Return to the starting position controlling the eccentric phase\.?/gi, 'Retorne à posição inicial controlando a fase excêntrica.')
      .replace(/Breathe: exhale on effort, inhale on the way back\.?/gi, 'Respiração: expire durante a fase de esforço e inspire no retorno.')
      .replace(/Load the bar with an appropriate weight and adopt the starting position\.?/gi, 'Carregue a barra com a carga adequada e assuma a posição inicial.')
      .replace(/Grab a dumbbell in each hand \(or the indicated one\) with an appropriate weight\.?/gi, 'Segure um halter em cada mão com a carga adequada.')
      .replace(/Set the pulley at the required height and select the weight\.?/gi, 'Ajuste a polia na altura desejada e selecione a carga.')
      .replace(/Adjust the machine to your size and select the load\.?/gi, 'Ajuste a máquina para a sua altura e selecione a carga.')
      .replace(/Anchor the resistance band and maintain initial tension\.?/gi, 'Fixe a faixa elástica e mantenha a tensão inicial.');

    return result;
  });

  return translatedSentences.filter(Boolean).join(' ');
}

/**
 * Translates English exercise name to natural Portuguese
 */
export function translateExerciseName(nameEn: string): { namePt: string; nameEn: string } {
  const cleanEn = nameEn.trim();
  const lower = cleanEn.toLowerCase();

  if (EXERCISE_NAME_PT_MAP[lower]) {
    return { namePt: EXERCISE_NAME_PT_MAP[lower], nameEn: cleanEn };
  }

  // Handle Incline Bench Press patterns
  if (lower.includes('incline bench press') || lower.includes('incline press')) {
    if (lower.includes('barbell')) return { namePt: 'Supino Inclinado com Barra', nameEn: cleanEn };
    if (lower.includes('dumbbell')) return { namePt: 'Supino Inclinado com Halteres', nameEn: cleanEn };
    if (lower.includes('smith')) return { namePt: 'Supino Inclinado no Smith', nameEn: cleanEn };
    return { namePt: 'Supino Inclinado', nameEn: cleanEn };
  }

  // Handle Decline Bench Press patterns
  if (lower.includes('decline bench press')) {
    if (lower.includes('barbell')) return { namePt: 'Supino Declinado com Barra', nameEn: cleanEn };
    if (lower.includes('dumbbell')) return { namePt: 'Supino Declinado com Halteres', nameEn: cleanEn };
    return { namePt: 'Supino Declinado', nameEn: cleanEn };
  }

  // Handle Flat Bench Press patterns
  if (lower.includes('bench press')) {
    if (lower.includes('barbell')) return { namePt: 'Supino Reto com Barra', nameEn: cleanEn };
    if (lower.includes('dumbbell')) return { namePt: 'Supino Reto com Halteres', nameEn: cleanEn };
    if (lower.includes('smith')) return { namePt: 'Supino Reto no Smith', nameEn: cleanEn };
    return { namePt: 'Supino Reto', nameEn: cleanEn };
  }

  // Handle Squat patterns
  if (lower.includes('squat')) {
    if (lower.includes('front')) return { namePt: 'Agachamento Frontal com Barra', nameEn: cleanEn };
    if (lower.includes('goblet')) return { namePt: 'Agachamento Goblet', nameEn: cleanEn };
    if (lower.includes('split')) return { namePt: 'Agachamento Búlgaro / Afundo', nameEn: cleanEn };
    if (lower.includes('hack')) return { namePt: 'Agachamento Hack', nameEn: cleanEn };
    if (lower.includes('barbell')) return { namePt: 'Agachamento Livre com Barra', nameEn: cleanEn };
    if (lower.includes('dumbbell')) return { namePt: 'Agachamento com Halteres', nameEn: cleanEn };
    return { namePt: 'Agachamento', nameEn: cleanEn };
  }

  // Handle Deadlift patterns
  if (lower.includes('deadlift')) {
    if (lower.includes('stiff') || lower.includes('straight leg')) return { namePt: 'Stiff com Barra', nameEn: cleanEn };
    if (lower.includes('romanian')) return { namePt: 'Levantamento Terra Romano', nameEn: cleanEn };
    if (lower.includes('sumo')) return { namePt: 'Levantamento Terra Sumo', nameEn: cleanEn };
    return { namePt: 'Levantamento Terra', nameEn: cleanEn };
  }

  // Handle Curl patterns
  if (lower.includes('curl')) {
    if (lower.includes('hammer')) return { namePt: 'Rosca Martelo com Halteres', nameEn: cleanEn };
    if (lower.includes('preacher')) return { namePt: 'Rosca Scott', nameEn: cleanEn };
    if (lower.includes('concentration')) return { namePt: 'Rosca Concentrada', nameEn: cleanEn };
    if (lower.includes('barbell')) return { namePt: 'Rosca Direta com Barra', nameEn: cleanEn };
    if (lower.includes('dumbbell')) return { namePt: 'Rosca Direta com Halteres', nameEn: cleanEn };
    return { namePt: 'Rosca de Bíceps', nameEn: cleanEn };
  }

  // Fallback: Clean string replacement
  let pt = cleanEn
    .replace(/\bBarbell\b/gi, 'com Barra')
    .replace(/\bDumbbell\b/gi, 'com Halteres')
    .replace(/\bCable\b/gi, 'no Cabo')
    .replace(/\bBand\b/gi, 'com Elástico')
    .replace(/\bKettlebell\b/gi, 'com Kettlebell')
    .replace(/\bMachine\b/gi, 'na Máquina')
    .replace(/\bSmith\b/gi, 'no Smith')
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
