import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Module, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { HealthController } from '../../src/modules/health/health.controller';
import { WearablesObservabilityService } from '../../src/modules/wearables/services/wearables-observability.service';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

describe('Health and Readiness Probes HTTP Reais (G4.2)', () => {
  let env: TestEnvironment;
  let app: INestApplication;
  let baseUrl: string;
  let observability: WearablesObservabilityService;
  let queue: Queue;
  let storage: PrivateObjectStorageService;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    observability = new WearablesObservabilityService();
    storage = new PrivateObjectStorageService(new ConfigService());
    queue = new Queue('wearables-fit-import', { connection: { host: '127.0.0.1', port: 6380 } });

    @Module({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: env.prisma },
        { provide: PrivateObjectStorageService, useValue: storage },
        { provide: WearablesObservabilityService, useValue: observability },
        { provide: 'BullQueue_wearables-fit-import', useValue: queue },
      ],
    })
    class HealthTestModule {}

    app = await NestFactory.create(HealthTestModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
    });

    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (queue) {
      await queue.close();
    }
    await teardownTestEnvironment();
  });

  it('1. GET /health/liveness deve responder HTTP 200 com status UP via rede HTTP real', async () => {
    const res = await fetch(`${baseUrl}/health/liveness`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('UP');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.timestamp).toBeDefined();
  });

  it('2. GET /api/health/liveness deve responder HTTP 200 com status UP via rede HTTP real', async () => {
    const res = await fetch(`${baseUrl}/api/health/liveness`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('UP');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.timestamp).toBeDefined();
  });

  it('3. GET /health/readiness deve responder HTTP 200 quando PostgreSQL (UTC), Redis e Storage estão saudáveis', async () => {
    const res = await fetch(`${baseUrl}/health/readiness`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('UP');
    expect(body.checks.database).toBe('UP');
    expect(body.checks.timezone).toBe('UTC');
    expect(body.checks.redis).toBe('UP');
    expect(body.checks.storage).toBe('UP');
  });

  it('4. GET /api/health/readiness deve responder HTTP 200 quando PostgreSQL (UTC), Redis e Storage estão saudáveis', async () => {
    const res = await fetch(`${baseUrl}/api/health/readiness`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('UP');
    expect(body.checks.database).toBe('UP');
    expect(body.checks.timezone).toBe('UTC');
    expect(body.checks.redis).toBe('UP');
    expect(body.checks.storage).toBe('UP');
  });

  it('5. GET /health/metrics deve retornar formato de texto Prometheus (HTTP 200)', async () => {
    observability.recordImport({ provider: 'MANUAL_FIT', status: 'PROCESSED' }, 500);
    const res = await fetch(`${baseUrl}/health/metrics`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('# HELP wearables_imports_total');
    expect(text).toContain('wearables_imports_total');
  });

  it('6. GET /api/health/metrics deve retornar formato de texto Prometheus (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/api/health/metrics`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('# HELP wearables_imports_total');
  });

  it('7. GET /health/readiness deve retornar HTTP 503 se o timezone não for UTC', async () => {
    const badTzPrisma = {
      $queryRaw: async () => [{ tz: 'America/Campo_Grande', ping: 1 }],
    };

    @Module({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: badTzPrisma },
        { provide: PrivateObjectStorageService, useValue: storage },
        { provide: WearablesObservabilityService, useValue: observability },
        { provide: 'BullQueue_wearables-fit-import', useValue: queue },
      ],
    })
    class BadTzModule {}

    const badApp = await NestFactory.create(BadTzModule, { logger: false });
    badApp.setGlobalPrefix('api', {
      exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
    });
    await badApp.listen(0);
    const address = badApp.getHttpServer().address();
    const badPort = typeof address === 'string' ? 0 : address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${badPort}/health/readiness`);
      expect(res.status).toBe(503);
      const body: any = await res.json();
      expect(body.status).toBe('DOWN');
      expect(body.checks.timezone).toBe('America/Campo_Grande');
      expect(body.errors).toBeDefined();
      expect(body.errors[0]).toContain('expected UTC');
    } finally {
      await badApp.close();
    }
  });
});
