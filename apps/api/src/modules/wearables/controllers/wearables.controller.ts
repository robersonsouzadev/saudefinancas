import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FitImporterService } from '../services/fit-importer.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PseudonymizationService } from '../services/pseudonymization.service';
import { FitUploadConfig } from '../config/fit-upload.config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConsentType, ConsentStatus, ImportStatus } from '@prisma/client';

export interface ImportActivitySummaryDto {
  id: string;
  sportCategory: string;
  sportNameOriginal?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  localDate: string;
  timezone: string;
  durationSeconds: number;
  distanceMeters?: number | null;
  totalCaloriesEstimated?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  deviceManufacturer?: string | null;
  deviceModel?: string | null;
}

export interface ImportStatusResponseDto {
  id: string;
  status: ImportStatus;
  originalFileName: string;
  fileSizeBytes: number;
  errorCode: string | null;
  errorMessage: string | null;
  processingDurationMs: number | null;
  processedAt: Date | null;
  createdAt: Date;
  activities: ImportActivitySummaryDto[];
}

@Controller('integrations/wearables')
@UseGuards(JwtAuthGuard)
export class WearablesController {
  private readonly logger = new Logger(WearablesController.name);

  constructor(
    private readonly fitImporter: FitImporterService,
    private readonly prisma: PrismaService,
    private readonly pseudonymizer: PseudonymizationService,
    @InjectQueue('wearables-fit-import') private readonly fitQueue: Queue,
  ) {}

  // 0. Configurações de Upload de FIT expostas ao Frontend
  @Get('config')
  getUploadConfig() {
    return {
      maxUploadSizeMb: FitUploadConfig.MAX_UPLOAD_SIZE_MB,
      maxUploadSizeBytes: FitUploadConfig.MAX_UPLOAD_SIZE_BYTES,
      allowedMimeTypes: ['application/vnd.ant.fit', 'application/octet-stream'],
      allowedExtensions: ['.fit'],
    };
  }

  // 1. Upload de Arquivo FIT (Retorna HTTP 202 Accepted para novos arquivos)
  @Post('fit/import')
  @UseInterceptors(FileInterceptor('file', {
    // Busboy corta e emite limit quando fileSize === fileSizeLimit.
    // Usar MAX_UPLOAD_SIZE_BYTES + 1 permite exatamente 15 MB (15728640 bytes) inclusivos
    // e rejeita com HTTP 413 (LIMIT_FILE_SIZE) qualquer arquivo com 15 MB + 1 byte (15728641 bytes).
    limits: { fileSize: FitUploadConfig.MAX_UPLOAD_SIZE_BYTES + 1 },
  }))
  async importFitFile(
    @Req() req: any,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Usuário não autenticado');

    if (!file || !file.buffer) {
      throw new BadRequestException('Nenhum arquivo binário enviado no campo "file".');
    }

    if (file.buffer.length > FitUploadConfig.MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(`Arquivo excede o limite máximo permitido de ${FitUploadConfig.MAX_UPLOAD_SIZE_MB} MB.`);
    }

    const result = await this.fitImporter.stageAndRegisterFile(
      userId,
      file.buffer,
      file.originalname || 'activity.fit',
    );

    // Se for novo arquivo (status PENDING), despachar para a fila BullMQ
    if (result.status === ImportStatus.PENDING) {
      try {
        await this.fitQueue.add(
          'process-fit',
          { importId: result.importId, sequence: 0 },
          { jobId: `${result.importId}-dispatch-0`, removeOnComplete: true, removeOnFail: false },
        );
      } catch (queueErr: any) {
        // Se o Redis falhar temporariamente, o OutboxReconciliationService irá recuperar
        this.logger.warn(`Falha ao enfileirar imediatamente no BullMQ: ${queueErr?.message}. Será recuperado pelo Outbox.`);
      }

      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    // Se for duplicado (DUPLICATE), retorna 200 OK informando o ID original
    return res.status(HttpStatus.OK).json(result);
  }

  // 2. Histórico de Importações do Usuário
  @Get('imports')
  async listImports(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user.id;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      this.prisma.importedFile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          originalFileName: true,
          fileSizeBytes: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          processingDurationMs: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.importedFile.count({ where: { userId } }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }

  // 3. Status de uma Importação Específica (Polling do Frontend com DTO Allowlist Estrito)
  @Get('imports/:id')
  async getImportStatus(@Req() req: any, @Param('id') id: string): Promise<ImportStatusResponseDto> {
    const userId = req.user.id;

    const file = await this.prisma.importedFile.findUnique({
      where: { id },
      include: {
        sources: {
          include: {
            activity: true,
          },
        },
      },
    });

    if (!file || file.userId !== userId) {
      throw new NotFoundException('Registro de importação não encontrado');
    }

    const activities: ImportActivitySummaryDto[] = (file.sources || [])
      .filter((s) => s.activity != null)
      .map((s) => ({
        id: s.activity.id,
        sportCategory: s.activity.sportCategory,
        sportNameOriginal: s.activity.sportNameOriginal,
        startedAt: s.activity.startedAt,
        finishedAt: s.activity.finishedAt,
        localDate: s.activity.localDate,
        timezone: s.activity.timezone,
        durationSeconds: s.activity.durationSeconds,
        distanceMeters: s.activity.distanceMeters,
        totalCaloriesEstimated: s.activity.totalCaloriesEstimated,
        avgHeartRate: s.activity.avgHeartRate,
        maxHeartRate: s.activity.maxHeartRate,
        deviceManufacturer: s.activity.deviceManufacturer,
        deviceModel: s.activity.deviceModel,
      }));

    let publicErrorMessage: string | null = null;
    if (file.status === ImportStatus.FAILED) {
      publicErrorMessage = this.mapSafeErrorMessage(file.errorCode, file.errorMessage);
    }

    // DTO por allowlist explícita: expurga leaseOwner, leaseExpiresAt, leaseVersion, workerPid, storageKey
    const responseDto: ImportStatusResponseDto = {
      id: file.id,
      status: file.status,
      originalFileName: file.originalFileName,
      fileSizeBytes: file.fileSizeBytes,
      errorCode: file.errorCode,
      errorMessage: publicErrorMessage,
      processingDurationMs: file.processingDurationMs,
      processedAt: file.processedAt,
      createdAt: file.createdAt,
      activities,
    };

    return responseDto;
  }

  private mapSafeErrorMessage(errorCode?: string | null, _rawMessage?: string | null): string {
    switch (errorCode) {
      case 'INVALID_FIT_HEADER':
        return 'O arquivo enviado não possui um cabeçalho Garmin FIT válido.';
      case 'FIT_CRC_MISMATCH':
        return 'Arquivo FIT corrompido: falha na verificação de integridade CRC.';
      case 'PARSER_TIMEOUT':
        return 'O processamento do arquivo excedeu o tempo limite permitido (15 segundos).';
      case 'PARSER_MEMORY_LIMIT':
        return 'O arquivo requer mais memória do que o limite seguro alocado (256MB).';
      case 'PROCESSING_ABANDONED':
        return 'O processamento foi interrompido e excedeu as tentativas automáticas.';
      default:
        return 'Não foi possível processar o arquivo FIT. Por favor, tente exportá-lo novamente do seu dispositivo.';
    }
  }

  // 4. Lista de Atividades Canônicas de Wearables
  @Get('activities')
  async listActivities(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user.id;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      this.prisma.workoutActivity.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          laps: { select: { id: true, lapIndex: true, totalTimeSeconds: true, distanceMeters: true, avgHeartRate: true } },
          telemetry: { select: { sampleCount: true, hasLocationData: true } },
        },
      }),
      this.prisma.workoutActivity.count({ where: { userId } }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }

