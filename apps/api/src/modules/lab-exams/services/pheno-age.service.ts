import { Injectable } from '@nestjs/common';

@Injectable()
export class PhenoAgeService {
  /**
   * Morgan Levine's PhenoAge calculation based on 9 blood biomarkers + chronological age.
   */
  calculatePhenoAge(chronologicalAge: number = 35, biomarkers: Record<string, number>): number {
    const alb = biomarkers['ALBUMIN'] || 4.5;
    const cr = biomarkers['CREATININE'] || 0.9;
    const glu = biomarkers['GLUCOSE'] || 90;
    const crp = biomarkers['HS_CRP'] || 0.5;
    const lymp = biomarkers['LYMPHOCYTE_PCT'] || 30;
    const mcv = biomarkers['MCV'] || 88;
    const rdw = biomarkers['RDW'] || 12.5;
    const alp = biomarkers['ALP'] || 65;
    const wbc = biomarkers['WBC'] || 6.5;

    // Linear combination (b0 + b1*x1 + ...)
    const b0 = -19.921;
    const b_age = 0.0804 * chronologicalAge;
    const b_alb = -0.0336 * alb;
    const b_cr = 0.0095 * cr;
    const b_glu = 0.1953 * (glu / 18.0158); // convert mg/dL to mmol/L
    const b_crp = 0.0954 * Math.log(crp <= 0 ? 0.01 : crp);
    const b_lymp = -0.012 * lymp;
    const b_mcv = 0.0268 * mcv;
    const b_rdw = 0.3306 * rdw;
    const b_alp = 0.0019 * alp;
    const b_wbc = 0.0554 * wbc;

    const xb = b0 + b_age + b_alb + b_cr + b_glu + b_crp + b_lymp + b_mcv + b_rdw + b_alp + b_wbc;

    // Mortality risk score
    const gamma = 0.007692;
    const mortalityScore = 1 - Math.exp(-Math.exp(xb) * (Math.exp(120 * gamma) - 1) / gamma);

    // Phenotypic age formula
    const phenoAge = 141.5022 + Math.log(-0.00553 * Math.log(1 - mortalityScore)) / 0.09165;

    // Return rounded to 1 decimal
    return Math.round(phenoAge * 10) / 10;
  }
}
