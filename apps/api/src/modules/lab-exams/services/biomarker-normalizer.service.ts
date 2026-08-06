import { Injectable } from '@nestjs/common';

export interface NormalizedBiomarker {
  key: string;
  name: string;
  category: 'HEMOGRAMA' | 'LIPIDIOS' | 'METABOLICO' | 'TIREOIDE' | 'HEPATICO' | 'RENAL' | 'VITAMINAS_MINERAIS' | 'HORMONIOS' | 'INFLAMACAO' | 'MARCADORES_TUMORAIS' | 'URINARIO' | 'OUTROS';
}

@Injectable()
export class BiomarkerNormalizerService {
  private dictionary: Record<string, NormalizedBiomarker> = {
    // METABOLICO
    'GLUCOSE': { key: 'GLUCOSE', name: 'Glicose de Jejum', category: 'METABOLICO' },
    'GLICOSE DE JEJUM': { key: 'GLUCOSE', name: 'Glicose de Jejum', category: 'METABOLICO' },
    'GLICEMIA DE JEJUM': { key: 'GLUCOSE', name: 'Glicose de Jejum', category: 'METABOLICO' },
    'HBA1C': { key: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)', category: 'METABOLICO' },
    'HEMOGLOBINA GLICADA': { key: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)', category: 'METABOLICO' },
    'INSULINA': { key: 'INSULIN', name: 'Insulina de Jejum', category: 'METABOLICO' },
    'INSULINA DE JEJUM': { key: 'INSULIN', name: 'Insulina de Jejum', category: 'METABOLICO' },
    'HOMA-IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLICO' },
    'INDICE HOMA-IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLICO' },

    // LIPIDIOS
    'COLESTEROL TOTAL': { key: 'TOTAL_CHOLESTEROL', name: 'Colesterol Total', category: 'LIPIDIOS' },
    'LDL': { key: 'LDL', name: 'LDL Colesterol', category: 'LIPIDIOS' },
    'LDL COLESTEROL': { key: 'LDL', name: 'LDL Colesterol', category: 'LIPIDIOS' },
    'HDL': { key: 'HDL', name: 'HDL Colesterol', category: 'LIPIDIOS' },
    'HDL COLESTEROL': { key: 'HDL', name: 'HDL Colesterol', category: 'LIPIDIOS' },
    'TRIGLICERIDEOS': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPIDIOS' },
    'TRIGLICÉRIDES': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPIDIOS' },
    'APOB': { key: 'APOB', name: 'Apolipoproteína B (ApoB)', category: 'LIPIDIOS' },

    // TIREOIDE
    'TSH': { key: 'TSH', name: 'Hormônio Tireoestimulante (TSH)', category: 'TIREOIDE' },
    'T3 LIVRE': { key: 'FREE_T3', name: 'T3 Livre', category: 'TIREOIDE' },
    'T4 LIVRE': { key: 'FREE_T4', name: 'T4 Livre', category: 'TIREOIDE' },

    // HEPATICO
    'TGO': { key: 'AST', name: 'TGO (AST)', category: 'HEPATICO' },
    'AST': { key: 'AST', name: 'TGO (AST)', category: 'HEPATICO' },
    'TGP': { key: 'ALT', name: 'TGP (ALT)', category: 'HEPATICO' },
    'ALT': { key: 'ALT', name: 'TGP (ALT)', category: 'HEPATICO' },
    'GGT': { key: 'GGT', name: 'Gama GT (GGT)', category: 'HEPATICO' },
    'GAMA GT': { key: 'GGT', name: 'Gama GT (GGT)', category: 'HEPATICO' },

    // RENAL
    'CREATININA': { key: 'CREATININE', name: 'Creatinina Sérica', category: 'RENAL' },
    'UREIA': { key: 'UREA', name: 'Ureia Sérica', category: 'RENAL' },
    'ACIDO URICO': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },
    'ÁCIDO ÚRICO': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },

    // VITAMINAS & MINERAIS
    'VITAMINA D': { key: 'VITAMIN_D', name: '25-OH Vitamina D', category: 'VITAMINAS_MINERAIS' },
    '25-OH VITAMINA D': { key: 'VITAMIN_D', name: '25-OH Vitamina D', category: 'VITAMINAS_MINERAIS' },
    'VITAMINA B12': { key: 'VITAMIN_B12', name: 'Vitamina B12', category: 'VITAMINAS_MINERAIS' },
    'FERRITINA': { key: 'FERRITIN', name: 'Ferritina', category: 'VITAMINAS_MINERAIS' },
    'FERRO': { key: 'IRON', name: 'Ferro Sérico', category: 'VITAMINAS_MINERAIS' },
    'MAGNESIO': { key: 'MAGNESIUM', name: 'Magnésio Sérico', category: 'VITAMINAS_MINERAIS' },
    'MAGNÉSIO': { key: 'MAGNESIUM', name: 'Magnésio Sérico', category: 'VITAMINAS_MINERAIS' },

    // INFLAMACAO
    'PCR': { key: 'HS_CRP', name: 'Proteína C Reativa (PCR-us)', category: 'INFLAMACAO' },
    'PCR-US': { key: 'HS_CRP', name: 'Proteína C Reativa (PCR-us)', category: 'INFLAMACAO' },
    'PROTEINA C REATIVA': { key: 'HS_CRP', name: 'Proteína C Reativa (PCR-us)', category: 'INFLAMACAO' },
    'HOMOCISTEINA': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'INFLAMACAO' },
    'HOMOCISTEÍNA': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'INFLAMACAO' },

    // HEMOGRAMA
    'HEMOGLOBINA': { key: 'HEMOGLOBIN', name: 'Hemoglobina', category: 'HEMOGRAMA' },
    'HEMATOCRITO': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMOGRAMA' },
    'HEMATÓCRITO': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMOGRAMA' },
    'VCM': { key: 'MCV', name: 'VCM (Volume Corpuscular Médio)', category: 'HEMOGRAMA' },
    'RDW': { key: 'RDW', name: 'RDW', category: 'HEMOGRAMA' },
    'LEUCOCITOS': { key: 'WBC', name: 'Leucócitos Totais', category: 'HEMOGRAMA' },
    'LEUCÓCITOS': { key: 'WBC', name: 'Leucócitos Totais', category: 'HEMOGRAMA' },
    'PLAQUETAS': { key: 'PLATELETS', name: 'Plaquetas', category: 'HEMOGRAMA' },
    'ALBUMINA': { key: 'ALBUMIN', name: 'Albumina Sérica', category: 'HEMPATICO' as any },
  };

  normalize(rawName: string): NormalizedBiomarker {
    const clean = rawName
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    for (const [pattern, entry] of Object.entries(this.dictionary)) {
      if (clean.includes(pattern)) {
        return entry;
      }
    }

    // Default fallback
    return {
      key: clean.replace(/\s+/g, '_').substring(0, 30),
      name: rawName,
      category: 'OUTROS',
    };
  }
}
