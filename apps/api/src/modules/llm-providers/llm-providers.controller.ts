import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('llm-providers')
@UseGuards(JwtAuthGuard)
export class LlmProvidersController {
  constructor(private readonly service: LlmProvidersService) {}

  @Get()
  async getProviders() {
    return this.service.getProviders();
  }

  @Post()
  async saveProvider(@Body() body: { provider: string; key?: string; apiKey?: string }) {
    const key = body.key || body.apiKey || '';
    return this.service.setProviderKey(body.provider, key);
  }

  @Post('key')
  async setKey(@Body() body: { provider: string; key?: string; apiKey?: string }) {
    const key = body.key || body.apiKey || '';
    return this.service.setProviderKey(body.provider, key);
  }

  @Post('test')
  async testConnection(@Body() body: { provider: string }) {
    return this.service.testConnection(body.provider);
  }
}
