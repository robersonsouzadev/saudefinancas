import { Injectable } from '@nestjs/common';

export interface PhenoAgeRequirement {
  key: string;
  name: string;
}

export const PHENO_AGE_REQUIRED_BIOMARKERS: PhenoAgeRequirement[] = [
  { key: 'ALBUMIN', name: 'Albumina' },
  { key: 'CREATININE', name: 'Creatinina' },
  { key: 'GLUCOSE', name: 'Glicose de Jejum' },
  { key: 'HS_CRP', name: 'Proteína C-Reativa (PCR-us)' },
  { key: 'LYMPHOCYTE_PCT', name: 'Linfócitos (%)' },
  { key: 'MCV', name: 'VCM (Volume Corpuscular Médio)' },
  { key: 'RDW', name: 'RDW (Variabilidade de Hemácias)' },
  { key: 'ALP', name: 'Fosfatase Alcalina' },
  { key: 'WBC', name: 'Leucócitos (Glóbulos Brancos)' },
];

@Injectable()
export class PhenoAgeService {
  getMissingBiomarkers(biomarkers: Record<string, number>): { missing: string[]; provided: string[]; isComplete: boolean } {
    const missing: string[] = [];
    const provided: string[] = [];

    PHENO_AGE_REQUIRED_BIOMARKERS.forEach((req) => {
      const val =
        biomarkers[req.key] ||
        (req.key === 'HS_CRP' ? biomarkers['PCR'] || biomarkers['CRP'] : undefined) ||
        (req.key === 'GLUCOSE' ? biomarkers['GLICOSE'] : undefined) ||
        (req.key === 'ALBUMIN' ? biomarkers['ALBUMINA'] : undefined);

      if (val !== undefined && val !== null) {
        provided.push(req.name);
      } else {
        missing.push(req.name);
      }
    });

    return {
      missing,
      provided,
      isComplete: missing.length === 0,
    };
  }

  calculatePhenoAge(chronologicalAge: number, biomarkers: Record<string, number>): number | null {
    const alb = biomarkers['ALBUMIN'] || biomarkers['ALBUMINA'] || 4.5;
    const creat = biomarkers['CREATININE'] || 0.9;
    const glu = biomarkers['GLUCOSE'] || biomarkers['GLICOSE'] || 90;
    const crp = biomarkers['HS_CRP'] || biomarkers['PCR'] || biomarkers['CRP'] || 1.0;
    const lymph = biomarkers['LYMPHOCYTE_PCT'] || 30;
    const mcv = biomarkers['MCV'] || 90;
    const rdw = biomarkers['RDW'] || 13.0;
    const alp = biomarkers['ALP'] || 70;
    const wbc = biomarkers['WBC'] || 6.0;

    let xb =
      -19.907 -
      0.0336 * alb +
      0.0095 * creat +
      0.1953 * glu +
      0.0954 * Math.log(crp + 0.1) -
      0.0120 * lymph +
      0.0268 * mcv +
      0.3306 * rdw +
      0.00188 * alp +
      0.0554 * wbc +
      0.0804 * chronologicalAge;

    const mortalityRisk = 1 - Math.exp((-Math.exp(xb) * (Math.exp(0.0076927) - 1)) / 0.0076927);
    const phenoAge = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityRisk)) / 0.090165;

    return isNaN(phenoAge) ? null : Number(phenoAge.toFixed(1));
  }
}
