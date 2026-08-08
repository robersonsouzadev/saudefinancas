import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BodyAssessmentsService } from './services/body-assessments.service';

@Controller('body-assessments')
@UseGuards(JwtAuthGuard)
export class BodyAssessmentsController {
  constructor(private readonly bodyAssessmentsService: BodyAssessmentsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.create(userId, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.findAll(userId);
  }

  @Get('latest')
  async findLatest(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.findLatest(userId);
  }

  @Get('dashboard')
  async getDashboardSummary(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.getDashboardSummary(userId);
  }

  @Get('evolution')
  async getEvolutionSeries(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.getEvolutionSeries(userId);
  }

  @Get('compare')
  async compare(
    @Req() req: any,
    @Query('id1') id1?: string,
    @Query('id2') id2?: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.compare(userId, id1, id2);
  }

  @Post('goals')
  async createGoal(@Req() req: any, @Body() dto: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.createGoal(userId, dto);
  }

  @Get('goals')
  async findGoals(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.findGoals(userId);
  }

  @Put('goals/:id')
  async updateGoal(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.updateGoal(userId, id, dto);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.findOne(userId, id);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.bodyAssessmentsService.remove(userId, id);
  }
}
