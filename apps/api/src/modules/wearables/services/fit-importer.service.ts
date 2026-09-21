import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrivateObjectStorageService } from './storage.service';
import { FitValidatorService } from './fit-validator.service';
import { ImportStatus, WearableProvider } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';

export interface ImportFitResult {
  importId: string;
  status: ImportStatus;
  originalFileName: string;
  fileSizeBytes: number;
  message: string;
}

@Injectable()
export class FitImporterService {
  private readonly logger = new Logger(FitImporterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateObjectStorageService,
    private readonly validator: FitValidatorService,
  ) {}

  async stageAndRegisterFile(
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
  ): Promise<ImportFitResult> {
    // 1. Validação Binária Estrita (Header 12/14 bytes, .FIT, limites e integridade)
    this.validator.validateBinary(fileBuffer);

    // 2. Cálculo do hash SHA-256 do binário original
    const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 3. Verificação de Deduplicação Prévia
    const existingFile = await this.prisma.importedFile.findUnique({
      where: {
        userId_fileSha256: { userId, fileSha256 },
      },
    });

    if (existingFile) {
      return {
        importId: existingFile.id,
        status: ImportStatus.DUPLICATE,
        originalFileName: existingFile.originalFileName,
        fileSizeBytes: existingFile.fileSizeBytes,
        message: 'Arquivo FIT já importado anteriormente para este usuário (deduplicado por SHA-256).',
      };
    }

    // 4. Geração de Chave Opaca no Storage: wearables/${userId}/${ano}/${mes}/${uuid}.fit
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const storageUuid = crypto.randomUUID();
    const storageKey = `wearables/${userId}/${year}/${month}/${storageUuid}.fit`;

    // 5. Gravação no Storage Privado
    const storedRef = await this.storage.putObject(storageKey, fileBuffer);

    // 6. Higienização do nome original para rótulo visual seguro
    const sanitizedFileName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Retenção do binário original: 90 dias
    const retentionExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    try {
      // 7. Inserção do registro no banco com status PENDING
      const importedFile = await this.prisma.importedFile.create({
        data: {
          userId,
          provider: WearableProvider.MANUAL_FIT,
          originalFileName: sanitizedFileName,
          storageKey: storedRef.storageKey,
          storageDriver: storedRef.storageDriver,
          fileSizeBytes: storedRef.fileSizeBytes,
          fileSha256,
          status: ImportStatus.PENDING,
          retentionExpiresAt,
        },
      });

      return {
        importId: importedFile.id,
        status: ImportStatus.PENDING,
        originalFileName: importedFile.originalFileName,
        fileSizeBytes: importedFile.fileSizeBytes,
        message: 'Arquivo FIT validado e registrado com sucesso. Processamento assíncrono iniciado.',
      };
    } catch (err: any) {
      // 8. Compensação Imediata: se houver colisão concorrente de SHA-256 (erro P2002)
      if (err.code === 'P2002') {
        this.logger.warn(`Concorrência detectada para o arquivo SHA-256 ${fileSha256}. Acionando compensação no storage.`);
        await this.storage.deleteObject(storageKey);

        const winner = await this.prisma.importedFile.findUnique({
          where: { userId_fileSha256: { userId, fileSha256 } },
        });

        if (winner) {
          return {
            importId: winner.id,
            status: ImportStatus.DUPLICATE,
            originalFileName: winner.originalFileName,
            fileSizeBytes: winner.fileSizeBytes,
            message: 'Arquivo FIT concorrente já registrado por outra requisição.',
          };
        }
      }

      // Se falhar por outro motivo de banco, remove o arquivo do storage e repassa o erro
      await this.storage.deleteObject(storageKey);
      throw err;
    }
  }
}
