import { Controller, Get, POST, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabExamsService } from './services/lab-exams.service';

@Controller('lab-exams')
@UseGuards(JwtAuthGuard)
export class LabExamsController {
  constructor(private readonly labExamsService: LabExamsService) {}

  @POST('upload')
  async uploadExam(
    @Req() req: any,
    @Body() body: { image: string; mimeType: string; title?: string },
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.labExamsService.createExamFromOCR(userId, body.image, body.mimeType, body.title);
  }

  @Get()
  async getUserExams(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.labExamsService.getUserExams(userId);
  }

  @Get('dashboard')
  async getDashboardSummary(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.labExamsService.getDashboardSummary(userId);
  }

  @Get('history/:key')
  async getBiomarkerHistory(@Req() req: any, @Param('key') key: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.labExamsService.getBiomarkerHistory(userId, key);
  }

  @Get(':id')
  async getExamById(@Param('id') id: string) {
    return this.labExamsService.getExamById(id);
  }

  @Delete(':id')
  async deleteExam(@Param('id') id: string) {
    return this.labExamsService.deleteExam(id);
  }
}
