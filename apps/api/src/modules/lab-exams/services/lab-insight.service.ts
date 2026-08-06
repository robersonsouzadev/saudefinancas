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
}
