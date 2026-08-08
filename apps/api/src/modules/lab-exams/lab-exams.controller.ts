import { Controller, Get, Post, Delete, Put, Body, Param, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabExamsService } from './services/lab-exams.service';

@Controller('lab-exams')
@UseGuards(JwtAuthGuard)
export class LabExamsController {
  constructor(private readonly labExamsService: LabExamsService) {}

  @Post('upload')
  async uploadExam(
    @Req() req: any,
    @Body() body: { image: string; mimeType: string; title?: string },
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
      }
      if (!body.image) {
        throw new HttpException('Imagem não fornecida', HttpStatus.BAD_REQUEST);
      }
      return await this.labExamsService.createExamFromOCR(userId, body.image, body.mimeType, body.title);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('Erro no upload de exame:', error?.message || error);
      throw new HttpException(
        error?.message || 'Erro interno ao processar o exame',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  @Put('results/:resultId')
  async updateResult(
    @Param('resultId') resultId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
      }
      return await this.labExamsService.updateResult(resultId, userId, body);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error?.message || 'Erro ao atualizar resultado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('results/:resultId')
  async deleteResult(
    @Param('resultId') resultId: string,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
      }
      return await this.labExamsService.deleteResult(resultId, userId);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error?.message || 'Erro ao excluir resultado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
