import { Injectable } from '@nestjs/common';

@Injectable()
export class BiomarkerNormalizerService {
  private dictionary: Record<string, { key: string; name: string; category: string }> = {
    'GLUCOSE': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLIC' },
    'GLICOSE': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLIC' },
    'GLICEMIA': { key: 'GLUCOSE', name: 'Glicose', category: 'METABOLIC' },
    'HBA1C': { key: 'HBA1C', name: 'Hemoglobina Glicada', category: 'METABOLIC' },
    'HEMOGLOBINA GLICADA': { key: 'HBA1C', name: 'Hemoglobina Glicada', category: 'METABOLIC' },
    'INSULIN': { key: 'INSULIN', name: 'Insulina', category: 'METABOLIC' },
    'INSULINA': { key: 'INSULIN', name: 'Insulina', category: 'METABOLIC' },
    'HOMA_IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLIC' },
    'HOMA-IR': { key: 'HOMA_IR', name: 'HOMA-IR', category: 'METABOLIC' },
    'TOTAL_CHOLESTEROL': { key: 'TOTAL_CHOLESTEROL', name: 'Colesterol Total', category: 'LIPID' },
    'COLESTEROL TOTAL': { key: 'TOTAL_CHOLESTEROL', name: 'Colesterol Total', category: 'LIPID' },
    'LDL': { key: 'LDL', name: 'Colesterol LDL', category: 'LIPID' },
    'HDL': { key: 'HDL', name: 'Colesterol HDL', category: 'LIPID' },
    'TRIGLYCERIDES': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPID' },
    'TRIGLICERIDEOS': { key: 'TRIGLYCERIDES', name: 'Triglicerídeos', category: 'LIPID' },
    'APOB': { key: 'APOB', name: 'Apolipoproteína B', category: 'LIPID' },
    'TSH': { key: 'TSH', name: 'TSH', category: 'THYROID' },
    'FREE_T3': { key: 'FREE_T3', name: 'T3 Livre', category: 'THYROID' },
    'T3 LIVRE': { key: 'FREE_T3', name: 'T3 Livre', category: 'THYROID' },
    'FREE_T4': { key: 'FREE_T4', name: 'T4 Livre', category: 'THYROID' },
    'T4 LIVRE': { key: 'FREE_T4', name: 'T4 Livre', category: 'THYROID' },
    'AST': { key: 'AST', name: 'AST (TGO)', category: 'HEPATIC' },
    'TGO': { key: 'AST', name: 'AST (TGO)', category: 'HEPATIC' },
    'ALT': { key: 'ALT', name: 'ALT (TGP)', category: 'HEPATIC' },
    'TGP': { key: 'ALT', name: 'ALT (TGP)', category: 'HEPATIC' },
    'GGT': { key: 'GGT', name: 'Gama-GT', category: 'HEPATIC' },
    'GAMA GT': { key: 'GGT', name: 'Gama-GT', category: 'HEPATIC' },
    'CREATININE': { key: 'CREATININE', name: 'Creatinina', category: 'RENAL' },
    'CREATININA': { key: 'CREATININE', name: 'Creatinina', category: 'RENAL' },
    'UREA': { key: 'UREA', name: 'Ureia', category: 'RENAL' },
    'UREIA': { key: 'UREA', name: 'Ureia', category: 'RENAL' },
    'EGFR': { key: 'EGFR', name: 'Taxa de Filtração Glomerular (eGFR)', category: 'RENAL' },
    'TAXA DE FILTRACAO': { key: 'EGFR', name: 'Taxa de Filtração Glomerular (eGFR)', category: 'RENAL' },
    'URIC_ACID': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },
    'ACIDO URICO': { key: 'URIC_ACID', name: 'Ácido Úrico', category: 'RENAL' },
    'VITAMIN_D': { key: 'VITAMIN_D', name: 'Vitamina D (25-OH)', category: 'NUTRITIONAL' },
    'VITAMINA D': { key: 'VITAMIN_D', name: 'Vitamina D (25-OH)', category: 'NUTRITIONAL' },
    'VITAMIN_B12': { key: 'VITAMIN_B12', name: 'Vitamina B12', category: 'NUTRITIONAL' },
    'VITAMINA B12': { key: 'VITAMIN_B12', name: 'Vitamina B12', category: 'NUTRITIONAL' },
    'FERRITIN': { key: 'FERRITIN', name: 'Ferritina', category: 'IRON' },
    'FERRITINA': { key: 'FERRITIN', name: 'Ferritina', category: 'IRON' },
    'IRON': { key: 'IRON', name: 'Ferro Sérico', category: 'IRON' },
    'FERRO': { key: 'IRON', name: 'Ferro Sérico', category: 'IRON' },
    'MAGNESIUM': { key: 'MAGNESIUM', name: 'Magnésio', category: 'MINERALS' },
    'MAGNESIO': { key: 'MAGNESIUM', name: 'Magnésio', category: 'MINERALS' },
    'ZINC': { key: 'ZINC', name: 'Zinco', category: 'MINERALS' },
    'ZINCO': { key: 'ZINC', name: 'Zinco', category: 'MINERALS' },
    'TOTAL_TESTOSTERONE': { key: 'TOTAL_TESTOSTERONE', name: 'Testosterona Total', category: 'HORMONAL' },
    'TESTOSTERONA TOTAL': { key: 'TOTAL_TESTOSTERONE', name: 'Testosterona Total', category: 'HORMONAL' },
    'ESTRADIOL': { key: 'ESTRADIOL', name: 'Estradiol', category: 'HORMONAL' },
    'CORTISOL': { key: 'CORTISOL', name: 'Cortisol', category: 'HORMONAL' },
    'HS_CRP': { key: 'HS_CRP', name: 'Proteína C-Reativa (PCR)', category: 'INFLAMMATORY' },
    'PCR': { key: 'HS_CRP', name: 'Proteína C-Reativa (PCR)', category: 'INFLAMMATORY' },
    'HOMOCYSTEINE': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'CARDIOVASCULAR' },
    'HOMOCISTEINA': { key: 'HOMOCYSTEINE', name: 'Homocisteína', category: 'CARDIOVASCULAR' },
    'HEMOGLOBIN': { key: 'HEMOGLOBIN', name: 'Hemoglobina', category: 'HEMATOLOGY' },
    'HEMOGLOBINA': { key: 'HEMOGLOBIN', name: 'Hemoglobina', category: 'HEMATOLOGY' },
    'HEMATOCRIT': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMATOLOGY' },
    'HEMATOCRITO': { key: 'HEMATOCRIT', name: 'Hematócrito', category: 'HEMATOLOGY' },
    'MCV': { key: 'MCV', name: 'Volume Corpuscular Médio (VCM)', category: 'HEMATOLOGY' },
    'VCM': { key: 'MCV', name: 'Volume Corpuscular Médio (VCM)', category: 'HEMATOLOGY' },
    'RDW': { key: 'RDW', name: 'RDW', category: 'HEMATOLOGY' },
    'WBC': { key: 'WBC', name: 'Leucócitos (WBC)', category: 'HEMATOLOGY' },
    'LEUCOCITOS': { key: 'WBC', name: 'Leucócitos (WBC)', category: 'HEMATOLOGY' },
    'PLATELETS': { key: 'PLATELETS', name: 'Plaquetas', category: 'HEMATOLOGY' },
    'PLAQUETAS': { key: 'PLATELETS', name: 'Plaquetas', category: 'HEMATOLOGY' },
    'ALBUMIN': { key: 'ALBUMIN', name: 'Albumina', category: 'METABOLIC' },
    'ALBUMINA': { key: 'ALBUMIN', name: 'Albumina', category: 'METABOLIC' },
    'ALP': { key: 'ALP', name: 'Fosfatase Alcalina', category: 'HEPATIC' },
    'FOSFATASE ALCALINA': { key: 'ALP', name: 'Fosfatase Alcalina', category: 'HEPATIC' },
    'LYMPHOCYTE_PCT': { key: 'LYMPHOCYTE_PCT', name: 'Linfócitos (%)', category: 'HEMATOLOGY' },
    'LINFOCITOS': { key: 'LYMPHOCYTE_PCT', name: 'Linfócitos (%)', category: 'HEMATOLOGY' },
  };

  normalize(name: string): { key: string; name: string; category: string } {
    const clean = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    for (const [pattern, entry] of Object.entries(this.dictionary)) {
      if (clean.includes(pattern)) {
        return entry;
      }
    }

    return {
      key: clean.replace(/\s+/g, '_').substring(0, 30),
      name: name,
      category: 'OTHER',
    };
  }
}
