import { Injectable } from '@nestjs/common';

export interface MetabolicPattern {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

@Injectable()
export class BiomarkerAnalyzerService {
  analyzeResults(results: any[], previousResultsMap?: Map<string, number>): { analyzedResults: any[]; patterns: MetabolicPattern[] } {
    const analyzedResults = results.map(result => {
      let status = 'NORMAL';
      if (result.value < (result.referenceMin || 0)) {
        status = 'BAIXO';
      } else if (result.value > (result.referenceMax || 9999)) {
        status = 'ALTO';
      }
      return { ...result, status };
    });

    const patterns: MetabolicPattern[] = [];
    const values = new Map(results.map(r => [r.biomarkerKey || r.key, r.value]));

    // 1 & 2: Resistência Insulínica (HOMA-IR)
    if (values.has('INSULIN') && values.has('GLUCOSE')) {
      const insulin = values.get('INSULIN')!;
      const glucose = values.get('GLUCOSE')!;
      const homaIr = (insulin * glucose) / 405;
      if (homaIr >= 4.0) {
        patterns.push({
          title: 'Resistência Insulínica Severa',
          description: `HOMA-IR em ${homaIr.toFixed(1)} (ideal < 2.0). Alto risco de esteatose e pré-diabetes.`,
          severity: 'CRITICAL',
        });
      } else if (homaIr > 2.0) {
        patterns.push({
          title: 'Resistência Insulínica',
          description: `HOMA-IR em ${homaIr.toFixed(1)} (ideal < 2.0). Sugere sensibilidade à insulina reduzida.`,
          severity: 'WARNING',
        });
      }
    }

    // 3: Fígado Gorduroso / NAFLD (ALT vs AST)
    if (values.has('ALT') && values.has('AST')) {
      const alt = values.get('ALT')!;
      const ast = values.get('AST')!;
      if (alt > ast && alt > 35) {
        patterns.push({
          title: 'Padrão Hepático / Esteatose (NAFLD)',
          description: `Relação ALT/AST (${alt}/${ast}) elevada com TGP acima de 35 U/L. Recomendado ultrassom de abdômen.`,
          severity: 'WARNING',
        });
      }
    }
    
    // 4 & 5: Tireoide (TSH & T4 Livre)
    if (values.has('TSH')) {
      const tsh = values.get('TSH')!;
      const t4l = values.get('T4_LIVRE') || values.get('T4_FREE');
      if (tsh > 4.5 && t4l && t4l < 0.8) {
        patterns.push({
          title: 'Hipotireoidismo Clínico',
          description: `TSH elevado (${tsh} mIU/L) com T4 Livre reduzido (${t4l} ng/dL). Avaliar sintomatologia e endocrinologista.`,
          severity: 'CRITICAL',
        });
      } else if (tsh > 2.5 && tsh <= 4.5) {
        patterns.push({
          title: 'Hipotireoidismo Funcional',
          description: `TSH em ${tsh} mIU/L (zona funcional ideal 1.0 - 2.5 mIU/L). Acompanhar evolução.`,
          severity: 'INFO',
        });
      }
    }

    // 6 & 7: Estoque de Ferro & Inflamação
    if (values.has('FERRITIN')) {
      const ferritin = values.get('FERRITIN')!;
      if (ferritin < 30) {
        patterns.push({
          title: 'Ferropenia / Baixa Reserva de Ferro',
          description: `Ferritina em ${ferritin} ng/mL (ideal > 50 ng/mL). Reserva tecidual de ferro deficiente.`,
          severity: 'WARNING',
        });
      } else if (ferritin > 250) {
        patterns.push({
          title: 'Padrão Inflamatório / Hiperferritinemia',
          description: `Ferritina em ${ferritin} ng/mL. Ferritina alta atua como reagente de fase aguda inflamatório.`,
          severity: 'WARNING',
        });
      }
    }
    
    // 8: Risco Vascular e Inflamação Sistêmica
    const homocysteine = values.get('HOMOCYSTEINE');
    const crp = values.get('HS_CRP') || values.get('PCR');
    if ((homocysteine && homocysteine > 10) || (crp && crp > 2.0)) {
      patterns.push({
        title: 'Risco Cardiometabólico / Inflamação',
        description: `Marcadores de risco vascular (Homocisteína: ${homocysteine || '--'}, PCR-us: ${crp || '--'}) em zona de atenção.`,
        severity: 'CRITICAL',
      });
    }

    // 9: Dislipidemia Aterogênica
    if (values.has('LDL') && values.has('HDL') && values.has('TRIGLYCERIDES')) {
      const ldl = values.get('LDL')!;
      const hdl = values.get('HDL')!;
      const tg = values.get('TRIGLYCERIDES')!;
      if (ldl > 130 && hdl < 40 && tg > 150) {
        patterns.push({
          title: 'Triad Dislipidêmica Aterogênica',
          description: `LDL elevado (${ldl}), HDL baixo (${hdl}) e Triglicerídeos altos (${tg}). Triad de alto risco aterogênico.`,
          severity: 'CRITICAL',
        });
      }
    }

    // 10 & 11: Deficiência de Vitamina D
    if (values.has('VITAMIN_D') || values.has('VITAMINA_D')) {
      const vitD = values.get('VITAMIN_D') || values.get('VITAMINA_D')!;
      if (vitD < 20) {
        patterns.push({
          title: 'Deficiência Severa de Vitamina D',
          description: `Vitamina D 25-OH em ${vitD} ng/mL (ideal 40-60 ng/mL). Risco ósseo e de imunossenescência.`,
          severity: 'CRITICAL',
        });
      } else if (vitD < 30) {
        patterns.push({
          title: 'Insuficiência de Vitamina D',
          description: `Vitamina D em ${vitD} ng/mL (faixa ideal para otimização: 40 - 60 ng/mL).`,
          severity: 'WARNING',
        });
      }
    }

    // 12: Hiperuricemia
    if (values.has('URIC_ACID') || values.has('ACIDO_URICO')) {
      const uric = values.get('URIC_ACID') || values.get('ACIDO_URICO')!;
      if (uric > 7.0) {
        patterns.push({
          title: 'Hiperuricemia / Risco de Gota',
          description: `Ácido úrico elevado em ${uric} mg/dL. Risco de precipitação de cristais e estresse renal.`,
          severity: 'WARNING',
        });
      }
    }

    // 13: Síndrome Metabólica Parcial
    if (values.has('GLUCOSE') && values.has('TRIGLYCERIDES') && values.has('HDL')) {
      const glucose = values.get('GLUCOSE')!;
      const tg = values.get('TRIGLYCERIDES')!;
      const hdl = values.get('HDL')!;
      if (glucose >= 100 && tg >= 150 && hdl <= 40) {
        patterns.push({
          title: 'Perfil Sugestivo de Síndrome Metabólica',
          description: `Combinação de Glicose de jejum (${glucose}), Triglicerídeos (${tg}) e HDL (${hdl}).`,
          severity: 'CRITICAL',
        });
      }
    }

    return { analyzedResults, patterns };
  }
}
