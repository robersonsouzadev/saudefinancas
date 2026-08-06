import { 
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request 
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get()
  async getUserMedications(@Request() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.getUserMedications(userId);
  }

  @Get('adherence')
  async getAdherenceScore(@Request() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.getAdherenceScore(userId);
  }

  @Get('costs')
  async getMonthlyCosts(@Request() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.getMonthlyCosts(userId);
  }

  @Get(':id')
  async getMedicationById(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.getMedicationById(id, userId);
  }

  @Post()
  async createMedication(@Request() req, @Body() body: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.createMedication(userId, body);
  }

  @Put(':id')
  async updateMedication(@Param('id') id: string, @Request() req, @Body() body: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.updateMedication(id, userId, body);
  }

  @Delete(':id')
  async deleteMedication(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.deleteMedication(id, userId);
  }

  @Post(':id/intake')
  async logIntake(@Param('id') id: string, @Request() req, @Body() body: { status: 'TOMADO' | 'PULADO' | 'ATRASADO'; skipReason?: string }) {
    const userId = req.user?.id || req.user?.userId;
    return this.medicationsService.logIntake(id, userId, body.status || 'TOMADO', body.skipReason);
  }
}
