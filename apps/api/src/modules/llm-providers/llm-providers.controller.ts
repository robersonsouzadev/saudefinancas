import { Controller, Get, Post, Body } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';

@Controller('llm-providers')
export class LlmProvidersController {
  constructor(private readonly service: LlmProvidersService) {}

  @Get()
  async getProviders() {
    return this.service.getProviders();
  }

  @Post('key')
  async setKey(@Body() body: { provider: string; key: string }) {
    return this.service.setProviderKey(body.provider, body.key);
  }

  @Post('test')
  async testConnection(@Body() body: { provider: string }) {
    return this.service.testConnection(body.provider);
  }
}
