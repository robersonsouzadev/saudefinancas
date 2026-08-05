import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvestmentsService } from './services/investments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get()
  async listAssets(@Request() req: any) {
    return this.investmentsService.listAssets(req.user.id);
  }

  @Post()
  async createAsset(@Request() req: any, @Body() body: any) {
    return this.investmentsService.createAsset(req.user.id, body);
  }

  @Put(':id')
  async updateAsset(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.investmentsService.updateAsset(id, req.user.id, body);
  }

  @Delete(':id')
  async deleteAsset(@Request() req: any, @Param('id') id: string) {
    return this.investmentsService.deleteAsset(id, req.user.id);
  }

  @Post('advice')
  async getAdvice(@Request() req: any, @Body() body: { availableContribution: number }) {
    return this.investmentsService.getAdvice(req.user.id, body.availableContribution || 0);
  }
}
