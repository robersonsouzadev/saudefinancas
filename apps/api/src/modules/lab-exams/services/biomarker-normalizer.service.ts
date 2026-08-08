import { Injectable } from '@nestjs/common';

/**
 * Maps raw biomarker names (from OCR or manual input) to standardized keys,
 * human-readable names, and Prisma BiomarkerCategory enum values.
 *
 * Prisma enum BiomarkerCategory:
 *   HEMOGRAMA | LIPIDIOS | METABOLICO | TIREOIDE | HEPATICO | RENAL
 *   | VITAMINAS_MINERAIS | HORMONIOS | INFLAMACAO | MARCADORES_TUMORAIS
 *   | URINARIO | OUTROS
 */
@Injectable()
export class BiomarkerNormalizerService {
  private dictionary: Record<string, { key: string; name: string; category: string }> = {
    // ── METABOLICO ──
    'GLUCOSE': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLICO' },
    'GLICOSE': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLICO' },
    'GLICEMIA': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLICO' },
    'HBA1C': { key: 'HBA1C', name: 'Hemoglobina Glicada', category: 'METABOLICO' },
    'HEMOGLOBINA GLICADA': { key: 'HBA1C', name: 'Hemoglobina Glicada', category: 'METABOLICO' },
    'INSULIN': { key: 'INSULIN', name: 'Insulina', category: 'METABOLICO' },
    'INSULINA': { key: 'INSULIN', name: 'Insulina', category: 'METABOLICO' },
    'HOMA_IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLICO' },
    'HOMA-IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLICO' },
    'ALBUMIN': { key: 'ALBUMIN', name: 'Albumina', category: 'METABOLICO' },
    'ALBUMINA': { key: 'ALBUMIN', name: 'Albumina', category: 'METABOLICO' },

    // ── LIPIDIOS ──
    'TOTAL_CHOLESTEROL': { key: 'TOTAL_CHOLESTEROL', name: 'Colesterol Total', category: 'LIPIDIOS' },
    'COLESTEROL TOTAL': { key: 'TOTAL_CHOLESTEROL', name: 'Colesterol Total', category: 'LIPIDIOS' },
    'LDL': { key: 'LDL', name: 'Colesterol LDL', category: 'LIPIDIOS' },
    'HDL': { key: 'HDL', name: 'Colesterol HDL', category: 'LIPIDIOS' },
    'TRIGLYCERIDES': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPIDIOS' },
    'TRIGLICERIDEOS': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPIDIOS' },
    'TRIGLICERIDEO': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPIDIOS' },
    'APOB': { key: 'APOB', name: 'Apolipoproteína B', category: 'LIPIDIOS' },
    'CASTELLI I': { key: 'CASTELLI_I', name: 'Índice de Castelli I', category: 'LIPIDIOS' },
    'INDICE DE CASTELLI I': { key: 'CASTELLI_I', name: 'Índice de Castelli I', category: 'LIPIDIOS' },
    'CASTELLI II': { key: 'CASTELLI_II', name: 'Índice de Castelli II', category: 'LIPIDIOS' },
    'INDICE DE CASTELLI II': { key: 'CASTELLI_II', name: 'Índice de Castelli II', category: 'LIPIDIOS' },

    // ── TIREOIDE ──
    'TSH': { key: 'TSH', name: 'TSH', category: 'TIREOIDE' },
    'FREE_T3': { key: 'FREE_T3', name: 'T3 Livre', category: 'TIREOIDE' },
    'T3 LIVRE': { key: 'FREE_T3', name: 'T3 Livre', category: 'TIREOIDE' },
    'FREE_T4': { key: 'FREE_T4', name: 'T4 Livre', category: 'TIREOIDE' },
    'T4 LIVRE': { key: 'FREE_T4', name: 'T4 Livre', category: 'TIREOIDE' },

    // ── HEPATICO ──
    'AST': { key: 'AST', name: 'AST (TGO)', category: 'HEPATICO' },
    'TGO': { key: 'AST', name: 'AST (TGO)', category: 'HEPATICO' },
    'ALT': { key: 'ALT', name: 'ALT (TGP)', category: 'HEPATICO' },
    'TGP': { key: 'ALT', name: 'ALT (TGP)', category: 'HEPATICO' },
    'GGT': { key: 'GGT', name: 'Gama-GT', category: 'HEPATICO' },
    'GAMA GT': { key: 'GGT', name: 'Gama-GT', category: 'HEPATICO' },
    'ALP': { key: 'ALP', name: 'Fosfatase Alcalina', category: 'HEPATICO' },
    'FOSFATASE ALCALINA': { key: 'ALP', name: 'Fosfatase Alcalina', category: 'HEPATICO' },

    // ── RENAL ──
    'CREATININE': { key: 'CREATININE', name: 'Creatinina', category: 'RENAL' },
    'CREATININA': { key: 'CREATININE', name: 'Creatinina', category: 'RENAL' },
    'UREA': { key: 'UREA', name: 'Ureia', category: 'RENAL' },
    'UREIA': { key: 'UREA', name: 'Ureia', category: 'RENAL' },
    'EGFR': { key: 'EGFR', name: 'Taxa de Filtração Glomerular (eGFR)', category: 'RENAL' },
    'TAXA DE FILTRACAO': { key: 'EGFR', name: 'Taxa de Filtração Glomerular (eGFR)', category: 'RENAL' },
    'URIC_ACID': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },
    'ACIDO URICO': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },

    // ── VITAMINAS_MINERAIS ──
    'VITAMIN_D': { key: 'VITAMIN_D', name: 'Vitamina D (25-OH)', category: 'VITAMINAS_MINERAIS' },
    'VITAMINA D': { key: 'VITAMIN_D', name: 'Vitamina D (25-OH)', category: 'VITAMINAS_MINERAIS' },
    'VITAMIN_B12': { key: 'VITAMIN_B12', name: 'Vitamina B12', category: 'VITAMINAS_MINERAIS' },
    'VITAMINA B12': { key: 'VITAMIN_B12', name: 'Vitamina B12', category: 'VITAMINAS_MINERAIS' },
    'FERRITIN': { key: 'FERRITIN', name: 'Ferritina', category: 'VITAMINAS_MINERAIS' },
    'FERRITINA': { key: 'FERRITIN', name: 'Ferritina', category: 'VITAMINAS_MINERAIS' },
    'IRON': { key: 'IRON', name: 'Ferro Sérico', category: 'VITAMINAS_MINERAIS' },
    'FERRO': { key: 'IRON', name: 'Ferro Sérico', category: 'VITAMINAS_MINERAIS' },
    'MAGNESIUM': { key: 'MAGNESIUM', name: 'Magnésio', category: 'VITAMINAS_MINERAIS' },
    'MAGNESIO': { key: 'MAGNESIUM', name: 'Magnésio', category: 'VITAMINAS_MINERAIS' },
    'CALCIUM': { key: 'CALCIUM', name: 'Cálcio', category: 'VITAMINAS_MINERAIS' },
    'CALCIO': { key: 'CALCIUM', name: 'Cálcio', category: 'VITAMINAS_MINERAIS' },
    'SODIUM': { key: 'SODIUM', name: 'Sódio', category: 'VITAMINAS_MINERAIS' },
    'SODIO': { key: 'SODIUM', name: 'Sódio', category: 'VITAMINAS_MINERAIS' },
    'POTASSIUM': { key: 'POTASSIUM', name: 'Potássio', category: 'VITAMINAS_MINERAIS' },
    'POTASSIO': { key: 'POTASSIUM', name: 'Potássio', category: 'VITAMINAS_MINERAIS' },
    'ZINC': { key: 'ZINC', name: 'Zinco', category: 'VITAMINAS_MINERAIS' },
    'ZINCO': { key: 'ZINC', name: 'Zinco', category: 'VITAMINAS_MINERAIS' },

    // ── HORMONIOS ──
    'TOTAL_TESTOSTERONE': { key: 'TOTAL_TESTOSTERONE', name: 'Testosterona Total', category: 'HORMONIOS' },
    'TESTOSTERONA TOTAL': { key: 'TOTAL_TESTOSTERONE', name: 'Testosterona Total', category: 'HORMONIOS' },
    'ESTRADIOL': { key: 'ESTRADIOL', name: 'Estradiol', category: 'HORMONIOS' },
    'CORTISOL': { key: 'CORTISOL', name: 'Cortisol', category: 'HORMONIOS' },

    // ── INFLAMACAO ──
    'HS_CRP': { key: 'HS_CRP', name: 'Proteína C-Reativa (PCR)', category: 'INFLAMACAO' },
    'PCR': { key: 'HS_CRP', name: 'Proteína C-Reativa (PCR)', category: 'INFLAMACAO' },
    'HOMOCYSTEINE': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'INFLAMACAO' },
    'HOMOCISTEINA': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'INFLAMACAO' },

    // ── HEMOGRAMA ──
    'HEMACIAS': { key: 'RBC', name: 'Hemácias (Eritrócitos)', category: 'HEMOGRAMA' },
    'ERITROCITOS': { key: 'RBC', name: 'Hemácias (Eritrócitos)', category: 'HEMOGRAMA' },
    'HEMOGLOBIN': { key: 'HEMOGLOBIN', name: 'Hemoglobina', category: 'HEMOGRAMA' },
    'HEMOGLOBINA': { key: 'HEMOGLOBIN', name: 'Hemoglobina', category: 'HEMOGRAMA' },
    'HEMATOCRIT': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMOGRAMA' },
    'HEMATOCRITO': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMOGRAMA' },
    'MCV': { key: 'MCV', name: 'Volume Corpuscular Médio (V.C.M.)', category: 'HEMOGRAMA' },
    'VCM': { key: 'MCV', name: 'Volume Corpuscular Médio (V.C.M.)', category: 'HEMOGRAMA' },
    'MCH': { key: 'MCH', name: 'Hemoglobina Corpuscular Média (H.C.M.)', category: 'HEMOGRAMA' },
    'HCM': { key: 'MCH', name: 'Hemoglobina Corpuscular Média (H.C.M.)', category: 'HEMOGRAMA' },
    'MCHC': { key: 'MCHC', name: 'Concentração de Hemoglobina Corpuscular Média (C.H.C.M.)', category: 'HEMOGRAMA' },
    'CHCM': { key: 'MCHC', name: 'Concentração de Hemoglobina Corpuscular Média (C.H.C.M.)', category: 'HEMOGRAMA' },
    'RDW': { key: 'RDW', name: 'RDW (R.D.W.)', category: 'HEMOGRAMA' },
    'WBC': { key: 'WBC', name: 'Leucócitos', category: 'HEMOGRAMA' },
    'LEUCOCITOS': { key: 'WBC', name: 'Leucócitos', category: 'HEMOGRAMA' },
    'BASTONETES': { key: 'BAND_NEUTROPHILS', name: 'Bastonetes', category: 'HEMOGRAMA' },
    'SEGMENTADOS': { key: 'SEGMENTED_NEUTROPHILS', name: 'Segmentados', category: 'HEMOGRAMA' },
    'EOSINOFILOS': { key: 'EOSINOPHILS', name: 'Eosinófilos', category: 'HEMOGRAMA' },
    'BASOFILOS': { key: 'BASOPHILS', name: 'Basófilos', category: 'HEMOGRAMA' },
    'MONOCITOS': { key: 'MONOCYTES', name: 'Monócitos', category: 'HEMOGRAMA' },
    'LINFOCITOS': { key: 'LYMPHOCYTES', name: 'Linfócitos', category: 'HEMOGRAMA' },
    'LINFOCITOS REATIVOS': { key: 'REACTIVE_LYMPHOCYTES', name: 'Linfócitos Reativos', category: 'HEMOGRAMA' },
    'BLASTOS': { key: 'BLASTS', name: 'Blastos', category: 'HEMOGRAMA' },
    'PROMIELOCITOS': { key: 'PROMYELOCYTES', name: 'Promielócitos', category: 'HEMOGRAMA' },
    'MIELOCITOS': { key: 'MYELOCYTES', name: 'Mielócitos', category: 'HEMOGRAMA' },
    'METAMIELOCITOS': { key: 'METAMYELOCYTES', name: 'Metamielócitos', category: 'HEMOGRAMA' },
    'PLATELETS': { key: 'PLATELETS', name: 'Plaquetas', category: 'HEMOGRAMA' },
    'PLAQUETAS': { key: 'PLATELETS', name: 'Plaquetas', category: 'HEMOGRAMA' },
  };

  normalize(name: string): { key: string; name: string; category: string } {
    const cleanRaw = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    // Compact representation without any non-alphanumeric chars (e.g., "V.C.M." -> "VCM", "AST (TGO)" -> "ASTTGO")
    const cleanCompact = cleanRaw.replace(/[^A-Z0-9]/g, '');
    // Word representation with spaces (e.g., "AST (TGO)" -> "AST TGO")
    const cleanWords = cleanRaw.replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    // ── Pass 1: Exact Match on Compact String (Highest Priority) ──
    for (const [pattern, entry] of Object.entries(this.dictionary)) {
      const patternCompact = pattern.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
      if (cleanCompact === patternCompact) {
        return entry;
      }
    }

    // ── Pass 2: Whole Word Boundary Match (Prevents "Bastonetes" matching "AST") ──
    for (const [pattern, entry] of Object.entries(this.dictionary)) {
      const patternWords = pattern.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      if (patternWords.length >= 2) {
        const regex = new RegExp(`\\b${patternWords}\\b`, 'i');
        if (regex.test(cleanWords)) {
          return entry;
        }
      }
    }

    // ── Fallback ──
    return {
      key: cleanCompact.substring(0, 30) || 'BIOMARKER',
      name: name,
      category: 'OUTROS',
    };
  }
}
