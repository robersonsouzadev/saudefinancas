import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LabOcrService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({ apiKey: this.configService.get('OPENAI_API_KEY') });
  }

  async parseExamImage(imageBase64: string, mimeType: string): Promise<any> {
    const prompt = `Extraia as informações do exame de sangue ou urina da imagem fornecida. Retorne estritamente em formato JSON estruturado com os seguintes campos:
    {
      "laboratory": "Nome do laboratório",
      "exam_date": "YYYY-MM-DD",
      "items": [
        {
          "name": "Nome do biomarcador",
          "value": 0.0,
          "unit": "Unidade (ex: mg/dL)",
          "reference_min": 0.0,
          "reference_max": 0.0
        }
      ]
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em leitura de exames laboratoriais. Retorne apenas JSON.' },
          { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (e) {
      return { laboratory: null, exam_date: null, items: [] };
    }
  }
}
