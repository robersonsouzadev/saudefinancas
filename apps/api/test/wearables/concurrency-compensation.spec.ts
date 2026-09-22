import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FitImporterService } from '../../src/modules/wearables/services/fit-importer.service';
import { FitProcessingService } from '../../src/modules/wearables/processors/fit-processing.service';
import { ImportStatus } from '@prisma/client';
import { Encoder } from '@garmin/fitsdk';

function createSampleFitBuffer(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0,
    serialNumber: 970001,
    timeCreated: new Date('2026-09-21T10:00:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);
  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T10:30:00Z'),
    startTime: new Date('2026-09-21T10:00:00Z'),
    sport: 'running',
    totalElapsedTime: 1800,
    totalDistance: 5000,
  } as any);
  return Buffer.from(encoder.close());
}

describe('Concorrência, Deduplicação e Compensação (G2)', () => {
  let mockPrisma: any;
  let mockStorage: any;
  let mockValidator: any;
  let fitImporter: FitImporterService;

  beforeEach(() => {
    mockPrisma = {
      importedFile: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockStorage = {
      putObject: vi.fn().mockResolvedValue({
        storageKey: 'wearables/user-123/2026/09/uuid.fit',
        storageDriver: 'LOCAL_SECURE',
        fileSizeBytes: 1024,
      }),
      deleteObject: vi.fn().mockResolvedValue(true),
      getObject: vi.fn(),
    };

    mockValidator = {
      validateBinary: vi.fn().mockReturnValue({
        headerSize: 14,
        dataSize: 500,
        hasHeaderCrc: true,
      }),
    };

    fitImporter = new FitImporterService(
      mockPrisma,
      mockStorage,
      mockValidator,
    );
  });

  describe('Deduplicação e Compensação no Upload (FitImporterService)', () => {
    it('deve retornar DUPLICATE sem chamar o storage se o SHA-256 já existir previamente', async () => {
      const buffer = createSampleFitBuffer();
      mockPrisma.importedFile.findUnique.mockResolvedValueOnce({
        id: 'existing-import-id',
        originalFileName: 'activity_run.fit',
        fileSizeBytes: buffer.length,
        status: ImportStatus.PROCESSED,
      });

      const result = await fitImporter.stageAndRegisterFile('user-123', buffer, 'activity_run.fit');

      expect(result.status).toBe(ImportStatus.DUPLICATE);
      expect(result.importId).toBe('existing-import-id');
      expect(mockStorage.putObject).not.toHaveBeenCalled();
      expect(mockPrisma.importedFile.create).not.toHaveBeenCalled();
    });

    it('deve acionar compensação no storage e retornar DUPLICATE quando ocorrer colisão concorrente P2002', async () => {
      const buffer = createSampleFitBuffer();

      // Primeira busca não encontra duplicata (ambas threads chegam juntas)
      mockPrisma.importedFile.findUnique
        .mockResolvedValueOnce(null) // Checagem inicial
        .mockResolvedValueOnce({    // Busca do vencedor após colisão P2002
          id: 'winner-import-id',
          originalFileName: 'activity_run.fit',
          fileSizeBytes: buffer.length,
          status: ImportStatus.PENDING,
        });

      // Simula erro P2002 (Prisma Unique constraint violation no índice (userId, fileSha256))
      const p2002Error: any = new Error('Unique constraint failed on the fields: (`userId`,`fileSha256`)');
      p2002Error.code = 'P2002';
      mockPrisma.importedFile.create.mockRejectedValueOnce(p2002Error);

      const result = await fitImporter.stageAndRegisterFile('user-123', buffer, 'activity_run.fit');

      // 1. Deve ter gravado temporariamente no storage
      expect(mockStorage.putObject).toHaveBeenCalledTimes(1);
      // 2. Deve ter executado deleteObject para compensar e remover o arquivo órfão
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        expect.stringMatching(/^wearables\/user-123\/\d{4}\/\d{2}\/[0-9a-f-]+\.fit$/)
      );
      // 3. Deve retornar o status DUPLICATE associado ao ID do vencedor
      expect(result.status).toBe(ImportStatus.DUPLICATE);
      expect(result.importId).toBe('winner-import-id');
      expect(result.message).toMatch(/Arquivo FIT concorrente já registrado/);
    });

    it('deve deletar o arquivo do storage e relançar o erro se ocorrer falha genérica de banco de dados', async () => {
      const buffer = createSampleFitBuffer();
      mockPrisma.importedFile.findUnique.mockResolvedValueOnce(null);
      mockPrisma.importedFile.create.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        fitImporter.stageAndRegisterFile('user-123', buffer, 'activity_run.fit')
      ).rejects.toThrow('Database connection lost');

      // Deve ter compensado o storage removendo o arquivo órfão
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        expect.stringMatching(/^wearables\/user-123\/\d{4}\/\d{2}\/[0-9a-f-]+\.fit$/)
      );
    });
  });

  describe('Claim Atômico de Processamento (FitProcessingService)', () => {
    let fitProcessing: FitProcessingService;
    let mockSupervisor: any;
    let mockNormalizer: any;
    let mockProjector: any;
    let mockPseudonymizer: any;

    beforeEach(() => {
      mockSupervisor = {
        parseWithSupervisor: vi.fn(),
      };
      mockNormalizer = {
        normalize: vi.fn(),
      };
      mockProjector = {
        projectActivityToWorkoutSession: vi.fn(),
      };
      mockPseudonymizer = {
        generatePseudonym: vi.fn().mockReturnValue('pseudo_hash_user_123'),
      };

      fitProcessing = new FitProcessingService(
        mockPrisma,
        mockStorage,
        mockSupervisor,
        mockNormalizer,
        mockProjector,
        mockPseudonymizer,
      );
    });

    it('deve prosseguir quando o claim atômico obtiver count = 1 (primeiro worker)', async () => {
      // Simula primeiro worker obtendo a linha exclusivamente via $queryRaw UPDATE RETURNING
      mockPrisma.$queryRaw = vi.fn().mockResolvedValueOnce([{ id: 'import-1', leaseVersion: 1n }]);
      mockPrisma.importedFile.findUnique.mockResolvedValue({
        id: 'import-1',
        status: 'PENDING',
        userId: 'user-123',
        storageKey: 'wearables/user-123/2026/09/uuid.fit',
        fileSha256: 'abc',
        user: { timezone: 'America/Campo_Grande' },
      });
      mockPrisma.syncExecution = {
        create: vi.fn().mockResolvedValue({ id: 'sync-1' }),
        update: vi.fn().mockResolvedValue({}),
      };
      mockPrisma.consentRecord = {
        findFirst: vi.fn().mockResolvedValue(null),
      };
      mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => {
        return cb({
          workoutActivity: { create: vi.fn().mockResolvedValue({ id: 'act-1' }) },
          activitySource: { create: vi.fn().mockResolvedValue({}) },
          workoutLap: { createMany: vi.fn().mockResolvedValue({}) },
          workoutTelemetry: { create: vi.fn().mockResolvedValue({}) },
          syncExecution: { update: vi.fn().mockResolvedValue({}) },
          $queryRaw: vi.fn().mockResolvedValueOnce([{
            id: 'import-1',
            status: 'PROCESSING',
            leaseOwner: (fitProcessing as any).workerId,
            leaseVersion: 1n,
            isExpired: false,
          }]),
          $executeRaw: vi.fn().mockResolvedValueOnce(1),
        });
      });

      mockStorage.getObject.mockResolvedValueOnce(Buffer.from('fit-data'));
      mockSupervisor.parseWithSupervisor.mockResolvedValueOnce({ activityMesgs: [] });
      mockNormalizer.normalize.mockReturnValueOnce([]);

      await fitProcessing.processImport('import-1');

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockStorage.getObject).toHaveBeenCalledWith('wearables/user-123/2026/09/uuid.fit', 'abc');
    });

    it('deve abortar imediatamente sem tocar no storage quando o claim retornar count = 0 (segundo worker)', async () => {
      // Simula segundo worker tentando pegar o mesmo job já em processamento (retorna array vazio)
      mockPrisma.importedFile.findUnique.mockResolvedValueOnce({ status: 'PENDING' });
      mockPrisma.$queryRaw = vi.fn().mockResolvedValueOnce([]);

      await fitProcessing.processImport('import-1');

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      // Nenhuma ação adicional deve ser realizada
      expect(mockStorage.getObject).not.toHaveBeenCalled();
      expect(mockSupervisor.parseWithSupervisor).not.toHaveBeenCalled();
    });
  });
});
