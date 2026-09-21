import { describe, it, expect, afterEach } from 'vitest';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

describe('PrivateObjectStorageService', () => {
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

  it('deve salvar e ler um objeto com exatidão de bytes', async () => {
    const key = 'user1/2026/09/test-file.fit';
    const originalBuffer = Buffer.from('TEST_FIT_PAYLOAD_BUFFER_123');

    const ref = await storage.putObject(key, originalBuffer);
    expect(ref.fileSizeBytes).toBe(originalBuffer.length);
    expect(ref.storageDriver).toBe('LOCAL');

    const retrieved = await storage.getObject(key);
    expect(retrieved.equals(originalBuffer)).toBe(true);
  });

  it('deve excluir um objeto com sucesso', async () => {
    const key = 'user1/2026/09/delete-me.fit';
    await storage.putObject(key, Buffer.from('DELETE_ME'));

    await storage.deleteObject(key);

    await expect(storage.getObject(key)).rejects.toThrow();
  });

  it('deve identificar arquivos órfãos não presentes no conjunto de chaves conhecidas do banco', async () => {
    await storage.putObject('user1/known.fit', Buffer.from('KNOWN'));
    await storage.putObject('user1/orphan.fit', Buffer.from('ORPHAN'));

    const knownKeys = new Set(['user1/known.fit']);
    const orphans = await storage.reconcileOrphans(knownKeys);

    expect(orphans).toContain('user1/orphan.fit');
    expect(orphans).not.toContain('user1/known.fit');
  });
});
