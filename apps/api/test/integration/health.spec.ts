import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { HealthController } from '../../src/modules/health/health.controller';
import { WearablesObservabilityService } from '../../src/modules/wearables/services/wearables-observability.service';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

describe('Health and Readiness Probes (G4.2)', () => {
  let env: TestEnvironment;
  let controller: HealthController;
  let observability: WearablesObservabilityService;
  let queue: Queue;
  let storage: PrivateObjectStorageService;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    observability = new WearablesObservabilityService();
    storage = new PrivateObjectStorageService(new ConfigService());
    queue = new Queue('wearables-fit-import', { connection: { host: '127.0.0.1', port: 6380 } });

    controller = new HealthController(
      env.prisma as any,
      storage,
      observability,
      queue,
    );
  }, 30000);

  afterAll(async () => {
    await queue.close();
    await teardownTestEnvironment();
  });

  it('1. /health/liveness deve retornar HTTP 200 com status UP', () => {
    const liveness = controller.getLiveness();
    expect(liveness.status).toBe('UP');
    expect(typeof liveness.uptimeSeconds).toBe('number');
    expect(liveness.timestamp).toBeDefined();
  });

  it('2. /health/readiness deve retornar HTTP 200 quando PostgreSQL (UTC), Redis e Storage estão saudáveis', async () => {
    let capturedStatus: number | null = null;
    let capturedJson: any = null;

    const mockRes: any = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (data: any) => {
            capturedJson = data;
            return data;
          },
        };
      },
    };

    await controller.getReadiness(mockRes);

    expect(capturedStatus).toBe(200);
    expect(capturedJson.status).toBe('UP');
    expect(capturedJson.checks.database).toBe('UP');
    expect(capturedJson.checks.timezone).toBe('UTC');
    expect(capturedJson.checks.redis).toBe('UP');
    expect(capturedJson.checks.storage).toBe('UP');
  });

  it('3. /health/readiness deve falhar com HTTP 503 se o timezone do PostgreSQL não for UTC', async () => {
    let capturedStatus: number | null = null;
    let capturedJson: any = null;

    const mockRes: any = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (data: any) => {
            capturedJson = data;
            return data;
          },
        };
      },
    };

    // Cria mock do prisma com timezone divergente
    const badTzPrisma: any = {
      $queryRaw: async () => [{ tz: 'America/Campo_Grande', ping: 1 }],
    };

    const badController = new HealthController(
      badTzPrisma,
      storage,
      observability,
      queue,
    );

    await badController.getReadiness(mockRes);

    expect(capturedStatus).toBe(503);
    expect(capturedJson.status).toBe('DOWN');
    expect(capturedJson.checks.timezone).toBe('America/Campo_Grande');
    expect(capturedJson.errors).toBeDefined();
    expect(capturedJson.errors[0]).toContain('expected UTC');
  });

  it('4. /health/metrics deve retornar formato de texto Prometheus', () => {
    observability.recordImport({ provider: 'MANUAL_FIT', status: 'PROCESSED' }, 500);

    let capturedHeaders: Record<string, string> = {};
    let capturedBody = '';

    const mockRes: any = {
      setHeader: (name: string, value: string) => {
        capturedHeaders[name] = value;
      },
      status: (code: number) => ({
        send: (body: string) => {
          capturedBody = body;
          return body;
        },
      }),
    };

    controller.getMetrics(mockRes);

    expect(capturedHeaders['Content-Type']).toContain('text/plain');
    expect(capturedBody).toContain('# HELP wearables_imports_total');
    expect(capturedBody).toContain('wearables_imports_total');
  });
});
