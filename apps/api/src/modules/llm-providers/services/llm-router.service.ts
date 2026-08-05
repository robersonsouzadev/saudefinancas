import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  getClient(providerType: string, apiKey: string, customBaseUrl?: string | null): OpenAI {
    const cleanKey = apiKey ? apiKey.trim() : '';
    const baseURL = customBaseUrl || this.getDefaultBaseUrl(providerType);

    switch (providerType.toLowerCase()) {
      case 'openai':
      case 'deepseek':
      case 'grok':
      case 'glm':
        return new OpenAI({
          apiKey: cleanKey,
          baseURL: baseURL,
          timeout: 30_000,
          maxRetries: 2,
        });

      case 'anthropic':
        return new OpenAI({
          apiKey: cleanKey,
          baseURL: 'https://api.anthropic.com/v1',
          defaultHeaders: {
            'anthropic-version': '2023-06-01',
            'x-api-key': cleanKey,
          },
          timeout: 30_000,
        });

      case 'gemini':
        return new OpenAI({
          apiKey: cleanKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
          timeout: 30_000,
        });

      default:
        throw new InternalServerErrorException(`Provedor LLM não suportado: ${providerType}`);
    }
  }

  private getDefaultBaseUrl(providerType: string): string | undefined {
    switch (providerType.toLowerCase()) {
      case 'deepseek': return 'https://api.deepseek.com';
      case 'grok':     return 'https://api.x.ai/v1';
      case 'glm':      return 'https://open.bigmodel.cn/api/paas/v4';
      default:         return undefined;
    }
  }

  /**
   * Performs real live API connection ping test
   */
  async pingProvider(providerType: string, apiKey: string): Promise<{ ok: boolean; reason?: string }> {
    const key = (apiKey || '').trim();
    if (!key) {
      return { ok: false, reason: 'Chave API não configurada. Adicione uma chave válida.' };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      if (providerType.toLowerCase() === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.status === 401 || res.status === 403) {
          return { ok: false, reason: 'Chave API Anthropic inválida.' };
        }
        return { ok: true };
      }

      if (providerType.toLowerCase() === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.status !== 200) {
          return { ok: false, reason: 'Chave API Gemini inválida ou sem permissão.' };
        }
        return { ok: true };
      }

      // OpenAI, DeepSeek, Grok, GLM
      const client = this.getClient(providerType, key);
      await client.models.list({ signal: controller.signal as any });
      clearTimeout(timeout);
      return { ok: true };

    } catch (e: any) {
      if (key.startsWith('sk-proj-') || key.length > 20) {
        return { ok: false, reason: `Erro de rede ou chave inválida: ${e.message}` };
      }
      return { ok: false, reason: 'Chave API não configurada ou inválida.' };
    }
  }
}
