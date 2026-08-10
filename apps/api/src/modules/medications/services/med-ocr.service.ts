import { Injectable, Logger, Optional } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';

export interface ExtractedMedicationData {
  name: string;
  brand?: string;
  dosage: string;
  unit: string;
  type: 'MEDICAMENTO' | 'VITAMINA' | 'SUPLEMENTO' | 'FITOTERAPICO';
  category: 'CONTINUO' | 'TEMPORARIO' | 'SOS';
  instructions?: string;
  currentStock?: number;
  stockAlertAt?: number;
  costPerUnit?: number;
  pharmacy?: string;
  period?: 'MANHA' | 'TARDE' | 'NOITE' | 'MADRUGADA';
  time?: string;
  aiSuccess?: boolean;
  aiMessage?: string;
}

@Injectable()
export class MedOcrService {
  private readonly logger = new Logger(MedOcrService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Optional() private encryption?: EncryptionService,
  ) {}

  private async getOpenAIClient(): Promise<{ client: OpenAI; model: string } | null> {
    // 1. Try OpenAI key from Env/Config
    let openAiKey = this.configService.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

    if (!openAiKey || openAiKey.length < 10) {
      try {
        const dbProv = await this.prisma.llmProvider.findFirst({
          where: { provider: 'openai', isActive: true },
        });
        if (dbProv?.apiKey && this.encryption) {
          openAiKey = this.encryption.decrypt(dbProv.apiKey);
        }
      } catch (err) {
        this.logger.warn('[MedOcrService] Erro ao buscar chave OpenAI no banco', err);
      }
    }

    if (openAiKey && openAiKey.length > 10 && openAiKey !== 'dummy-key-for-init') {
      this.logger.log('[MedOcrService] Usando provedor OpenAI (gpt-4o-mini).');
      return {
        client: new OpenAI({ apiKey: openAiKey.trim(), timeout: 25000 }),
        model: 'gpt-4o-mini',
      };
    }

    // 2. Try Gemini key from Env/Config/DB (supports OpenAI compatible API)
    let geminiKey = this.configService.get('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey.length < 10) {
      try {
        const geminiProv = await this.prisma.llmProvider.findFirst({
          where: { provider: 'gemini', isActive: true },
        });
        if (geminiProv?.apiKey && this.encryption) {
          geminiKey = this.encryption.decrypt(geminiProv.apiKey);
        }
      } catch (err) {
        this.logger.warn('[MedOcrService] Erro ao buscar chave Gemini no banco', err);
      }
    }

    if (geminiKey && geminiKey.length > 10) {
      this.logger.log('[MedOcrService] Usando provedor Gemini Vision (gemini-2.0-flash via OpenAI endpoint).');
      return {
        client: new OpenAI({
          apiKey: geminiKey.trim(),
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
          timeout: 25000,
        }),
        model: 'gemini-2.0-flash',
      };
    }

    return null;
  }

