import { describe, it, expect, afterEach } from 'vitest';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('PrivateObjectStorageService (LOCAL_SECURE Hardening)', () => {
  const testStoragePath = path.resolve(__dirname, '../../test-storage-tmp');

  const configMock = {
    get: (key: string) => {
      if (key === 'STORAGE_PATH') return testStoragePath;
      return null;
    },
  } as unknown as ConfigService;

  const storage = new PrivateObjectStorageService(configMock);

  afterEach(() => {
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  it('deve salvar e ler um objeto com exatidão de bytes e driver LOCAL_SECURE', async () => {
    const key = 'user1/2026/09/test-file.fit';
    const originalBuffer = Buffer.from('TEST_FIT_PAYLOAD_BUFFER_123');
    const sha256 = crypto.createHash('sha256').update(originalBuffer).digest('hex');

    const ref = await storage.putObject(key, originalBuffer, sha256);
    expect(ref.fileSizeBytes).toBe(originalBuffer.length);
    expect(ref.storageDriver).toBe('LOCAL_SECURE');

    const retrieved = await storage.getObject(key, sha256);
    expect(retrieved.equals(originalBuffer)).toBe(true);
  });

  it('deve falhar atomicamente na escrita concorrente para a mesma chave (NO-CLOBBER) sem sobrescrever', async () => {
    const key = 'user1/2026/09/race-file.fit';
    const payloadA = Buffer.from('FIRST_WINNING_PAYLOAD');
    const payloadB = Buffer.from('SECOND_LOSING_PAYLOAD');

    // Executa putObject concorrente para a mesma chave
    const results = await Promise.allSettled([
      storage.putObject(key, payloadA),
      storage.putObject(key, payloadB),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exatamente uma operação deve vencer, a outra deve ser rejeitada com ConflictException
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    // O arquivo gravado no destino não deve ter sido corrompido nem sobrescrito
    const finalContent = await storage.getObject(key);
    expect(finalContent.equals(payloadA) || finalContent.equals(payloadB)).toBe(true);
  });

  it('deve rejeitar tentativas de path traversal e bytes nulos', async () => {
    const buffer = Buffer.from('ATTACK_PAYLOAD');

    await expect(storage.putObject('../../etc/passwd', buffer)).rejects.toThrow(BadRequestException);
    await expect(storage.putObject('user1/../../../shadow', buffer)).rejects.toThrow(BadRequestException);
    await expect(storage.putObject('user1/test\0file.fit', buffer)).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar leitura com SHA-256 divergente (detecção de corrupção)', async () => {
    const key = 'user1/2026/09/integrity-check.fit';
    const originalBuffer = Buffer.from('CORRECT_PAYLOAD');
    await storage.putObject(key, originalBuffer);

    const wrongSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
    await expect(storage.getObject(key, wrongSha256)).rejects.toThrow(BadRequestException);
  });

  it('deve excluir um objeto com sucesso', async () => {
    const key = 'user1/2026/09/delete-me.fit';
    await storage.putObject(key, Buffer.from('DELETE_ME'));

    await storage.deleteObject(key);

    await expect(storage.getObject(key)).rejects.toThrow();
  });

  it('deve identificar arquivos órfãos ignorando arquivos temporários .tmp_', async () => {
    await storage.putObject('user1/known.fit', Buffer.from('KNOWN'));
    await storage.putObject('user1/orphan.fit', Buffer.from('ORPHAN'));

    // Cria arquivo temporário solto simulando escrita em andamento
    const fullDir = path.dirname(path.join(testStoragePath, 'user1/known.fit'));
    fs.writeFileSync(path.join(fullDir, '.tmp_in_progress'), 'IN_PROGRESS');

    const knownKeys = new Set(['user1/known.fit']);
    const orphans = await storage.reconcileOrphans(knownKeys);

    expect(orphans).toContain('user1/orphan.fit');
    expect(orphans).not.toContain('user1/known.fit');
    expect(orphans).not.toContain('user1/.tmp_in_progress');
  });
});