  // 5. Detalhes Completos da Atividade com Telemetria para Gráficos
  @Get('activities/:id')
  async getActivityDetails(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const activity = await this.prisma.workoutActivity.findUnique({
      where: { id },
      include: {
        laps: { orderBy: { lapIndex: 'asc' } },
        telemetry: true,
        sources: true,
      },
    });

    if (!activity || activity.userId !== userId) {
      throw new NotFoundException('Atividade não encontrada');
    }

    return activity;
  }

  // 6. Exclusão de Atividade (Cascata completa em laps, telemetria e projeção)
  @Delete('activities/:id')
  async deleteActivity(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const activity = await this.prisma.workoutActivity.findUnique({ where: { id } });
    if (!activity || activity.userId !== userId) {
      throw new NotFoundException('Atividade não encontrada');
    }

    await this.prisma.workoutActivity.delete({ where: { id } });
    return { success: true, message: 'Atividade excluída com sucesso.' };
  }

  // 7. Registro de Consentimento LGPD (Imutável)
  @Post('consent')
  async recordConsent(
    @Req() req: any,
    @Body() body: { consentType: ConsentType; granted: boolean; notes?: string },
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent']?.toString();
    const userPseudonym = this.pseudonymizer.generatePseudonym(userId);

    const record = await this.prisma.consentRecord.create({
      data: {
        userId,
        userPseudonym,
        consentType: body.consentType,
        policyVersion: '1.0',
        status: body.granted ? ConsentStatus.GRANTED : ConsentStatus.REVOKED,
        ipAddress,
        userAgent,
        notes: body.notes,
      },
    });

    return record;
  }

  // 8. Consulta de Consentimentos Ativos
  @Get('consent')
  async getConsents(@Req() req: any) {
    const userId = req.user.id;

    const consents = await this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Identificar status mais recente para cada tipo
    const activeMap: Record<string, boolean> = {};
    for (const c of consents) {
      if (activeMap[c.consentType] === undefined) {
        activeMap[c.consentType] = c.status === ConsentStatus.GRANTED;
      }
    }

    return {
      wearableDataProcessing: activeMap[ConsentType.WEARABLE_DATA_PROCESSING] ?? true,
      locationDataProcessing: activeMap[ConsentType.LOCATION_DATA_PROCESSING] ?? false,
      healthMetricsStorage: activeMap[ConsentType.HEALTH_METRICS_STORAGE] ?? true,
    };
  }
}
