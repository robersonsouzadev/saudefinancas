import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FitProcessingService } from './fit-processing.service';

export interface FitImportJobData {
  importId: string;
}

@Processor('wearables-fit-import')
export class FitImportProcessor extends WorkerHost {
  private readonly logger = new Logger(FitImportProcessor.name);

  constructor(private readonly processingService: FitProcessingService) {
    super();
  }

  async process(job: Job<FitImportJobData, any, string>): Promise<any> {
    const { importId } = job.data;
    this.logger.log(`[BullMQ] Iniciando processamento do job ${job.id} para o arquivo ${importId}`);
    await this.processingService.processImport(importId);
    return { status: 'COMPLETED', importId };
  }
}
