import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';

export interface DecodedFitData {
  sessionMesgs: any[];
  lapMesgs: any[];
  recordMesgs: any[];
  setMesgs: any[];
  fileIdMesgs: any[];
  deviceInfoMesgs: any[];
  sportMesgs: any[];
  errors: any[];
}

export class FitParserTimeoutError extends Error {
  readonly code = 'PARSER_TIMEOUT';
  constructor(message: string) {
    super(message);
    this.name = 'FitParserTimeoutError';
  }
}

export class FitParserMemoryError extends Error {
  readonly code = 'PARSER_MEMORY_LIMIT';
  constructor(message: string) {
    super(message);
    this.name = 'FitParserMemoryError';
  }
}

@Injectable()
export class FitWorkerSupervisorService {
  private readonly logger = new Logger(FitWorkerSupervisorService.name);

  private getWorkerPath(): string {
    const candidates = [
      path.resolve(__dirname, 'fit-parser.worker.js'),
      path.resolve(process.cwd(), 'dist', 'src', 'modules', 'wearables', 'services', 'fit-parser.worker.js'),
      path.resolve(process.cwd(), 'apps', 'api', 'dist', 'src', 'modules', 'wearables', 'services', 'fit-parser.worker.js'),
      path.resolve(process.cwd(), 'apps', 'api', 'src', 'modules', 'wearables', 'services', 'fit-parser.worker.js'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0];
  }

  async parseWithSupervisor(buffer: Buffer, timeoutMs = 15000): Promise<DecodedFitData> {
    return new Promise<DecodedFitData>((resolve, reject) => {
      const resolvedPath = this.getWorkerPath();
      const worker = new Worker(resolvedPath, {
        resourceLimits: {
          maxOldGenerationSizeMb: 256,
        },
      });

      let isTerminated = false;

      const timer = setTimeout(async () => {
        if (isTerminated) return;
        isTerminated = true;
        this.logger.warn(`Worker de parsing FIT excedeu o timeout de ${timeoutMs}ms. Forçando worker.terminate().`);
        try {
          await worker.terminate();
        } catch (e: any) {
          this.logger.error(`Erro ao terminar worker: ${e?.message}`);
        }
        reject(new FitParserTimeoutError(`Processamento cancelado pelo supervisor por exceder o tempo limite de ${timeoutMs / 1000}s`));
      }, timeoutMs);

      worker.on('message', async (response: { success: boolean; data?: DecodedFitData; error?: string }) => {
        if (isTerminated) return;
        clearTimeout(timer);
        isTerminated = true;
        await worker.terminate().catch(() => {});

        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Falha na decodificação do arquivo FIT'));
        }
      });

      worker.on('error', async (err: any) => {
        if (isTerminated) return;
        clearTimeout(timer);
        isTerminated = true;
        await worker.terminate().catch(() => {});
        this.logger.error(`Erro no worker thread FIT: ${err?.message}`);
        if (err?.message?.includes('out of memory') || err?.code === 'ERR_WORKER_OUT_OF_MEMORY') {
          reject(new FitParserMemoryError('Limite de memória de 256MB excedido pelo parser'));
        } else {
          reject(err);
        }
      });

      worker.on('exit', (exitCode) => {
        if (isTerminated) return;
        clearTimeout(timer);
        if (exitCode !== 0) {
          reject(new Error(`Worker thread terminou abruptamente com código de saída ${exitCode}`));
        }
      });

      worker.postMessage({ buffer });
    });
  }
}
