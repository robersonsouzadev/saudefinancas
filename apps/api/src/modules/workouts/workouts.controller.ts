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
  Request,
} from '@nestjs/common';
import { WorkoutsService } from './services/workouts.service';
import { WorkoutAIService, GeneratePlanDto } from './services/workout-ai.service';
import { ExerciseDBService } from './services/exercise-db.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workouts')
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(
    private readonly workoutsService: WorkoutsService,
    private readonly workoutAiService: WorkoutAIService,
    private readonly exerciseDbService: ExerciseDBService,
  ) {}

  // ----------------------------------------------------
  // EXERCÍCIOS
  // ----------------------------------------------------
  @Get('exercises')
  async listExercises(
    @Request() req: any,
    @Query('muscleGroup') muscleGroup?: string,
    @Query('search') search?: string,
  ) {
    return this.workoutsService.listExercises(req.user.id, muscleGroup, search);
  }

  @Post('exercises')
  async createCustomExercise(@Request() req: any, @Body() body: any) {
    return this.workoutsService.createCustomExercise(req.user.id, body);
  }

  @Post('exercises/sync-gifs')
  async syncExerciseGifs() {
    return this.exerciseDbService.syncAllExerciseGifs();
  }

  @Post('exercises/sync-cdn')
  async syncCDNExercises() {
    return this.workoutsService.syncExercisesFromCDN();
  }

  // ----------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------
  @Get('templates')
  async listTemplates(@Request() req: any) {
    return this.workoutsService.listTemplates(req.user.id);
  }

  @Post('templates')
  async createTemplate(@Request() req: any, @Body() body: any) {
    return this.workoutsService.createTemplate(req.user.id, body);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workoutsService.updateTemplate(id, req.user.id, body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    return this.workoutsService.deleteTemplate(id, req.user.id);
  }

  // ----------------------------------------------------
  // SESSÕES DE TREINO (LOGGING)
  // ----------------------------------------------------
  @Get('sessions/active')
  async getActiveSession(@Request() req: any) {
    return this.workoutsService.getActiveSession(req.user.id);
  }

  @Post('sessions/start')
  async startSession(@Request() req: any, @Body() body: { templateId?: string; title?: string }) {
    return this.workoutsService.startSession(req.user.id, body);
  }

  @Post('sessions/:id/exercise')
  async addExerciseToSession(
    @Request() req: any,
    @Param('id') sessionId: string,
    @Body('exerciseId') exerciseId: string,
  ) {
    return this.workoutsService.addExerciseToSession(req.user.id, sessionId, exerciseId);
  }

  @Put('sets/:setId')
  async updateSet(@Request() req: any, @Param('setId') setId: string, @Body() body: any) {
    return this.workoutsService.updateSet(req.user.id, setId, body);
  }

  @Post('session-exercises/:sessionExerciseId/set')
  async addSet(
    @Request() req: any,
    @Param('sessionExerciseId') sessionExerciseId: string,
  ) {
    return this.workoutsService.addSet(req.user.id, sessionExerciseId);
  }

  @Delete('sets/:setId')
  async removeSet(@Request() req: any, @Param('setId') setId: string) {
    return this.workoutsService.removeSet(req.user.id, setId);
  }

  @Put('sessions/:id/finish')
  async finishSession(
    @Request() req: any,
    @Param('id') sessionId: string,
    @Body() body: { rating?: number; notes?: string; intensity?: string },
  ) {
    return this.workoutsService.finishSession(req.user.id, sessionId, body);
  }

  // ----------------------------------------------------
  // HISTÓRICO E ESTATÍSTICAS
  // ----------------------------------------------------
  @Get('sessions')
  async listSessions(@Request() req: any, @Query('limit') limit?: string) {
    return this.workoutsService.listSessions(req.user.id, limit ? parseInt(limit, 10) : 20);
  }

  @Get('sessions/:id')
  async getSessionDetails(@Request() req: any, @Param('id') id: string) {
    return this.workoutsService.getSessionDetails(req.user.id, id);
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.workoutsService.getStats(req.user.id);
  }

  // ----------------------------------------------------
  // IA PERSONAL TRAINER (COACH IRON)
  // ----------------------------------------------------
  @Post('ai/generate-plan')
  async generatePlan(@Request() req: any, @Body() body: GeneratePlanDto) {
    return this.workoutAiService.generatePlan(req.user.id, body);
  }

  @Post('ai/save-plan')
  async saveGeneratedPlan(@Request() req: any, @Body() body: { plan: any }) {
    return this.workoutAiService.saveGeneratedPlan(req.user.id, body.plan);
  }

  @Post('ai/chat')
  async chatWithCoach(@Request() req: any, @Body() body: { message: string }) {
    return this.workoutAiService.chatWithCoach(req.user.id, body.message);
  }

  @Get('ai/insights')
  async getCoachInsights(@Request() req: any) {
    return this.workoutAiService.getCoachInsights(req.user.id);
  }

  @Get('ai/recovery-status')
  async getRecoveryStatus(@Request() req: any) {
    return this.workoutAiService.calculateRecoveryStatus(req.user.id);
  }

  @Get('ai/progressive-overload')
  async getProgressiveOverload(@Request() req: any) {
    return this.workoutAiService.suggestProgressiveOverload(req.user.id);
  }

  @Get('ai/sfr-scores')
  async getSFRScores(@Request() req: any) {
    return this.workoutAiService.calculateSFRScores(req.user.id);
  }

  @Get('ai/weekly-report')
  async getWeeklyExecutiveReport(@Request() req: any) {
    return this.workoutAiService.getWeeklyExecutiveReport(req.user.id);
  }
}
