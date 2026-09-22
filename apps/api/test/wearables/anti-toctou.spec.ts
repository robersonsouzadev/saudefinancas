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
  // 3. TESTE CONCORRENTE ANTI-TOCTOU DETERMINÍSTICO (SINCRONIZADO COM BARREIRAS)
  // ---------------------------------------------------------------------------
  it('Concorrente Leitura (Barreira Determinística): troca de componente intermediário durante pre-read bloqueia vazamento de sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'barrier_read');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const attackKey = 'users/barrier_read/swap_node/canary_sentinel_host_file.txt';

    // Cria um arquivo genuíno inicialmente no caminho esperado
    const genuineFile = path.join(swapTarget, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(genuineFile, 'GENUINE_INITIAL_CONTENT', { mode: 0o600 });

    // Configura a barreira determinística: troca o diretório intermediário EXATAMENTE entre validação e leitura
    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-read') {
        barrierTriggered = true;
        // Força a troca do diretório intermediário por um symlink para o sandbox externo
        fs.rmSync(swapTarget, { recursive: true, force: true });
        fs.symlinkSync(testSandboxDir, swapTarget, process.platform === 'win32' ? 'junction' : 'dir');
      }
    });

    let errorThrown: any = null;
    try {
      await storage.getObject(attackKey);
    } catch (err) {
      errorThrown = err;
    }

    expect(barrierTriggered).toBe(true);
    expect(errorThrown).toBeInstanceOf(BadRequestException);
    expect(errorThrown.message).toContain('Symlinks proibidos');

    // Comprovação estrita: a sentinela jamais foi lida ou vazada
    const errDump = JSON.stringify(errorThrown);
    expect(errDump).not.toContain(canarySecret);

    // Hash da sentinela rigorosamente idêntico
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
  });

  it('Concorrente Escrita (Barreira Determinística): troca de componente intermediário durante pre-publish bloqueia sobrescrita da sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'barrier_write');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const attackKey = 'users/barrier_write/swap_node/canary_sentinel_host_file.txt';
    const maliciousBuffer = Buffer.from('MALICIOUS_OVERWRITE_PAYLOAD_CORRUPT');

    // Configura a barreira determinística: troca o diretório intermediário EXATAMENTE durante a fase de escrita temporária
    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-publish') {
        barrierTriggered = true;
        // Força a troca do diretório intermediário por um symlink para o sandbox externo
        fs.rmSync(swapTarget, { recursive: true, force: true });
        fs.symlinkSync(testSandboxDir, swapTarget, process.platform === 'win32' ? 'junction' : 'dir');
      }
    });

    let errorThrown: any = null;
    try {
      await storage.putObject(attackKey, maliciousBuffer);
    } catch (err) {
      errorThrown = err;
    }

    expect(barrierTriggered).toBe(true);
    expect(errorThrown).toBeInstanceOf(BadRequestException);
    expect(errorThrown.message).toContain('Symlinks proibidos');

    // Comprovação estrita 1: Sentinela externa NUNCA foi sobrescrita
    const content = fs.readFileSync(sentinelFilePath, 'utf8');
    expect(content).toBe(canarySecret);
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);

    // Comprovação estrita 2: Nenhum arquivo residual ou temporário permaneceu em .tmp_uploads
    const tmpDir = path.join(testStorageDir, '.tmp_uploads');
    if (fs.existsSync(tmpDir)) {
      const tmpEntries = fs.readdirSync(tmpDir);
      expect(tmpEntries.length).toBe(0);
    }
  });

  it('Concorrente Exclusão (Barreira Determinística): troca de componente intermediário durante pre-delete bloqueia remoção da sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });

    const parentDir = path.join(testStorageDir, 'users', 'barrier_delete');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const genuineFile = path.join(swapTarget, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(genuineFile, 'GENUINE_DELETE_TARGET', { mode: 0o600 });

    const attackKey = 'users/barrier_delete/swap_node/canary_sentinel_host_file.txt';

    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-delete') {
        barrierTriggered = true;
        fs.rmSync(swapTarget, { recursive: true, force: true });
        fs.symlinkSync(testSandboxDir, swapTarget, process.platform === 'win32' ? 'junction' : 'dir');
      }
    });

    let errorThrown: any = null;
    try {
      await storage.deleteObject(attackKey);
    } catch (err) {
      errorThrown = err;
    }

    expect(barrierTriggered).toBe(true);
    expect(errorThrown).toBeInstanceOf(BadRequestException);

    // Sentinela externa NUNCA foi excluída
    expect(fs.existsSync(sentinelFilePath)).toBe(true);
    const content = fs.readFileSync(sentinelFilePath, 'utf8');
    expect(content).toBe(canarySecret);
  });
});
