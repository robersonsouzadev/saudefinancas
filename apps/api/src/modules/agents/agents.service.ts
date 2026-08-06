import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import OpenAI from 'openai';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async listAgents() {
    let agents = await this.prisma.agent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (agents.length === 0) {
      const defaultList = [
        {
          name: 'Dra. Maya — Saúde & Longevidade',
          description: 'Especialista em saúde física, biometria e longevidade.',
          systemPrompt: 'Seu nome é Dra. Maya. Você é a especialista em saúde física, sono e longevidade do sistema Saúde & Finanças. Sua função é analisar indicadores biológicos, orientar rotinas saudáveis e prevenir estresse metabólico.',
          modelName: 'gpt-4o-mini',
          temperature: 0.7,
        },
        {
          name: 'Otávio — Estrategista Financeiro',
          description: 'Consultor orçamentário e analista de investimentos.',
          systemPrompt: 'Seu nome é Otávio. Você é o consultor financeiro e estrategista orçamentário. Sua função é analisar extratos, identificar despesas e sugerir metas de economia.',
          modelName: 'gpt-4o-mini',
          temperature: 0.5,
        },
        {
          name: 'Nutri Bia — Nutrição Integrativa',
          description: 'Nutricionista responsável pela análise de macronutrientes.',
          systemPrompt: 'Seu nome é Nutri Bia. Você é a nutricionista integrativa responsável pela análise de refeições por foto, contagem de macronutrientes e ajuste calórico personalizado.',
          modelName: 'gpt-4o-mini',
          temperature: 0.6,
        },
        {
          name: 'Vita — Assistente Principal (Orquestrador)',
          description: 'Agente master que correlaciona saúde com finanças.',
          systemPrompt: 'Seu nome é Vita. Você é a assistente orquestradora principal do sistema Saúde & Finanças. Você correlaciona os dados de saúde com finanças e coordena a comunicação.',
          modelName: 'gpt-4o',
          temperature: 0.7,
          isDefault: true,
        },
      ];

      for (const ag of defaultList) {
        await this.prisma.agent.create({ data: ag });
      }

      agents = await this.prisma.agent.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    return agents;
  }

  async getAgent(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundException('Agente não encontrado');
    return agent;
  }

  async createAgent(data: any) {
    return this.prisma.agent.create({
      data: {
        name: data.name,
        description: data.description || '',
        systemPrompt: data.systemPrompt || 'Você é um assistente atencioso.',
        modelName: data.modelName || 'gpt-4o-mini',
        temperature: data.temperature !== undefined ? parseFloat(data.temperature) : 0.7,
        isDefault: data.isDefault || false,
      },
    });
  }

  async updateAgent(id: string, data: any) {
    const existing = await this.prisma.agent.findUnique({ where: { id } });

    if (!existing) {
      return this.prisma.agent.create({
        data: {
          name: data.name || 'Agente Especialista',
          description: data.description || '',
          systemPrompt: data.systemPrompt || 'Você é um assistente atencioso.',
          modelName: data.modelName || 'gpt-4o-mini',
          temperature: data.temperature !== undefined ? parseFloat(data.temperature) : 0.7,
          isDefault: data.isDefault || false,
        },
      });
    }

    return this.prisma.agent.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
        ...(data.modelName !== undefined && { modelName: data.modelName }),
        ...(data.temperature !== undefined && { temperature: parseFloat(data.temperature) }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });
  }

  async deleteAgent(id: string) {
    const existing = await this.prisma.agent.findUnique({ where: { id } });
    if (!existing) return { success: true };
    return this.prisma.agent.delete({ where: { id } });
  }

  private async getOpenAIClient(): Promise<OpenAI | null> {
    try {
      let apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.length < 10) {
        const dbProv = await this.prisma.llmProvider.findFirst({ where: { provider: 'openai' } });
        if (dbProv?.apiKey) {
          try {
            apiKey = this.encryption.decrypt(dbProv.apiKey);
          } catch {}
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
   * Runs a Sandbox Test Message against the Agent's system prompt & model
   */
  async testSandbox(agentId: string, userMessage: string, customPrompt?: string, customModel?: string, customTemp?: number) {
    let agent = null;
    if (agentId !== 'new') {
      agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    }

    const systemPrompt = customPrompt || agent?.systemPrompt || 'Você é um assistente prestativo.';
    const modelName = customModel || agent?.modelName || 'gpt-4o-mini';
    const temperature = customTemp !== undefined ? customTemp : (agent?.temperature || 0.7);

    const openai = await this.getOpenAIClient();

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: modelName.includes('gpt') ? modelName : 'gpt-4o-mini',
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        });

        const reply = completion.choices[0]?.message?.content || 'Sem resposta.';
        const tokens = completion.usage?.total_tokens || 120;

        return { message: reply, tokens };
      } catch (err: any) {
        this.logger.error('Error executing sandbox test chat via OpenAI', err);
      }
    }

    // Fallback response for Sandbox test if OpenAI is unavailable
    return {
      message: `[Sandbox Vita Simulação]: Recebi a mensagem "${userMessage}". Estou respondendo com base nas instruções: "${systemPrompt.substring(0, 80)}..."`,
      tokens: 85,
    };
  }

  /**
   * Optimizes System Prompt with clear boundaries, formatting, and rules using AI
   */
  async optimizePrompt(originalPrompt: string) {
    const openai = await this.getOpenAIClient();

    const optimizerSystem = `Você é um especialista em Prompt Engineering e arquitetura de Personas de Inteligência Artificial.
Sua missão é pegar o System Prompt fornecido pelo usuário e reestruturá-lo de forma profissional, clara e robusta em português.
Instruções:
- Mantenha a identidade e o objetivo do agente original.
- Organize em seções claras utilizando markdown:
  ## NOME E PAPEL
  ## FUNÇÃO E LIMITES ESTRITOS (OBRIGATÓRIO)
  ## REGRAS DE ATENDIMENTO E TOM DE VOZ
  ## DIRETRIZES TÉCNICAS E DE SEGURANÇA
- Retorne APENAS o texto do prompt otimizado sem explicações adicionais ou aspas.`;

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
            { role: 'system', content: optimizerSystem },
            { role: 'user', content: originalPrompt },
          ],
        });

        const optimized = completion.choices[0]?.message?.content?.trim() || originalPrompt;
        return { original: originalPrompt, optimized };
      } catch (err) {
        this.logger.error('Error optimizing prompt with OpenAI', err);
      }
    }

    // Heuristic prompt optimization fallback
    const optimized = `## NOME E PAPEL\n${originalPrompt.trim()}\n\n## FUNÇÃO E LIMITES ESTRITOS (OBRIGATÓRIO)\n- Atenda as solicitações do usuário respeitando o escopo definido.\n- Seja objetivo, cortês e mantenha linguagem clara.\n\n## REGRAS DE ATENDIMENTO E TOM DE VOZ\n- Tom profissional, empático e resolutivo.\n- Responda em português de forma direta.`;

    return { original: originalPrompt, optimized };
  }
}
