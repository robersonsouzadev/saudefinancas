import { Controller, Get, HttpStatus, Res, ServiceUnavailableException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivateObjectStorageService } from '../wearables/services/storage.service';
import { WearablesObservabilityService } from '../wearables/services/wearables-observability.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateObjectStorageService,
    private readonly observability: WearablesObservabilityService,
    @InjectQueue('wearables-fit-import') private readonly fitQueue: Queue,
  ) {}

  @Get('liveness')
  getLiveness() {
    return {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, string> = {
      database: 'UNKNOWN',
      timezone: 'UNKNOWN',
      redis: 'UNKNOWN',
      storage: 'UNKNOWN',
    };

    let isHealthy = true;
    const errors: string[] = [];

    // 1. PostgreSQL & Timezone UTC Check
    try {
      const dbCheck = await this.prisma.$queryRaw<Array<{ tz: string; ping: number }>>`
        SELECT current_setting('timezone') as tz, 1 as ping
      `;
      if (dbCheck && dbCheck.length > 0) {
        checks.database = 'UP';
        checks.timezone = dbCheck[0].tz;
        if (dbCheck[0].tz !== 'UTC') {
          isHealthy = false;
          errors.push(`PostgreSQL session timezone is ${dbCheck[0].tz}, expected UTC`);
        }
      } else {
        isHealthy = false;
        checks.database = 'DOWN';
        errors.push('Database query returned empty result');
      }
    } catch (err: any) {
      isHealthy = false;
      checks.database = 'DOWN';
      errors.push(`Database check failed: ${err?.message}`);
    }

    // 2. Redis Connection Check
    try {
      const redisClient = await this.fitQueue.client;
      const pingRes = await (redisClient as any).ping();
      if (pingRes === 'PONG') {
        checks.redis = 'UP';
      } else {
        isHealthy = false;
        checks.redis = 'DOWN';
        errors.push(`Redis returned unexpected PING response: ${pingRes}`);
      }
    } catch (err: any) {
      isHealthy = false;
      checks.redis = 'DOWN';
      errors.push(`Redis check failed: ${err?.message}`);
    }

    // 3. Storage Directory Check
    try {
      const storageOk = await this.storage.isHealthy();
      if (storageOk) {
        checks.storage = 'UP';
      } else {
        isHealthy = false;
        checks.storage = 'DOWN';
        errors.push('Storage directory is not accessible');
      }
    } catch (err: any) {
      isHealthy = false;
      checks.storage = 'DOWN';
      errors.push(`Storage check failed: ${err?.message}`);
    }

    const payload = {
      status: isHealthy ? 'UP' : 'DOWN',
      checks,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

    if (!isHealthy) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(payload);
    }

    return res.status(HttpStatus.OK).json(payload);
  }

  @Get('metrics')
  getMetrics(@Res() res: Response) {
    const metrics = this.observability.getMetricsAsPrometheusText();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(HttpStatus.OK).send(metrics);
  }
}
