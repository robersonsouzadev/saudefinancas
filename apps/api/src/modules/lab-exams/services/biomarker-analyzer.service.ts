import { Injectable } from '@nestjs/common';

export interface BiomarkerItemInput {
  biomarkerKey: string;
  biomarkerName: string;
  category: any;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  optimalMin?: number;
  optimalMax?: number;
}

@Injectable()
export class BiomarkerAnalyzerService {
  analyzeResults(results: BiomarkerItemInput[], previousResultsMap?: Map<string, number>) {
    const analyzedResults = results.map((item) => {
      const status = this.determineStatus(item.value, item.referenceMin, item.referenceMax, item.optimalMin, item.optimalMax);
      let delta: number | undefined;
      let previousValue: number | undefined;

      if (previousResultsMap && previousResultsMap.has(item.biomarkerKey)) {
        previousValue = previousResultsMap.get(item.biomarkerKey);
        if (previousValue && previousValue > 0) {
          delta = Math.round(((item.value - previousValue) / previousValue) * 1000) / 10;
        }
      }

      return {
        ...item,
        status,
        delta,
        previousValue,
      };
    });

    const patterns = this.detectPatterns(analyzedResults);

    return { analyzedResults, patterns };
  }

  private determineStatus(
    val: number,
    refMin?: number,
    refMax?: number,
    optMin?: number,
    optMax?: number,
  ): 'CRITICO_BAIXO' | 'BAIXO' | 'NORMAL' | 'OTIMO' | 'ALTO' | 'CRITICO_ALTO' {
    if (refMax && val > refMax * 1.5) return 'CRITICO_ALTO';
    if (refMin && val < refMin * 0.5) return 'CRITICO_BAIXO';

    if (optMin !== undefined && optMax !== undefined && val >= optMin && val <= optMax) {
      return 'OTIMO';
    }

    if (refMax !== undefined && val > refMax) return 'ALTO';
    if (refMin !== undefined && val < refMin) return 'BAIXO';

    return 'NORMAL';
  }

  private detectPatterns(results: any[]) {
    const patterns: Array<{ title: string; description: string; severity: 'WARNING' | 'CRITICAL' | 'INFO' }> = [];
    const valMap = new Map<string, number>();
    results.forEach((r) => valMap.set(r.biomarkerKey, r.value));

    const insulin = valMap.get('INSULIN');
    const tg = valMap.get('TRIGLYCERIDES');
    const hdl = valMap.get('HDL');
    const glucose = valMap.get('GLUCOSE');
    const ldl = valMap.get('LDL');

    // Pattern 1: Insulin Resistance
    if (insulin && insulin > 6.0 && tg && hdl && tg / hdl > 3.0) {
      patterns.push({
        title: 'Resistência Insulínica Leve Detectada',
        description: `Elevação combinada de Insulina de Jejum (${insulin} µIU/mL) e Razão Triglicerídeos/HDL (${(tg / hdl).toFixed(1)}). Recomendado reduzir carboidratos refinados e praticar exercício físico.`,
        severity: 'WARNING',
      });
    }

    // Pattern 2: Lipid Profile evolution
    if (ldl && ldl < 90 && hdl && hdl > 50) {
      patterns.push({
        title: 'Perfil Lipídico Excelente',
        description: `LDL-C em nível ótimo (${ldl} mg/dL) com HDL protetor (${hdl} mg/dL), indicando baixo risco cardiovascular.`,
        severity: 'INFO',
      });
    }

    return patterns;
  }
}
