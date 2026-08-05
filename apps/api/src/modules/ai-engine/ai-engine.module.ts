import { Module } from '@nestjs/common';
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { PromptEngineService } from './services/prompt-engine.service';
import { SentimentAnalyzerService } from './services/sentiment-analyzer.service';
import { ToolDispatcherService } from './services/tool-dispatcher.service';

@Module({
  providers: [
    AiOrchestratorService,
    PromptEngineService,
    SentimentAnalyzerService,
    ToolDispatcherService,
  ],
  exports: [AiOrchestratorService],
})
export class AiEngineModule {}
