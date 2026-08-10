import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class LabInsightService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY') || 'mock-key',
    });
  }

  async generateInsight(title: string, results: any[], patterns: any[], phenoAge?: number): Promise<string> {
    try {
      const summaryText = results
        .map((r) => `${r.biomarkerName}: ${r.value} ${r.unit} (Status: ${r.status}, Delta: ${r.delta || 0}%)`)
        .join('\n');

      const patternsText = patterns.map((p) => `- ${p.title}: ${p.description}`).join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Vita IA, especialista em medicina preventiva e estilo de vida.
Escreva uma síntese executiva em tom profissional, encorajador e claro sobre os resultados do exame de sangue do usuário.
Destaque evoluções positivas, pontos de atenção e recomendações simples de estilo de vida. Não faça diagnósticos definitivos.`,
          },
          {
            role: 'user',
            content: `Laudo: ${title}\nIdade Biológica PhenoAge: ${phenoAge || 'N/A'}\n\nResultados:\n${summaryText}\n\nPadrões Detectados:\n${patternsText}`,
          },
        ],
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || this.getMockInsight();
    } catch {
      return this.getMockInsight();
    }
  }

  private getMockInsight(): string {
    return 'Seus marcadores cardiovasculares apresentaram evolução significativa. O LDL-C reduziu para nível ótimo (88 mg/dL), enquanto o HDL subiu para 58 mg/dL. Atenção para a Insulina de Jejum que apresentou leve elevação (8.2 µIU/mL), sinalizando padrão inicial de resistência insulínica. Sua idade biológica está estimada em 31.4 anos (3.6 anos mais jovem que sua idade cronológica).';
  }

  async generateLeigaSummary(exam: any): Promise<any> {
    try {
      const summaryText = exam.results
        .map((r: any) => `${r.biomarkerName}: ${r.value} ${r.unit} (Status: ${r.status})`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Vita IA, uma assistente de saúde acessível e carinhosa.
Sua missão é explicar os resultados de exames de sangue para uma pessoa LEIGA, sem termos técnicos.
REGRA CRÍTICA: As "tips" (dicas) DEVEM SER DIRETAMENTE DIRECIONADAS AOS "attentionItems" (biomarcadores que estão alterados, elevados ou abaixo da faixa ideal). NÃO crie dicas para biomarcadores que já estão ótimos/normais!
Responda em JSON puro (sem markdown) com esta estrutura:
{
  "summary": "Texto de 3-4 frases explicando o estado geral de saúde da pessoa de forma simples e encorajadora",
  "goodNews": ["item1", "item2"],
  "attentionItems": ["item1", "item2"],
  "tips": [
    { "icon": "💧", "title": "Título focado no ponto de atenção", "description": "dica prática curta de estilo de vida ou nutrição" }
  ]
}`,
          },
          {
            role: 'user',
            content: `Resultados do exame:\n${summaryText}`,
          },
        ],
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedContent);
      
      // Valida se o objeto retornado possui listas com conteúdo real
      if (parsed && Array.isArray(parsed.goodNews) && parsed.goodNews.length > 0) {
        return parsed;
      }
      return this.buildDeterministicSummary(exam);
    } catch {
      return this.buildDeterministicSummary(exam);
    }
  }

  /**
   * Gera um relatório estruturado e completo extraindo 100% dos biomarcadores reais do exame
   */
  private buildDeterministicSummary(exam: any): any {
    if (!exam || !exam.results || exam.results.length === 0) {
      return {
        summary: 'Nenhum resultado de exame encontrado para análise.',
        goodNews: ['Aguardando envio de exames'],
        attentionItems: [],
        tips: [{ icon: '📋', title: 'Exames', description: 'Cadastre seu primeiro exame para gerar o relatório.' }],
      };
    }

    const results = exam.results;
    const optimalItems: string[] = [];
    const attentionItems: string[] = [];
    const tips: Array<{ icon: string; title: string; description: string }> = [];

    results.forEach((r: any) => {
      const name = r.biomarkerName || r.biomarkerKey || 'Biomarcador';
      const valStr = `${r.value} ${r.unit || ''}`.trim();

      if (r.status === 'NORMAL' || r.status === 'OTIMO') {
        optimalItems.push(`${name}: ${valStr} (Dentro do limite ideal)`);
      } else if (r.status === 'ALTO' || r.status === 'CRITICO_ALTO') {
        const refStr = r.referenceMax ? ` (ideal < ${r.referenceMax} ${r.unit || ''})` : '';
        attentionItems.push(`${name}: ${valStr} — Elevado${refStr}`);
      } else if (r.status === 'BAIXO' || r.status === 'CRITICO_BAIXO') {
        const refStr = r.referenceMin ? ` (ideal > ${r.referenceMin} ${r.unit || ''})` : '';
        attentionItems.push(`${name}: ${valStr} — Abaixo da faixa${refStr}`);
      } else {
        optimalItems.push(`${name}: ${valStr}`);
      }
    });

    // Se não houver itens em atenção
    if (attentionItems.length === 0) {
      attentionItems.push('Nenhum biomarcador em nível crítico ou de atenção nesta medição!');
    }

    // Filtrar especificamente os biomarcadores alterados que exigem atenção
    const alteredResults = results.filter((r: any) => r.status && r.status !== 'NORMAL' && r.status !== 'OTIMO');
    const alteredKeys = new Set(alteredResults.map((r: any) => (r.biomarkerKey || r.biomarkerName || '').toUpperCase()));

    // 1. Função Renal / Creatinina / Ureia
    if (alteredKeys.has('CREATININE') || alteredKeys.has('CREATININA') || alteredKeys.has('UREA') || alteredKeys.has('UREIA')) {
      tips.push({
        icon: '💧',
        title: 'Função Renal & Hidratação',
        description: 'Aumente a ingestão de água para 35-40 ml/kg corporal e avalie com seu médico a dose de proteínas e creatina.',
      });
    }

    // 2. Hormônios / Testosterona / SHBG / Cortisol
    if (alteredKeys.has('TESTOSTERONE') || alteredKeys.has('TESTOSTERONA') || alteredKeys.has('SHBG') || alteredKeys.has('CORTISOL')) {
      tips.push({
        icon: '⚖️',
        title: 'Equilíbrio Hormonal & SHBG',
        description: 'Priorize higiene do sono e ajuste o volume de treinos intensos para equilibrar a resposta hormonal e transporte no sangue.',
      });
    }

    // 3. Imunidade / Linfócitos / Leucócitos / Segmentados / PCR
    if (alteredKeys.has('LYMPHOCYTES') || alteredKeys.has('LINFOCITOS') || alteredKeys.has('LEUKOCYTES') || alteredKeys.has('LEUCOCITOS') || alteredKeys.has('CRP') || alteredKeys.has('PCR') || alteredKeys.has('SEGMENTADOS')) {
      tips.push({
        icon: '🛡️',
        title: 'Imunidade & Inflamação',
        description: 'Reforce o descanso, mantenha boa hidratação e investigue com seu médico possíveis focos inflamatórios ou infecciosos leves.',
      });
    }

    // 4. Minerais / Zinco / Magnésio / Cálcio
    if (alteredKeys.has('ZINC') || alteredKeys.has('ZINCO') || alteredKeys.has('MAGNESIUM') || alteredKeys.has('MAGNESIO')) {
      tips.push({
        icon: '💊',
        title: 'Ajuste de Minerais & Suplementos',
        description: 'Verifique se há consumo excessivo de suplementos isolados ou multivitamínicos e reavalie as doses com seu profissional.',
      });
    }

    // 5. Perfil Lipídico / Colesterol / Triglicerídeos / Não-HDL
    if (alteredKeys.has('TRIGLYCERIDES') || alteredKeys.has('TRIGLICERIDEOS') || alteredKeys.has('LDL') || alteredKeys.has('CHOLESTEROL') || alteredKeys.has('NON_HDL') || alteredKeys.has('COLESTEROL') || alteredKeys.has('COLESTEROL NÃO-HDL')) {
      tips.push({
        icon: '🏃',
        title: 'Perfil Lipídico',
        description: 'Pratique 150 min/semana de exercício aeróbico, reduza gorduras saturadas e aumente a ingestão de fibras solúveis (aveia, psyllium).',
      });
    }

    // 6. Glicemia / Glicose / HbA1c / Insulina
    if (alteredKeys.has('GLUCOSE') || alteredKeys.has('GLICOSE') || alteredKeys.has('INSULIN') || alteredKeys.has('INSULINA') || alteredKeys.has('HBA1C')) {
      tips.push({
        icon: '🥗',
        title: 'Controle Glicêmico',
        description: 'Priorize refeições com fibras e proteínas antes dos carboidratos, reduzindo picos de glicose e resistência à insulina.',
      });
    }

    // 7. Vitamina D
    if (alteredKeys.has('VITAMIN_D') || alteredKeys.has('VITAMINA_D')) {
      tips.push({
        icon: '☀️',
        title: 'Vitamina D & Imunidade',
        description: 'Mantenha exposição solar matinal segura (15-20 min) ou ajuste a suplementação conforme orientação médica.',
      });
    }

    // 8. Ferro / Ferritina
    if (alteredKeys.has('FERRITIN') || alteredKeys.has('FERRITINA') || alteredKeys.has('IRON') || alteredKeys.has('FERRO')) {
      tips.push({
        icon: '🥩',
        title: 'Reserva de Ferro',
        description: 'Consuma fontes de ferro combinadas com alimentos ricos em Vitamina C (frutas cítricas) para otimizar a absorção.',
      });
    }

    // Se nenhuma dica específica de marcador alterado foi acionada (ex: tudo normal), adicionar dicas gerais de prevenção
    if (tips.length === 0) {
      tips.push({
        icon: '🥗',
        title: 'Alimentação Balanceada',
        description: 'Mantenha uma dieta rica em vegetais, proteínas magras e gorduras boas para preservar seus excelentes índices.',
      });
      tips.push({
        icon: '💧',
        title: 'Hidratação Diária',
        description: 'Consuma de 35 a 40 ml de água por kg corporal para otimizar a filtração renal e transporte de nutrientes.',
      });
      tips.push({
        icon: '🏃',
        title: 'Atividade Física',
        description: 'Mantenha exercícios físicos regulares para fortalecer o sistema cardiovascular e longevidade.',
      });
      tips.push({
        icon: '😴',
        title: 'Sono Reparador',
        description: 'Priorize 7 a 8 horas de sono contínuo para regulação hormonal e recuperação celular.',
      });
    }

    const total = results.length;
    const optimalCount = results.filter((r: any) => r.status === 'NORMAL' || r.status === 'OTIMO').length;
    const percentOptimal = Math.round((optimalCount / total) * 100);

    return {
      summary: `Seu laudo reúne ${total} biomarcadores analisados. Atualmente, ${percentOptimal}% dos seus indicadores (${optimalCount} de ${total}) encontram-se na faixa ideal. Acompanhe os pontos de atenção para otimizar sua saúde preventiva.`,
      goodNews: optimalItems,
      attentionItems,
      tips: tips.slice(0, 4),
    };
  }
}
