import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import OpenAI from 'openai';

export interface CategorizationResult {
  category: string;
  confidence: number;
  source?: 'user_rule' | 'heuristic' | 'ai' | 'fallback';
  icon?: string;
  color?: string;
  reasoning?: string;
}

export interface CategoryMetadata {
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  description: string;
}

export interface UserRule {
  id?: string;
  userId?: string;
  descriptionPattern: string;
  category: string;
  createdAt: Date;
}

export const SYSTEM_CATEGORIES: Record<string, CategoryMetadata> = {
  'Alimentação': {
    name: 'Alimentação',
    icon: 'Utensils',
    color: '#EF4444',
    type: 'EXPENSE',
    description: 'Supermercados, restaurantes, delivery e padarias',
  },
  'Transporte': {
    name: 'Transporte',
    icon: 'Car',
    color: '#F59E0B',
    type: 'EXPENSE',
    description: 'Combustível, aplicativos de transporte, pedágio e estacionamento',
  },
  'Saúde': {
    name: 'Saúde',
    icon: 'HeartPulse',
    color: '#10B981',
    type: 'EXPENSE',
    description: 'Farmácias, hospitais, exames e consultas médicas',
  },
  'Lazer': {
    name: 'Lazer',
    icon: 'Gamepad2',
    color: '#8B5CF6',
    type: 'EXPENSE',
    description: 'Streaming, cinema, shows, ingressos e entretenimento',
  },
  'Moradia': {
    name: 'Moradia',
    icon: 'Home',
    color: '#3B82F6',
    type: 'EXPENSE',
    description: 'Aluguel, condomínio, luz, água, gás e internet',
  },
  'Vestuário': {
    name: 'Vestuário',
    icon: 'ShoppingBag',
    color: '#EC4899',
    type: 'EXPENSE',
    description: 'Roupas, calçados e acessórios',
  },
  'Educação': {
    name: 'Educação',
    icon: 'GraduationCap',
    color: '#06B6D4',
    type: 'EXPENSE',
    description: 'Cursos, faculdade, escolas e livrarias',
  },
  'Salário': {
    name: 'Salário',
    icon: 'Wallet',
    color: '#22C55E',
    type: 'INCOME',
    description: 'Rendimentos, salários, pro-labore e PIX recebidos',
  },
  'Investimentos': {
    name: 'Investimentos',
    icon: 'TrendingUp',
    color: '#6366F1',
    type: 'EXPENSE',
    description: 'Aplicações financeiras, ações, FIIs e criptoativos',
  },
  'Outros': {
    name: 'Outros',
    icon: 'HelpCircle',
    color: '#6B7280',
    type: 'EXPENSE',
    description: 'Despesas diversas e não especificadas',
  },
};

@Injectable()
export class CategorizerService implements OnModuleInit {
  private readonly logger = new Logger(CategorizerService.name);

  // In-memory store for learned rules (userId -> Map<pattern, category>)
  private readonly userRulesStore: Map<string, Map<string, string>> = new Map();
  // Global rules learned across users (pattern -> category)
  private readonly globalRulesStore: Map<string, string> = new Map();

