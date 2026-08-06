import { Injectable } from '@nestjs/common';

@Injectable()
export class BiomarkerAnalyzerService {
  analyzeResults(results: any[], previousResultsMap?: Map<string, number>): { analyzedResults: any[]; patterns: any[] } {
    const analyzedResults = results.map(result => {
      let status = 'NORMAL';
      if (result.value < (result.referenceMin || 0)) {
        status = 'BAIXO';
      } else if (result.value > (result.referenceMax || 9999)) {
        status = 'ALTO';
      }
      return { ...result, status };
    });

    const patterns = [];
    const values = new Map(results.map(r => [r.biomarkerKey || r.key, r.value]));

    if (values.get('INSULIN') && values.get('GLUCOSE')) {
      const insulin = values.get('INSULIN');
      const glucose = values.get('GLUCOSE');
      const homaIr = (insulin * glucose) / 405;
      if (homaIr > 2.0) {
        patterns.push({ pattern: 'Resistência Insulínica', description: 'HOMA-IR elevado sugerindo resistência insulínica.' });
      }
    }

    if (values.get('ALT') && values.get('AST')) {
      if (values.get('ALT') > values.get('AST')) {
         patterns.push({ pattern: 'NAFLD/Fígado Gorduroso', description: 'Padrão hepático sugestivo de esteatose.' });
      }
    }
    
    if (values.get('TSH')) {
      const tsh = values.get('TSH');
      if (tsh > 2.5 && tsh <= 4.5) {
         patterns.push({ pattern: 'Hipotireoidismo Funcional', description: 'TSH elevado sugerindo hipotireoidismo funcional.' });
      }
    }

    if (values.get('FERRITIN') && values.get('IRON')) {
       if (values.get('FERRITIN') < 30) {
         patterns.push({ pattern: 'Anemia Ferropriva vs Inflamatória', description: 'Estoque de ferro baixo.' });
       } else if (values.get('FERRITIN') > 200) {
         patterns.push({ pattern: 'Anemia Ferropriva vs Inflamatória', description: 'Ferritina elevada pode ser padrão inflamatório.' });
       }
    }
    
    if (values.get('HOMOCYSTEINE') && values.get('HS_CRP')) {
      if (values.get('HOMOCYSTEINE') > 10 || values.get('HS_CRP') > 2) {
        patterns.push({ pattern: 'Risco Vascular', description: 'Marcadores inflamatórios e/ou de risco vascular elevados.' });
      }
    }

    return { analyzedResults, patterns };
  }
}
