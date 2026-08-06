import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  @Get()
  async listAgents() {
    return this.service.listAgents();
  }

  @Get(':id')
  async getAgent(@Param('id') id: string) {
    return this.service.getAgent(id);
  }

  @Post()
  async createAgent(@Body() body: any) {
    return this.service.createAgent(body);
  }

  @Put(':id')
  async updateAgentPut(@Param('id') id: string, @Body() body: any) {
    return this.service.updateAgent(id, body);
  }

  @Patch(':id')
  async updateAgentPatch(@Param('id') id: string, @Body() body: any) {
    return this.service.updateAgent(id, body);
  }

  @Delete(':id')
  async deleteAgent(@Param('id') id: string) {
    return this.service.deleteAgent(id);
  }

  @Post(':id/test')
  async testSandbox(
    @Param('id') id: string,
    @Body() body: { message: string; systemPrompt?: string; modelName?: string; temperature?: number }
  ) {
    return this.service.testSandbox(
      id,
      body.message,
      body.systemPrompt,
      body.modelName,
      body.temperature
    );
  }

  @Post('optimize-prompt')
  async optimizePromptRoot(@Body() body: { systemPrompt: string }) {
    return this.service.optimizePrompt(body.systemPrompt);
  }

  @Post(':id/optimize-prompt')
  async optimizePromptAgent(@Body() body: { systemPrompt: string }) {
    return this.service.optimizePrompt(body.systemPrompt);
  }
}
