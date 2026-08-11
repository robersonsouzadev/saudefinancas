import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CategorizerService } from './categorizer.service';
import { TitleType } from '@prisma/client';

@Injectable()
export class VoiceFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizer: CategorizerService,
  ) {}

  /**
   * Processa texto transcrevido de áudio (via Whisper ou entrada por voz)
   * e gera um rascunho estruturado de Título a Pagar/Receber para revisão rápida do usuário.
   */
  async parseVoiceCommand(userId: string, text: string) {
    const cleanedText = text.trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Identifica tipo: PAYABLE (A Pagar / Despesa) vs RECEIVABLE (A Receber / Entradas)
    const lower = cleanedText.toLowerCase();
    const isReceivable = lower.includes('recebi') || lower.includes('receber') || lower.includes('entrada') || lower.includes('vendi') || lower.includes('fatura emitida');
    const titleType: TitleType = isReceivable ? 'RECEIVABLE' : 'PAYABLE';

    // Extrai valor em R$ (ex: R$ 150, 150 reais, R$150.00, 150,50)
    let amount = 0;
    const amountRegex = /(?:r\$\s*|reais\s*|valor\s*de\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|r\$)?/i;
    const amountMatch = cleanedText.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // Extrai data de vencimento
    let dueDate = new Date(today); // padrão: hoje
    if (lower.includes('amanhã') || lower.includes('amanha')) {
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (lower.includes('hoje')) {
      dueDate = new Date(today);
    } else {
      // Procura por "dia XX" ou "XX/YY"
      const dayMatch = lower.match(/(?:vencimento|vence|dia)\s*(?:dia\s*)?(\d{1,2})(?:\/(\d{1,2}))?/i);
      if (dayMatch && dayMatch[1]) {
        const day = parseInt(dayMatch[1]);
        const month = dayMatch[2] ? parseInt(dayMatch[2]) - 1 : today.getMonth();

        dueDate = new Date(today.getFullYear(), month, day);
        // Se a data calculada for anterior a hoje e não especificou mês, assume próximo mês
        if (dueDate < today && !dayMatch[2]) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
      }
    }

    // Tenta sugerir Categoria via CategorizerService
    const catResult = await this.categorizer.categorizeDescription(cleanedText, userId);
    const categoryName = catResult.category || 'Outros';
    const existingCategory = await this.prisma.transactionCategory.findFirst({
      where: { name: { contains: categoryName, mode: 'insensitive' } },
    });

    // Tenta encontrar Fornecedor/Cliente cadastrado
    const entities = await this.prisma.financialEntity.findMany({ where: { userId } });
    const matchedEntity = entities.find((e) => lower.includes(e.name.toLowerCase()));

    // Formata descrição limpa (remove palavras de comando)
    let description = cleanedText
      .replace(/lançar|lançar conta de|cadastrar|registrar|conta de|recebi de|receber de/gi, '')
      .trim();
    if (!description) description = titleType === 'PAYABLE' ? 'Conta a Pagar' : 'Conta a Receber';
    description = description.charAt(0).toUpperCase() + description.slice(1);

    return {
      type: titleType,
      description,
      originalAmount: amount,
      dueDate: dueDate.toISOString().split('T')[0],
      competenceDate: today.toISOString().split('T')[0], // Competência default: data atual
      categoryId: existingCategory?.id || null,
      categoryName: existingCategory?.name || categoryName,
      entityId: matchedEntity?.id || null,
      entityName: matchedEntity?.name || null,
      paymentMethod: lower.includes('pix') ? 'PIX' : lower.includes('cartao') || lower.includes('cartão') ? 'CREDIT_CARD' : lower.includes('boleto') ? 'BOLETO' : 'PIX',
      confidenceScore: amount > 0 ? 0.95 : 0.70,
      originalText: text,
    };
  }
}
