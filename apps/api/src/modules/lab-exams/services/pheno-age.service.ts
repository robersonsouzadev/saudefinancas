import { Injectable } from '@nestjs/common';

@Injectable()
export class PhenoAgeService {
  calculatePhenoAge(chronologicalAge: number, biomarkers: Record<string, number>): number | null {
    const alb = biomarkers['ALBUMIN'] || 4.5;
    const creat = biomarkers['CREATININE'] || 0.9;
    const glu = biomarkers['GLUCOSE'] || 90;
    const crp = biomarkers['HS_CRP'] || 1.0;
    const lymph = biomarkers['LYMPHOCYTE_PCT'] || 30;
    const mcv = biomarkers['MCV'] || 90;
    const rdw = biomarkers['RDW'] || 13.0;
    const alp = biomarkers['ALP'] || 70;
    const wbc = biomarkers['WBC'] || 6.0;

    let xb = -19.907 
      - 0.0336 * alb 
      + 0.0095 * creat 
      + 0.1953 * glu 
      + 0.0954 * Math.log(crp + 0.1) 
      - 0.0120 * lymph 
      + 0.0268 * mcv 
      + 0.3306 * rdw 
      + 0.00188 * alp 
      + 0.0554 * wbc
      + 0.0804 * chronologicalAge;
      
    const mortalityRisk = 1 - Math.exp(-Math.exp(xb) * (Math.exp(0.0076927) - 1) / 0.0076927);
    const phenoAge = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityRisk)) / 0.090165;
    
    return isNaN(phenoAge) ? null : Number(phenoAge.toFixed(1));
  }
}
