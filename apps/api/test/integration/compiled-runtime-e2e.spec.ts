import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, ImportStatus, ConsentType } from '@prisma/client';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { FitWorkerSupervisorService } from '../../src/modules/wearables/services/fit-worker-supervisor.service';
import { FitNormalizerService } from '../../src/modules/wearables/services/fit-normalizer.service';
import { FitValidatorService } from '../../src/modules/wearables/services/fit-validator.service';
import { FitProcessingService } from '../../src/modules/wearables/processors/fit-processing.service';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { WorkoutProjectionService } from '../../src/modules/wearables/services/workout-projection.service';
import { PseudonymizationService } from '../../src/modules/wearables/services/pseudonymization.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Testes E2E de Runtime Compilado e Processamento FIT Real (G4.1)', () => {
  let env: TestEnvironment;
  let prisma: PrismaClient;
  let supervisor: FitWorkerSupervisorService;
  let normalizer: FitNormalizerService;
  let validator: FitValidatorService;
  let storage: PrivateObjectStorageService;
  let projector: WorkoutProjectionService;
  let pseudonymizer: PseudonymizationService;
  let processingService: FitProcessingService;
  let testUserId: string;

  const fixturesDir = path.resolve(__dirname, '../fixtures');

  beforeAll(async () => {
    env = await setupTestEnvironment();
    prisma = env.prisma;

    const user = await prisma.user.create({
      data: {
        email: `runtime_test_${Date.now()}@vitasatude.com`,
        name: 'Usuário Atleta Dourados',
        timezone: 'America/Campo_Grande',
      },
    });
    testUserId = user.id;

    const config = new ConfigService({
      AUDIT_HMAC_SECRET: 'test-audit-hmac-secret-super-key-2026',
    });

    supervisor = new FitWorkerSupervisorService();
    normalizer = new FitNormalizerService();
    validator = new FitValidatorService();
    storage = new PrivateObjectStorageService(config);
    projector = new WorkoutProjectionService();
    pseudonymizer = new PseudonymizationService(config);

    processingService = new FitProcessingService(
      prisma as any,
      storage,
      supervisor,
      normalizer,
      projector,
      pseudonymizer,
    );
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('1. Deve validar que o worker compilado dist/src/modules/wearables/services/fit-parser.worker.js existe fisicamente', () => {
    const compiledWorkerPath = path.resolve(
      process.cwd(),
      'dist/src/modules/wearables/services/fit-parser.worker.js',
    );
    expect(fs.existsSync(compiledWorkerPath)).toBe(true);
  });

  it('2. Deve processar fixture sintética de corrida (synthetic_running.fit) até PROCESSED', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_running.fit'));
    validator.validateBinary(buffer);

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = `wearables/${testUserId}/2026/09/${crypto.randomUUID()}.fit`;
    await storage.putObject(storageKey, buffer);

    const imported = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey,
        fileSha256: sha256,
        originalFileName: 'synthetic_running.fit',
        fileSizeBytes: buffer.length,
        status: ImportStatus.PENDING,
      },
    });

    await processingService.processImport(imported.id);

    const check = await prisma.importedFile.findUnique({ where: { id: imported.id } });
    expect(check?.status).toBe(ImportStatus.PROCESSED);
    expect(check?.leaseOwner).toBeNull();
    expect(check?.processedAt).not.toBeNull();

    // Valida persistência da atividade canônica
    const activity = await prisma.workoutActivity.findFirst({
      where: { userId: testUserId, sportCategory: 'RUNNING' },
      include: { laps: true, telemetry: true },
    });
    expect(activity).not.toBeNull();
    expect(activity?.timezone).toBe('America/Campo_Grande');
    expect(activity?.durationSeconds).toBe(2700);
    expect(activity?.laps.length).toBe(2);
    expect(activity?.telemetry).not.toBeNull();

    // Valida projeção em WorkoutSession
    const session = await prisma.workoutSession.findUnique({
      where: { workoutActivityId: activity!.id },
    });
    expect(session).not.toBeNull();
    expect(session?.durationMinutes).toBe(45);
  });

  it('3. Deve processar fixture derivada do Forerunner 970 sanitizada (private/derived_forerunner970_sanitized.fit)', async () => {
    const filePath = path.join(fixturesDir, 'private/derived_forerunner970_sanitized.fit');
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    validator.validateBinary(buffer);

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = `wearables/${testUserId}/2026/09/${crypto.randomUUID()}.fit`;
    await storage.putObject(storageKey, buffer);

    const imported = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey,
        fileSha256: sha256,
        originalFileName: 'derived_forerunner970_sanitized.fit',
        fileSizeBytes: buffer.length,
        status: ImportStatus.PENDING,
      },
    });

    await processingService.processImport(imported.id);

    const check = await prisma.importedFile.findUnique({ where: { id: imported.id } });
    expect(check?.status).toBe(ImportStatus.PROCESSED);

    const source = await prisma.activitySource.findFirst({
      where: { importedFileId: imported.id },
      include: { activity: true },
    });
    expect(source).not.toBeNull();
    const activity = source?.activity;
    expect(activity).not.toBeNull();
    expect(activity?.deviceManufacturer).toBe('garmin');
    expect(activity?.durationSeconds).toBe(4320);
    expect(activity?.totalCaloriesEstimated).toBe(920);
  });

  it('4. Deve processar fixture multiesporte com multi-sessão (synthetic_multisport.fit)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_multisport.fit'));
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = `wearables/${testUserId}/2026/09/${crypto.randomUUID()}.fit`;
    await storage.putObject(storageKey, buffer);

    const imported = await prisma.importedFile.create({
      data: {
        userId: testUserId,
        storageKey,
        fileSha256: sha256,
        originalFileName: 'synthetic_multisport.fit',
        fileSizeBytes: buffer.length,
        status: ImportStatus.PENDING,
      },
    });

    await processingService.processImport(imported.id);

    const sources = await prisma.activitySource.findMany({
      where: { importedFileId: imported.id },
      orderBy: { sessionIndex: 'asc' },
    });

    expect(sources.length).toBe(2);
    expect(sources[0].sessionIndex).toBe(0);
    expect(sources[1].sessionIndex).toBe(1);
  });

  it('5. Deve rejeitar arquivo corrompido com falha de CRC (synthetic_corrupted.fit)', () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_corrupted.fit'));
    expect(() => validator.validateBinary(buffer)).toThrow(BadRequestException);
  });

  it('6. Deve rejeitar arquivo truncado (synthetic_truncated.fit)', () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_truncated.fit'));
    expect(() => validator.validateBinary(buffer)).toThrow(/Arquivo truncado/);
  });

  it('7. Higienização de GPS sem consentimento LGPD', async () => {
    // Garante que o usuário NÃO tem consentimento de localização
    await prisma.consentRecord.deleteMany({
      where: { userId: testUserId, consentType: ConsentType.LOCATION_DATA_PROCESSING },
    });

    const buffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_running.fit'));
    const decoded = await supervisor.parseWithSupervisor(buffer, 10000);
    const normalized = normalizer.normalize(decoded, 'America/Campo_Grande', false);

    expect(normalized[0].telemetry.hasLocationData).toBe(false);
    for (const s of normalized[0].telemetry.samples) {
      expect(s.lat).toBeUndefined();
      expect(s.lon).toBeUndefined();
      expect(s.altitude).toBeUndefined();
    }
  });

  it('8. Ausência absoluta de campos de credencial ou login Garmin na base e nos DTOs', () => {
    const schemaFile = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schemaFile).not.toMatch(/garminPassword/i);
    expect(schemaFile).not.toMatch(/garminEmail/i);
    expect(schemaFile).not.toMatch(/garminSecret/i);
  });
});
