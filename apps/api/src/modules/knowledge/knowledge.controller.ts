import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { KnowledgeService } from './services/knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('documents')
  async getDocuments() {
    return this.knowledgeService.getDocuments();
  }

  @Post('upload')
  async uploadDocument(@Body() body: { title: string; content: string; agentId?: string; fileType?: string }) {
    return this.knowledgeService.uploadDocument(body);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id);
  }

  @Post('search')
  async searchSimilar(@Body() body: { query: string; agentId?: string; limit?: number }) {
    return this.knowledgeService.searchSimilar(body.query, body.agentId, body.limit);
  }
}
