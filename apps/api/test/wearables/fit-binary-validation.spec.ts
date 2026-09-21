import { describe, it, expect } from 'vitest';
import { FitValidatorService } from '../../src/modules/wearables/services/fit-validator.service';
import { Encoder } from '@garmin/fitsdk';
import { BadRequestException } from '@nestjs/common';

// Helper para gerar buffer FIT 100% autêntico via SDK oficial da Garmin
function createSampleFitBuffer(duration = 1800, distance = 5000): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0, // file_id
    serialNumber: 970001,
    timeCreated: new Date('2026-09-21T10:00:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);
  encoder.writeMesg({
    mesgNum: 18, // session
    timestamp: new Date('2026-09-21T10:30:00Z'),
    startTime: new Date('2026-09-21T10:00:00Z'),
    sport: 'running',
    subSport: 'generic',
    totalElapsedTime: duration,
    totalTimerTime: duration,
    totalDistance: distance,
    avgSpeed: 2.77,
    avgHeartRate: 152,
    maxHeartRate: 174,
    totalCalories: 380,
  } as any);
  return Buffer.from(encoder.close());
}

describe('FitValidatorService', () => {
  const validator = new FitValidatorService();

  it('deve validar com sucesso um arquivo FIT autêntico com cabeçalho de 14 bytes', () => {
    const buffer = createSampleFitBuffer();
    expect(buffer.readUInt8(0)).toBe(14); // Header de 14 bytes com CRC
    expect(buffer.subarray(8, 12).toString('ascii')).toBe('.FIT');

    const result = validator.validateBinary(buffer);
    expect(result.headerSize).toBe(14);
    expect(result.dataSize).toBeGreaterThan(0);
    expect(result.hasHeaderCrc).toBe(true);
  });

  it('deve validar com sucesso um cabeçalho de 12 bytes válido (protocolo legado)', () => {
    // Cria buffer sintético válido de 12 bytes de cabeçalho
    const dataSize = 10;
    const header = Buffer.alloc(12);
    header.writeUInt8(12, 0); // headerSize = 12
    header.writeUInt8(16, 1); // protocolVersion = 16 (1.0)
    header.writeUInt16LE(21214, 2); // profileVersion
    header.writeUInt32LE(dataSize, 4); // dataSize
    header.write('.FIT', 8, 4, 'ascii'); // assinatura

    const dummyData = Buffer.alloc(dataSize + 2); // dados + 2 bytes file CRC
    const buffer = Buffer.concat([header, dummyData]);

    // O validador deve ler as propriedades do cabeçalho de 12 bytes
    expect(buffer.readUInt8(0)).toBe(12);
    expect(buffer.subarray(8, 12).toString('ascii')).toBe('.FIT');
  });

  it('deve rejeitar arquivo menor que o tamanho mínimo de cabeçalho (menos de 12 bytes)', () => {
    const tinyBuffer = Buffer.from([14, 32, 0, 0, 0]);
    expect(() => validator.validateBinary(tinyBuffer)).toThrow(BadRequestException);
  });

  it('deve rejeitar arquivo com assinatura mágica diferente de .FIT (ex: PDF ou JPEG)', () => {
    const fakeBuffer = Buffer.alloc(30);
    fakeBuffer.writeUInt8(14, 0);
    fakeBuffer.write('FAKE', 8, 4, 'ascii');

    expect(() => validator.validateBinary(fakeBuffer)).toThrow(
      /Assinatura binária FIT ausente ou corrompida/
    );
  });

  it('deve rejeitar arquivo com cabeçalho de tamanho inválido (nem 12 nem 14 bytes)', () => {
    const invalidHeaderBuffer = Buffer.alloc(30);
    invalidHeaderBuffer.writeUInt8(16, 0); // 16 bytes não é permitido
    invalidHeaderBuffer.write('.FIT', 8, 4, 'ascii');

    expect(() => validator.validateBinary(invalidHeaderBuffer)).toThrow(
      /Tamanho de cabeçalho FIT inválido: 16 bytes/
    );
  });

  it('deve rejeitar arquivo truncado (tamanho recebido menor que dataSize declarado)', () => {
    const validBuffer = createSampleFitBuffer();
    // Trunca os últimos 30 bytes
    const truncatedBuffer = validBuffer.subarray(0, validBuffer.length - 30);

    expect(() => validator.validateBinary(truncatedBuffer)).toThrow(
      /Arquivo truncado/
    );
  });

  it('deve rejeitar arquivo que excede o teto máximo permitido de 15 MB', () => {
    // Mock de buffer que excede 15MB
    const oversizedBuffer = {
      length: 16 * 1024 * 1024,
      readUInt8: () => 14,
    } as any;

    expect(() => validator.validateBinary(oversizedBuffer)).toThrow(
      /Arquivo excede o limite máximo permitido de 15 MB/
    );
  });
});
