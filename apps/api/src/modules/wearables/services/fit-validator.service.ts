import { Injectable, BadRequestException } from '@nestjs/common';
import { Decoder, Stream } from '@garmin/fitsdk';
import { FitUploadConfig } from '../config/fit-upload.config';

export interface FitHeaderInfo {
  headerSize: number;
  protocolVersion: number;
  profileVersion: number;
  dataSize: number;
  hasHeaderCrc: boolean;
  headerCrc?: number;
}

@Injectable()
export class FitValidatorService {
  validateBinary(buffer: Buffer): FitHeaderInfo {
    if (!buffer || buffer.length < 12) {
      throw new BadRequestException('Arquivo truncado ou menor que o cabeçalho mínimo FIT (12 bytes).');
    }

    if (buffer.length > FitUploadConfig.MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(`Arquivo excede o limite máximo permitido de ${FitUploadConfig.MAX_UPLOAD_SIZE_MB} MB.`);
    }

    // 1. Tamanho do cabeçalho (byte 0): deve ser 12 (legado) ou 14 (padrão)
    const headerSize = buffer.readUInt8(0);
    if (headerSize !== 12 && headerSize !== 14) {
      throw new BadRequestException(`Tamanho de cabeçalho FIT inválido: ${headerSize} bytes (esperado 12 ou 14 bytes).`);
    }

    // 2. Assinatura mágica ASCII nos bytes 8..11 deve ser ".FIT" (0x2E, 0x46, 0x49, 0x54)
    const signature = buffer.subarray(8, 12).toString('ascii');
    if (signature !== '.FIT') {
      throw new BadRequestException('Assinatura binária FIT ausente ou corrompida (esperado ".FIT").');
    }

    const protocolVersion = buffer.readUInt8(1);
    const profileVersion = buffer.readUInt16LE(2);
    const dataSize = buffer.readUInt32LE(4);

    // 3. Validação dos limites do arquivo com base no dataSize declarado
    // Tamanho total esperado = headerSize + dataSize + 2 bytes de CRC do arquivo (se presente)
    const expectedMinSize = headerSize + dataSize;
    if (buffer.length < expectedMinSize) {
      throw new BadRequestException(
        `Arquivo truncado: tamanho recebido (${buffer.length} bytes) é menor que o declarado (${expectedMinSize} bytes).`
      );
    }

    let headerCrc: number | undefined = undefined;
    if (headerSize === 14) {
      headerCrc = buffer.readUInt16LE(12);
    }

    // 4. Validação oficial com @garmin/fitsdk
    try {
      const stream = Stream.fromBuffer(buffer);
      const decoder = new Decoder(stream);

      if (!decoder.isFIT()) {
        throw new BadRequestException('Validador oficial Garmin FIT rejeitou a assinatura do arquivo.');
      }

      if (!decoder.checkIntegrity()) {
        throw new BadRequestException('Arquivo FIT corrompido: falha na verificação de integridade CRC.');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Erro na decodificação de integridade do arquivo FIT: ${err?.message}`);
    }

    return {
      headerSize,
      protocolVersion,
      profileVersion,
      dataSize,
      hasHeaderCrc: headerSize === 14,
      headerCrc,
    };
  }
}
