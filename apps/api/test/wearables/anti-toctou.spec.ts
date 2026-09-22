import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Anti-TOCTOU Concorrente: Leitura e Escrita Protegidas no Storage (G4.2)', () => {
  const testStorageDir = path.resolve(__dirname, '../../test-toctou-storage');
  const testSandboxDir = path.resolve(__dirname, '../../test-toctou-sandbox');

  let storage: PrivateObjectStorageService;

  beforeEach(() => {
    // Garante diretórios limpos
    if (fs.existsSync(testStorageDir)) fs.rmSync(testStorageDir, { recursive: true, force: true });
    if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });

    fs.mkdirSync(testStorageDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(testSandboxDir, { recursive: true, mode: 0o700 });

    const configMock = {
      get: (key: string) => {
        if (key === 'STORAGE_PATH') return testStorageDir;
        return null;
      },
    } as unknown as ConfigService;

    storage = new PrivateObjectStorageService(configMock);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) fs.rmSync(testStorageDir, { recursive: true, force: true });
    if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // 1. ANTI-TOCTOU DE LEITURA (Symlink Attack & Path Traversal)
  // ---------------------------------------------------------------------------
  it('Leitura: deve rejeitar symlink apontando para arquivo sentinela descartável sem vazar conteúdo', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(16).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });

    // Cria symlink dentro da árvore do storage apontando para a sentinela fora da raiz
    const symlinkTargetKey = 'users/123/2026/09/symlink_attack.fit';
    const symlinkFullPath = path.join(testStorageDir, symlinkTargetKey);
    fs.mkdirSync(path.dirname(symlinkFullPath), { recursive: true, mode: 0o700 });
    fs.symlinkSync(sentinelFilePath, symlinkFullPath);

    // Tentativa de leitura via getObject deve falhar imediatamente
    let errorThrown: any = null;
    try {
      await storage.getObject(symlinkTargetKey);
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(BadRequestException);
    expect(errorThrown.message).toContain('Symlinks proibidos');

    // Confirmação estrita: o segredo do sentinela jamais foi lido ou vazado
    const leakCheck = JSON.stringify(errorThrown);
    expect(leakCheck).not.toContain(canarySecret);
  });

  it('Leitura: deve rejeitar tentativas de path traversal relativas (../) e caracteres perigosos', async () => {
    await expect(storage.getObject('../../etc/shadow')).rejects.toThrow(BadRequestException);
    await expect(storage.getObject('users/../../test.fit')).rejects.toThrow(BadRequestException);
    await expect(storage.getObject('users/\0nullbyte.fit')).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // 2. ANTI-TOCTOU DE ESCRITA (No-Clobber Concorrente e Integridade Transacional)
  // ---------------------------------------------------------------------------
  it('Escrita: disputa de 10 gravações simultâneas na mesma chave deve garantir exatamente 1 vencedor (No-Clobber) sem corrupção', async () => {
    const targetKey = 'users/123/2026/09/concurrent_race.fit';
    const numWriters = 10;
    const writersData = Array.from({ length: numWriters }, (_, i) => {
      const payload = Buffer.from(`PAYLOAD_CONCURRENT_WRITER_${i}_${crypto.randomBytes(32).toString('hex')}`);
      const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
      return { index: i, payload, sha256 };
    });

    // Dispara todas as 10 gravações simultaneamente
    const writePromises = writersData.map((w) =>
      storage.putObject(targetKey, w.payload, w.sha256).then(() => ({
        winnerIndex: w.index,
        sha256: w.sha256,
        payload: w.payload,
      }))
    );

    const results = await Promise.allSettled(writePromises);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Exatamente 1 deve ser gravado com sucesso
    expect(fulfilled.length).toBe(1);
    // Exatamente 9 devem ser rejeitados com ConflictException (código HTTP 409)
    expect(rejected.length).toBe(numWriters - 1);

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(ConflictException);
      expect(r.reason.message).toContain('Sobrescrita proibida');
    }

    // Leitura do arquivo final gravado no disco
    const winningWriter = fulfilled[0].value;
    const persistedBuffer = await storage.getObject(targetKey);
    const persistedSha256 = crypto.createHash('sha256').update(persistedBuffer).digest('hex');

    // Validação de integridade factual: os bytes persistidos correspondem 100% ao vencedor único
    expect(persistedSha256).toBe(winningWriter.sha256);
    expect(persistedBuffer.equals(winningWriter.payload)).toBe(true);

    // Validação de que nenhum arquivo temporário de escrita (.tmp_*) ficou abandonado no disco
    const dirEntries = fs.readdirSync(path.dirname(path.join(testStorageDir, targetKey)));
    const tempFiles = dirEntries.filter((f) => f.startsWith('.tmp_'));
    expect(tempFiles.length).toBe(0);
  });

  it('Escrita: deve rejeitar gravação em caminho onde um diretório intermediário é um symlink', async () => {
    // Cria um symlink de diretório
    const realDir = path.join(testSandboxDir, 'real_dir');
    fs.mkdirSync(realDir, { recursive: true });

    const symlinkDir = path.join(testStorageDir, 'symlink_folder');
    fs.symlinkSync(realDir, symlinkDir, process.platform === 'win32' ? 'junction' : 'dir');

    const attackKey = 'symlink_folder/payload.fit';
    const dummyBuffer = Buffer.from('TEST_DATA');

    await expect(storage.putObject(attackKey, dummyBuffer)).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // 3. TESTE CONCORRENTE ANTI-TOCTOU: TROCA DE COMPONENTE INTERMEDIÁRIO
  // ---------------------------------------------------------------------------
  it('Concorrente Leitura: troca de componente intermediário por symlink para sandbox não vaza sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'race_read');
    const genuineDir = path.join(testStorageDir, 'users', 'race_read_genuine');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(genuineDir, { recursive: true, mode: 0o700 });

    const swapTarget = path.join(parentDir, 'swap_node');
    const attackKey = 'users/race_read/swap_node/canary_sentinel_host_file.txt';

    let stopSwapping = false;
    const swapPromise = (async () => {
      let isSymlink = false;
      while (!stopSwapping) {
        try {
          if (fs.existsSync(swapTarget)) {
            fs.rmSync(swapTarget, { recursive: true, force: true });
          }
          if (isSymlink) {
            fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });
          } else {
            fs.symlinkSync(testSandboxDir, swapTarget, process.platform === 'win32' ? 'junction' : 'dir');
          }
          isSymlink = !isSymlink;
        } catch {}
        await new Promise((r) => setImmediate(r));
      }
    })();

    // Dispara 20 requisições simultâneas de leitura enquanto a árvore é permutada
    const readPromises = Array.from({ length: 20 }, async () => {
      try {
        const buffer = await storage.getObject(attackKey);
        // Se de alguma forma retornou dados, jamais pode ser o segredo da sentinela
        expect(buffer.toString()).not.toContain(canarySecret);
      } catch (err: any) {
        expect(err).toBeDefined();
        const errStr = JSON.stringify(err);
        expect(errStr).not.toContain(canarySecret);
      }
    });

    await Promise.all(readPromises);
    stopSwapping = true;
    await swapPromise;

    // Confirmação de integridade inegociável: hash da sentinela inalterado
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
  });

  it('Concorrente Escrita: troca de componente intermediário por symlink para sandbox não sobrescreve sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'race_write');
    const genuineDir = path.join(testStorageDir, 'users', 'race_write_genuine');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(genuineDir, { recursive: true, mode: 0o700 });

    const swapTarget = path.join(parentDir, 'swap_node');
    const attackKey = 'users/race_write/swap_node/canary_sentinel_host_file.txt';
    const maliciousBuffer = Buffer.from('MALICIOUS_OVERWRITE_PAYLOAD_CORRUPT');

    let stopSwapping = false;
    const swapPromise = (async () => {
      let isSymlink = false;
      while (!stopSwapping) {
        try {
          if (fs.existsSync(swapTarget)) {
            fs.rmSync(swapTarget, { recursive: true, force: true });
          }
          if (isSymlink) {
            fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });
          } else {
            fs.symlinkSync(testSandboxDir, swapTarget, process.platform === 'win32' ? 'junction' : 'dir');
          }
          isSymlink = !isSymlink;
        } catch {}
        await new Promise((r) => setImmediate(r));
      }
    })();

    // Dispara 20 requisições simultâneas de escrita enquanto a árvore é permutada
    const writePromises = Array.from({ length: 20 }, async () => {
      try {
        await storage.putObject(attackKey, maliciousBuffer);
      } catch (err: any) {
        expect(err).toBeDefined();
      }
    });

    await Promise.all(writePromises);
    stopSwapping = true;
    await swapPromise;

    // Confirmação de integridade inegociável: a sentinela no sandbox NUNCA foi sobrescrita
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
    const content = fs.readFileSync(sentinelFilePath, 'utf8');
    expect(content).toBe(canarySecret);
  });
});