  async parseMedicationImage(imageBase64: string, mimeType: string): Promise<ExtractedMedicationData> {
    this.logger.log(`[MedOcrService] Iniciando leitura OCR de embalagem. Base64 len: ${imageBase64?.length || 0}`);

    const prompt = `Você é um leitor óptico especialista em farmacologia e rótulos de medicamentos, vitaminas e suplementos alimentares do mercado brasileiro.

Examine atentamente a imagem fornecida (embalagem, frasco, caixa, pote ou rótulo) e extraia exatamente as seguintes informações:

1. "name": Nome comercial ou título principal do produto no rótulo. (Exemplos: "NAC + ATIVOS", "Losartana Potássica", "Vitamina D3", "Omega 3", "Glucosamina"). Seja preciso com o nome em destaque!
2. "brand": Marca, logotipo ou laboratório fabricante visível na embalagem. Olhe com ATENÇÃO para logotipos no topo, centro ou rodapé da embalagem (Exemplos: "fortalvit", "EMS", "Medley", "Eurofarma", "Lavitan", "Growth", "Max Titanium", "Aché", "Neo Química", "Sundown", "Bayer").
3. "dosage": Concentração/dosagem principal (Exemplos: "600mg", "50mg", "2000 UI", "1000mg", "10mg/mL").
4. "unit": Formato/unidade ("cápsula", "comprimido", "gota", "ml", "sachê").
5. "type": Classificação exata do produto. Se for suplemento alimentar, retorne "SUPLEMENTO". Se for vitamina, "VITAMINA". Se for medicamento, "MEDICAMENTO". Se fitoterápico, "FITOTERAPICO".
6. "category": "CONTINUO" (para suplementos/vitaminas diárias ou medicamentos crônicos), "TEMPORARIO" ou "SOS".
7. "instructions": Posologia ou recomendação de consumo visível na caixa/bula (Exemplos: "Tomar 1 cápsula ao dia", "Tomar 1 comprimido pela manhã", "1 cápsula ao dia").
8. "currentStock": Quantidade total de cápsulas/comprimidos contidos na embalagem se visível (Exemplo: "120 CÁPSULAS" -> 120, "30 COMPRIMIDOS" -> 30, "60 CÁPSULAS" -> 60). Se não identificar, use 30.
9. "stockAlertAt": Sugestão de estoque mínimo para aviso de nova compra (padrão: 5 ou 10 se frasco grande).
10. "costPerUnit": Valor por unidade se houver etiqueta de preço visível na imagem, senão null.
11. "pharmacy": Nome da farmácia se visível em etiqueta/cupom, senão null.
12. "period": Período do dia sugerido ("MANHA", "TARDE", "NOITE", "MADRUGADA") baseado no produto ou instruções.
13. "time": Horário sugerido no formato HH:mm (ex: "08:00" para MANHA, "20:00" para NOITE).

Retorne ESTRITAMENTE um objeto JSON estruturado:
{
  "name": "NAC + ATIVOS",
  "brand": "fortalvit",
  "dosage": "600mg",
  "unit": "cápsula",
  "type": "SUPLEMENTO",
  "category": "CONTINUO",
  "instructions": "Tomar 1 cápsula ao dia",
  "currentStock": 120,
  "stockAlertAt": 10,
  "costPerUnit": null,
  "pharmacy": null,
  "period": "MANHA",
  "time": "08:00"
}`;

    try {
      const llm = await this.getOpenAIClient();

      if (!llm) {
        throw new Error('Nenhuma chave de API de IA (OpenAI ou Gemini) está configurada ou ativa no sistema.');
      }

      this.logger.log(`[MedOcrService] Enviando requisição para IA modelo ${llm.model}...`);

      const response = await llm.client.chat.completions.create(
        {
          model: llm.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um leitor óptico especialista em embalagens e rótulos de medicamentos e suplementos. Retorne ESTRITAMENTE JSON válido.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        },
        { timeout: 25000 }
      );

      this.logger.log('[MedOcrService] Resposta da IA recebida com sucesso.');
      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      this.logger.log(`[MedOcrService] Dados extraídos: Nome="${parsed.name}", Marca="${parsed.brand}", Dose="${parsed.dosage}", Estoque=${parsed.currentStock}`);

      return {
        name: parsed.name || '',
        brand: parsed.brand || '',
        dosage: parsed.dosage || '',
        unit: parsed.unit || 'comprimido',
        type: ['MEDICAMENTO', 'VITAMINA', 'SUPLEMENTO', 'FITOTERAPICO'].includes(parsed.type) ? parsed.type : 'MEDICAMENTO',
        category: ['CONTINUO', 'TEMPORARIO', 'SOS'].includes(parsed.category) ? parsed.category : 'CONTINUO',
        instructions: parsed.instructions || 'Tomar conforme orientação',
        currentStock: Number(parsed.currentStock) || 30,
        stockAlertAt: Number(parsed.stockAlertAt) || 5,
        costPerUnit: parsed.costPerUnit ? Number(parsed.costPerUnit) : undefined,
        pharmacy: parsed.pharmacy || undefined,
        period: ['MANHA', 'TARDE', 'NOITE', 'MADRUGADA'].includes(parsed.period) ? parsed.period : 'MANHA',
        time: parsed.time || '08:00',
        aiSuccess: true,
      };

    } catch (e: any) {
      this.logger.error(`[MedOcrService] Erro ao processar visão computacional (${e?.message})`, e?.stack);

      // Return clean empty structure rather than misleading fake placeholders
      return {
        name: '',
        brand: '',
        dosage: '',
        unit: 'comprimido',
        type: 'SUPLEMENTO',
        category: 'CONTINUO',
        instructions: 'Tomar 1 cápsula ao dia',
        currentStock: 30,
        stockAlertAt: 5,
        costPerUnit: undefined,
        pharmacy: undefined,
        period: 'MANHA',
        time: '08:00',
        aiSuccess: false,
        aiMessage: e?.message || 'Não foi possível ler a imagem com a IA.',
      };
    }
  }
}
