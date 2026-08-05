import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './services/knowledge.service';
import { EmbeddingService } from './services/embedding.service';
import { TextSplitterService } from './services/text-splitter.service';

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService, EmbeddingService, TextSplitterService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
