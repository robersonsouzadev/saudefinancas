import { Module } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';
import { LlmProvidersController } from './llm-providers.controller';
import { LlmRouterService } from './services/llm-router.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  providers: [LlmProvidersService, LlmRouterService, EncryptionService],
  controllers: [LlmProvidersController],
  exports: [LlmRouterService],
})
export class LlmProvidersModule {}