  // Heuristic Keyword Engine mapping Brazilian merchant keywords to standard categories
  private readonly keywordRules: Record<string, string[]> = {
    'Alimentação': [
      'ifood',
      'uber eats',
      'mcdonalds',
      'restaurante',
      'padaria',
      'supermercado',
      'carrefour',
      'pão de açúcar',
      'pao de acucar',
      'pao de acucao',
      'zaffari',
      'dia%',
      'extra',
      'açougue',
      'acougue',
      'hortifruti',
      'bk',
      'burger king',
      'starbucks',
      'subway',
      'outback',
      'coco bambu',
      'giraffas',
      'habibs',
      "habib's",
      'spoleto',
      'ragazzo',
      'madero',
      'bobs',
      "bob's",
      'lanchonete',
      'feira',
      'mercado',
      'groceries',
    ],
    'Transporte': [
      'uber',
      '99',
      'combustível',
      'combustivel',
      'posto',
      'shell',
      'ipiranga',
      'estacionamento',
      'pedágio',
      'pedagio',
      'petrobras',
      'br distribuida',
      'br mania',
      'sem parar',
      'veloe',
      'meuguru',
      'cabify',
      '99taxis',
      '99pop',
      'taxi',
      'taxisp',
      'bilhete unico',
      'bilhete único',
      'passagem',
      'gasolina',
      'etanol',
      'diesel',
    ],
    'Saúde': [
      'drogasil',
      'droga raia',
      'farmácia',
      'farmacia',
      'hospital',
      'consulta',
      'laboratório',
      'laboratorio',
      'drogaria',
      'exame',
      'médico',
      'medico',
      'clinica',
      'clínica',
      'ultrafarma',
      'pague menos',
      'venancio',
      'fleury',
      'hermes pardini',
      'albert einstein',
      'sirio libanes',
      "rede d'or",
      'dentista',
      'odontologia',
      'remédio',
      'remedio',
    ],
    'Lazer': [
      'netflix',
      'spotify',
      'amazon prime',
      'hbo',
      'cinema',
      'ingresso',
      'disney',
      'disney+',
      'globoplay',
      'deezer',
      'youtube premium',
      'steam',
      'playstation',
      'psn',
      'xbox',
      'nintendo',
      'kinoplex',
      'cinemark',
      'uci',
      'ingresse',
      'eventim',
      'sympla',
      'show',
      'teatro',
      'bar',
      'choperia',
      'pub',
      'movie',
      'game',
    ],
    'Moradia': [
      'enel',
      'sabesp',
      'cpfl',
      'aluguel',
      'condomínio',
      'condominio',
      'claro',
      'vivo',
      'tim',
      'oi',
      'net',
      'ligue tele',
      'conta de luz',
      'água',
      'agua',
      'gás',
      'gas',
      'iptu',
      'edp',
      'cemig',
      'copel',
      'light',
      'internet',
      'seguro residencial',
    ],
    'Vestuário': [
      'zarapa',
      'c&a',
      'renner',
      'riachuelo',
      'zara',
      'nike',
      'adidas',
      'vestuario',
      'amaro',
      'hering',
      'centauro',
      'decathlon',
      'loffline',
      'dafiti',
      'shein',
      'marisa',
      'lojas renner',
      'pernambucanas',
      'roupas',
      'calcados',
      'calçados',
    ],
    'Educação': [
      'udemy',
      'alura',
      'faculdade',
      'escola',
      'livraria',
      'educacao',
      'curso',
      'universidade',
      'estácio',
      'estacio',
      'fiap',
      'puc',
      'unesp',
      'usp',
      'fgv',
      'coursera',
      'edx',
      'saraiva',
      'leitura',
      'kultivi',
      'rocketseat',
      'livro',
    ],
    'Salário': [
      'salário',
      'salario',
      'pagamento empresa',
      'pro-labore',
      'pro labore',
      'prolabore',
      'pix recebido',
      'rendimento',
      'holerite',
      'proventos',
      'pagamento recebido',
      'vcto salario',
      'vencimento',
    ],
    'Investimentos': [
      'xp investimentos',
      'rico',
      'nuinvest',
      'b3',
      'tesouro direto',
      'poupança',
      'poupanca',
      'binance',
      'mercado pago investimento',
      'investimento',
      'fundo',
      'cdb',
    ],
  };

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly encryption?: EncryptionService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedSystemCategories();
    } catch (err) {
      this.logger.warn('Initial seeding of system categories deferred or failed', err);
    }
  }

  /**
   * Helper to normalize text (lowercase, remove diacritics/accents)
   */
  private normalize(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Primary categorization endpoint:
   * 1. Check user-defined rules & history
   * 2. Heuristic Brazilian merchant keyword matching
   * 3. AI (OpenAI GPT) fallback
   * 4. Standard default fallback
   */
  async categorizeDescription(description: string, userId?: string): Promise<CategorizationResult> {
    if (!description || !description.trim()) {
      const meta = SYSTEM_CATEGORIES['Outros'];
      return {
        category: 'Outros',
        confidence: 0.0,
        source: 'fallback',
        icon: meta.icon,
        color: meta.color,
        reasoning: 'Descrição vazia',
      };
    }

    const normalizedDesc = this.normalize(description);

    // 1. User Correction Learning Rules (In-memory & DB check)
    const userMatchedCategory = await this.checkUserRules(normalizedDesc, userId);
    if (userMatchedCategory) {
      const meta = SYSTEM_CATEGORIES[userMatchedCategory] || SYSTEM_CATEGORIES['Outros'];
      return {
        category: userMatchedCategory,
        confidence: 1.0,
        source: 'user_rule',
        icon: meta.icon,
        color: meta.color,
        reasoning: 'Regra personalizada aprendida das preferências do usuário',
      };
    }

    // 2. Heuristic Engine (Brazilian merchant keyword mapping)
    for (const [category, keywords] of Object.entries(this.keywordRules)) {
      const matched = keywords.some((kw) => {
        const normKw = this.normalize(kw);
        return normalizedDesc.includes(normKw);
      });

      if (matched) {
        const meta = SYSTEM_CATEGORIES[category] || SYSTEM_CATEGORIES['Outros'];
        return {
          category,
          confidence: 0.92,
          source: 'heuristic',
          icon: meta.icon,
          color: meta.color,
          reasoning: `Correspondência heurística com palavra-chave para '${category}'`,
        };
      }
    }

    // 3. AI OpenAI Fallback for ambiguous transaction descriptions
    const aiResult = await this.categorizeWithAI(description);
    if (aiResult) {
      return aiResult;
    }

    // 4. Default Fallback
    const meta = SYSTEM_CATEGORIES['Outros'];
    return {
      category: 'Outros',
      confidence: 0.4,
      source: 'fallback',
      icon: meta.icon,
      color: meta.color,
      reasoning: 'Classificação padrão por falta de correspondência exata',
    };
  }

  /**
   * Check in-memory user rules and user transaction history
   */
  private async checkUserRules(normalizedDesc: string, userId?: string): Promise<string | null> {
    if (userId && this.userRulesStore.has(userId)) {
      const userMap = this.userRulesStore.get(userId)!;
      for (const [pattern, category] of userMap.entries()) {
        if (normalizedDesc.includes(pattern)) {
          return category;
        }
      }
    }

    // Check global user rules
    for (const [pattern, category] of this.globalRulesStore.entries()) {
      if (normalizedDesc.includes(pattern)) {
        return category;
      }
    }

    // Check DB transaction history for this user if Prisma is available
    if (userId && this.prisma) {
      try {
        const pastTx = await this.prisma.transaction.findFirst({
          where: {
            userId,
            description: {
              contains: normalizedDesc,
              mode: 'insensitive',
            },
            categoryId: { not: null },
          },
          include: { category: true },
          orderBy: { createdAt: 'desc' },
        });

        if (pastTx?.category?.name) {
          // Cache the rule for future lookups
          this.learnUserRule(userId, normalizedDesc, pastTx.category.name);
          return pastTx.category.name;
        }
      } catch (err) {
        this.logger.debug('Error checking past user transactions for rule learning', err);
      }
    }

    return null;
  }

  /**
   * Rule learning helper that records custom user mappings when a user manually corrects a category
   */
  learnUserRule(userId: string | undefined, descriptionPattern: string, category: string): UserRule {
    const pattern = this.normalize(descriptionPattern);
    const validCategory = SYSTEM_CATEGORIES[category] ? category : category;

    if (userId) {
      if (!this.userRulesStore.has(userId)) {
        this.userRulesStore.set(userId, new Map());
      }
      this.userRulesStore.get(userId)!.set(pattern, validCategory);
    } else {
      this.globalRulesStore.set(pattern, validCategory);
    }

    this.logger.log(`Recorded custom categorization rule: [${userId || 'GLOBAL'}] "${pattern}" -> "${validCategory}"`);

    return {
      userId,
      descriptionPattern: pattern,
      category: validCategory,
      createdAt: new Date(),
    };
  }

  /**
   * Alias helper method for recording custom user rule mappings
   */
  recordUserRule(description: string, category: string, userId?: string): UserRule {
    return this.learnUserRule(userId, description, category);
  }

  /**
   * Alias helper method for learning user correction
   */
  learnCorrection(userId: string, description: string, category: string): UserRule {
    return this.learnUserRule(userId, description, category);
  }

  /**
   * Retrieve active learned rules for a user or globally
   */
  getUserRules(userId?: string): UserRule[] {
    const rules: UserRule[] = [];

    if (userId && this.userRulesStore.has(userId)) {
      for (const [pattern, category] of this.userRulesStore.get(userId)!.entries()) {
        rules.push({ userId, descriptionPattern: pattern, category, createdAt: new Date() });
      }
    }

    for (const [pattern, category] of this.globalRulesStore.entries()) {
      rules.push({ userId: undefined, descriptionPattern: pattern, category, createdAt: new Date() });
    }

    return rules;
  }

  /**
   * OpenAI Integration for ambiguous transaction descriptions
   */
  private async categorizeWithAI(description: string): Promise<CategorizationResult | null> {
    const openai = await this.getOpenAIClient();
    if (!openai) return null;

    try {
      const categoriesList = Object.keys(SYSTEM_CATEGORIES).join(', ');
      const systemPrompt = `Você é um motor de IA especialista em categorização de transações financeiras brasileiras.
Sua tarefa é analisar a descrição da transação e classificá-la estritamente em uma destas categorias permitidas:
[${categoriesList}]

Retorne APENAS um objeto JSON estrito com o formato:
{
  "category": "NomeDaCategoria",
  "confidence": 0.85,
  "reasoning": "Breve justificativa"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classifique a transação: "${description}"` },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.category && (SYSTEM_CATEGORIES[parsed.category] || parsed.category)) {
          const catName = SYSTEM_CATEGORIES[parsed.category] ? parsed.category : 'Outros';
          const meta = SYSTEM_CATEGORIES[catName];
          return {
            category: catName,
            confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.85,
            source: 'ai',
            icon: meta.icon,
            color: meta.color,
            reasoning: parsed.reasoning || 'Classificado via OpenAI GPT',
          };
        }
      }
    } catch (err) {
      this.logger.error('Error invoking OpenAI for categorization fallback', err);
    }
    return null;
  }

  /**
   * Helper to retrieve OpenAI client using environment key or DB provider key
   */
  private async getOpenAIClient(): Promise<OpenAI | null> {
    try {
      let apiKey = this.configService?.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

      if ((!apiKey || apiKey.length < 10) && this.prisma) {
        const dbProv = await this.prisma.llmProvider.findFirst({ where: { provider: 'openai' } });
        if (dbProv?.apiKey) {
          try {
            apiKey = this.encryption ? this.encryption.decrypt(dbProv.apiKey) : dbProv.apiKey;
          } catch {
            apiKey = dbProv.apiKey;
          }
        }
      }

      if (apiKey && apiKey.length > 10) {
        return new OpenAI({ apiKey });
      }
    } catch (e) {
      this.logger.warn('Could not initialize OpenAI client', e);
    }
    return null;
  }

  /**
   * System category seed with icons and colors
   */
  async seedSystemCategories(): Promise<any[]> {
    if (!this.prisma) {
      this.logger.warn('PrismaService unavailable, skipping database category seed');
      return Object.values(SYSTEM_CATEGORIES);
    }

    const seeded: any[] = [];
    for (const meta of Object.values(SYSTEM_CATEGORIES)) {
      try {
        const existing = await this.prisma.transactionCategory.findFirst({
          where: { name: meta.name },
        });

        if (!existing) {
          const created = await this.prisma.transactionCategory.create({
            data: {
              name: meta.name,
              icon: meta.icon,
              color: meta.color,
              type: meta.type,
              isSystem: true,
            },
          });
          seeded.push(created);
        } else {
          const updated = await this.prisma.transactionCategory.update({
            where: { id: existing.id },
            data: {
              icon: meta.icon,
              color: meta.color,
              type: meta.type,
              isSystem: true,
            },
          });
          seeded.push(updated);
        }
      } catch (err) {
        this.logger.error(`Error seeding category '${meta.name}'`, err);
      }
    }
    this.logger.log(`Seeded/verified ${seeded.length} system categories in DB`);
    return seeded;
  }

  /**
   * Helper to retrieve all system category definitions with icons & colors
   */
  getSystemCategories(): Record<string, CategoryMetadata> {
    return SYSTEM_CATEGORIES;
  }
}

