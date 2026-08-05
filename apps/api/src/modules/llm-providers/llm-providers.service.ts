import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { LlmRouterService } from './services/llm-router.service';

@Injectable()
export class LlmProvidersService {
  private readonly logger = new Logger(LlmProvidersService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private router: LlmRouterService,
  ) {}

  /**
   * Returns registered LLM Providers with live connection test result
   */
  async getProviders() {
    const providers = await this.prisma.llmProvider.findMany();
    
    // Check environment variables as well
    const envKeys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
    };

    const results = [];
    const defaultProviders = [
      { type: 'openai', name: 'SaúdeFinanças — OpenAI', models: ['GPT-4o (Flagship)', 'GPT-4o Mini', 'o3-mini'] },
      { type: 'anthropic', name: 'SaúdeFinanças — Anthropic', models: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku'] },
      { type: 'gemini', name: 'SaúdeFinanças — Google Gemini', models: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro'] },
      { type: 'deepseek', name: 'SaúdeFinanças — DeepSeek', models: ['DeepSeek-V3', 'DeepSeek-R1'] },
    ];

    for (const def of defaultProviders) {
      const dbProv = providers.find(p => p.provider === def.type);
      let key = envKeys[def.type] || '';

      if (dbProv?.apiKeyEncrypted) {
        try {
          key = this.encryption.decrypt(dbProv.apiKeyEncrypted);
        } catch {}
      }

      const ping = await this.router.pingProvider(def.type, key);

      results.push({
        id: dbProv?.id || def.type,
        name: def.name,
        providerType: def.type,
        status: ping.ok ? 'CONECTADO' : 'DESCONECTADO',
        statusReason: ping.reason || (ping.ok ? 'Conexão ativa' : 'Chave API ausente ou não configurada'),
        models: def.models,
        tokensUsed: dbProv ? 12000 : 0,
        tokenLimit: 500000,
        hasKeyConfigured: Boolean(key && key.length > 10)
      });
    }

    return results;
  }

  /**
   * Sets or updates API key for a provider
   */
  async setProviderKey(provider: string, apiKey: string) {
    const encryptedKey = this.encryption.encrypt(apiKey);
    
    // Test key first
    const ping = await this.router.pingProvider(provider, apiKey);
    
    const existing = await this.prisma.llmProvider.findFirst({ where: { provider } });
    if (existing) {
      await this.prisma.llmProvider.update({
        where: { id: existing.id },
        data: { apiKeyEncrypted: encryptedKey, isActive: ping.ok }
      });
    } else {
      await this.prisma.llmProvider.create({
        data: {
          name: `Provedor ${provider}`,
          provider,
          apiKeyEncrypted: encryptedKey,
          isActive: ping.ok
        }
      });
    }

    return {
      success: true,
      provider,
      status: ping.ok ? 'CONECTADO' : 'DESCONECTADO',
      reason: ping.reason || 'Chave salva com sucesso'
    };
  }

  /**
   * Test connection on demand
   */
  async testConnection(providerType: string) {
    let key = process.env[`${providerType.toUpperCase()}_API_KEY`] || '';
    const dbProv = await this.prisma.llmProvider.findFirst({ where: { provider: providerType } });

    if (dbProv?.apiKeyEncrypted) {
      try {
        key = this.encryption.decrypt(dbProv.apiKeyEncrypted);
      } catch {}
    }

    return this.router.pingProvider(providerType, key);
  }
}
