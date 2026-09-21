import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, ImportStatus } from '@prisma/client';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from '../infra/test-env';
import { WearablesController, ImportStatusResponseDto } from '../../src/modules/wearables/controllers/wearables.controller';
import { PseudonymizationService } from '../../src/modules/wearables/services/pseudonymization.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('Testes de Regressão HTTP e Contrato DTO (G4.1.1)', () => {
  let env: TestEnvironment;
  let prisma: PrismaClient;
  let controller: WearablesController;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    prisma = env.prisma;

    const u1 = await prisma.user.create({
      data: {
        email: `http_reg_user1_${Date.now()}@vitasatude.com`,
        name: 'Usuário HTTP 1',
        timezone: 'America/Campo_Grande',
      },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        email: `http_reg_user2_${Date.now()}@vitasatude.com`,
        name: 'Usuário HTTP 2',
        timezone: 'America/Sao_Paulo',
      },
    });
    user2Id = u2.id;

    const config = new ConfigService({
      AUDIT_HMAC_SECRET: 'test-hmac-secret-super-key-2026',
    });
    const pseudonymizer = new PseudonymizationService(config);

    const mockFitImporter = {} as any;
    const mockFitQueue = {} as any;

    controller = new WearablesController(
      mockFitImporter,
      prisma as any,
      pseudonymizer,
      mockFitQueue,
    );
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('1. GET /config deve retornar o limite parametrizado de 15MB em MB e Bytes', () => {
    const config = controller.getUploadConfig();
    expect(config.maxUploadSizeMb).toBe(15);
    expect(config.maxUploadSizeBytes).toBe(15 * 1024 * 1024);
    expect(config.allowedExtensions).toContain('.fit');
  });

  it('2. GET /imports/:id deve retornar 200 com DTO estrito e ser serializável em JSON sem BigInt', async () => {
    const sha256 = crypto.randomBytes(32).toString('hex');
    const created = await prisma.importedFile.create({
      data: {
        userId: user1Id,
        storageKey: `wearables/${user1Id}/file.fit`,
        fileSha256: sha256,
        originalFileName: 'activity.fit',
        fileSizeBytes: 2048,
        status: ImportStatus.PROCESSED,
        leaseOwner: 'test-worker-uuid',
        leaseVersion: BigInt(5),
        workerPid: 99999,
        processingDurationMs: 120,
        processedAt: new Date(),
      },
    });

    const req = { user: { id: user1Id } };
    const result: ImportStatusResponseDto = await controller.getImportStatus(req, created.id);

    // Deve serializar para JSON sem lançar TypeError: Do not know how to serialize a BigInt
    let jsonString = '';
    expect(() => {
      jsonString = JSON.stringify(result);
    }).not.toThrow();

    const parsed = JSON.parse(jsonString);

    // Campos permitidos
    expect(parsed.id).toBe(created.id);
    expect(parsed.status).toBe('PROCESSED');
    expect(parsed.originalFileName).toBe('activity.fit');
    expect(parsed.fileSizeBytes).toBe(2048);
    expect(parsed.processingDurationMs).toBe(120);
    expect(parsed.processedAt).not.toBeNull();
    expect(Array.isArray(parsed.activities)).toBe(true);

    // Campos internos estritamente PROIBIDOS no contrato HTTP
    expect(parsed.leaseOwner).toBeUndefined();
    expect(parsed.leaseExpiresAt).toBeUndefined();
    expect(parsed.leaseVersion).toBeUndefined();
    expect(parsed.workerPid).toBeUndefined();
    expect(parsed.storageKey).toBeUndefined();
    expect(parsed.fileSha256).toBeUndefined();
    expect(parsed.retryCount).toBeUndefined();
    expect(parsed.recoverySequence).toBeUndefined();
  });

  it('3. GET /imports/:id com tentativa de acesso cruzado (IDOR) deve lançar NotFoundException (404)', async () => {
    const sha256 = crypto.randomBytes(32).toString('hex');
    const created = await prisma.importedFile.create({
      data: {
        userId: user1Id,
        storageKey: `wearables/${user1Id}/private.fit`,
        fileSha256: sha256,
        originalFileName: 'private.fit',
        fileSizeBytes: 1024,
        status: ImportStatus.PENDING,
      },
    });

    // Usuário 2 tentando acessar registro do Usuário 1
    const reqUser2 = { user: { id: user2Id } };
    await expect(controller.getImportStatus(reqUser2, created.id)).rejects.toThrow(NotFoundException);
  });

  it('4. GET /imports/:id com status FAILED deve retornar mensagem pública segura sem stack trace', async () => {
    const sha256 = crypto.randomBytes(32).toString('hex');
    const created = await prisma.importedFile.create({
      data: {
        userId: user1Id,
        storageKey: `wearables/${user1Id}/failed.fit`,
        fileSha256: sha256,
        originalFileName: 'corrupted.fit',
        fileSizeBytes: 512,
        status: ImportStatus.FAILED,
        errorCode: 'FIT_CRC_MISMATCH',
        errorMessage: 'INTERNAL_ERROR: Node Buffer CRC calculation failed at line 142 in /src/parser.ts: memory dump...',
      },
    });

    const req = { user: { id: user1Id } };
    const result = await controller.getImportStatus(req, created.id);

    expect(result.status).toBe(ImportStatus.FAILED);
    expect(result.errorCode).toBe('FIT_CRC_MISMATCH');
    // Deve retornar mensagem pública amigável, NUNCA o stack trace ou detalhes internos
    expect(result.errorMessage).toBe('Arquivo FIT corrompido: falha na verificação de integridade CRC.');
    expect(result.errorMessage).not.toContain('INTERNAL_ERROR');
    expect(result.errorMessage).not.toContain('/src/parser.ts');
  });
});
