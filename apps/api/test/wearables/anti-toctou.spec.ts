import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrivateObjectStorageService } from '../../src/modules/wearables/services/storage.service';
import { LinuxStorageHelper } from '../../src/modules/wearables/services/storage-linux-helper';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Anti-TOCTOU Concorrente: Leitura, Escrita e Exclusão Protegidas por Descritor (G4.2 V5)', () => {
  const testStorageDir = path.resolve(__dirname, '../../test-toctou-storage');
  const testSandboxDir = path.resolve(__dirname, '../../test-toctou-sandbox');

  let storage: PrivateObjectStorageService;

  beforeEach(() => {
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
  // 1. PROVA ESTREITA: CRIAÇÃO DE ARQUIVO EXTERNO QUE AINDA NÃO EXISTE
  // ---------------------------------------------------------------------------
  it('Escrita Anti-TOCTOU: tentativa de criar arquivo externo que ainda não existe deve falhar sem criar qualquer arquivo fora da raiz', async () => {
    const nonExistentExternalFile = path.join(testSandboxDir, 'outside_target_that_does_not_exist.fit');
    expect(fs.existsSync(nonExistentExternalFile)).toBe(false);

    // Cria symlink dentro do storage apontando para arquivo externo NÃO EXISTENTE
    const symlinkTargetKey = 'users/123/2026/09/escape_attack.fit';
    const symlinkFullPath = path.join(testStorageDir, symlinkTargetKey);
    fs.mkdirSync(path.dirname(symlinkFullPath), { recursive: true, mode: 0o700 });
    fs.symlinkSync(nonExistentExternalFile, symlinkFullPath);

    const payload = Buffer.from('PAYLOAD_ATTEMPTING_TO_ESCAPE_STORAGE_ROOT');

    // Tentativa de escrita deve falhar
    let errorThrown: any = null;
    try {
      await storage.putObject(symlinkTargetKey, payload);
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(BadRequestException);
    expect(errorThrown.message).toContain('Symlinks proibidos');

    // Comprovação estrita: NENHUM arquivo foi criado fora da raiz autorizada
    expect(fs.existsSync(nonExistentExternalFile)).toBe(false);

    // Comprovação estrita: Nenhum arquivo temporário permaneceu no diretório pai
    const parentEntries = fs.readdirSync(path.dirname(symlinkFullPath));
    const tmpRemaining = parentEntries.filter((f) => f.startsWith('.tmp'));
    expect(tmpRemaining.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 2. PROVA COM SENTINELA EXISTENTE: LEITURA BLOQUEADA COM PRESERVAÇÃO DE HASH
  // ---------------------------------------------------------------------------
  it('Leitura Anti-TOCTOU: tentativa de leitura através de symlink para sentinela externa deve ser rejeitada sem vazar dados', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(16).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const symlinkTargetKey = 'users/123/2026/09/symlink_read_attack.fit';
    const symlinkFullPath = path.join(testStorageDir, symlinkTargetKey);
    fs.mkdirSync(path.dirname(symlinkFullPath), { recursive: true, mode: 0o700 });
    fs.symlinkSync(sentinelFilePath, symlinkFullPath);

    let errorThrown: any = null;
    try {
      await storage.getObject(symlinkTargetKey);
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeInstanceOf(BadRequestException);
    expect(errorThrown.message).toContain('Symlinks proibidos');

    // Confirmação de que segredo da sentinela não vazou no erro
    const leakCheck = JSON.stringify(errorThrown);
    expect(leakCheck).not.toContain(canarySecret);

    // Hash da sentinela inalterado
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
  });

  it('Leitura: deve rejeitar tentativas de path traversal relativas (../) e caracteres perigosos', async () => {
    await expect(storage.getObject('../../etc/shadow')).rejects.toThrow(BadRequestException);
    await expect(storage.getObject('users/../../test.fit')).rejects.toThrow(BadRequestException);
    await expect(storage.getObject('users/\0nullbyte.fit')).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // 3. CONCORRÊNCIA E NO-CLOBBER
  // ---------------------------------------------------------------------------
  it('Escrita Concorrente: disputa de 10 gravações simultâneas na mesma chave deve garantir exatamente 1 vencedor (No-Clobber) sem corrupção', async () => {
    const targetKey = 'users/123/2026/09/concurrent_race.fit';
    const numWriters = 10;
    const writersData = Array.from({ length: numWriters }, (_, i) => {
      const payload = Buffer.from(`PAYLOAD_CONCURRENT_WRITER_${i}_${crypto.randomBytes(32).toString('hex')}`);
      const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
      return { index: i, payload, sha256 };
    });

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

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(numWriters - 1);

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(ConflictException);
      expect(r.reason.message).toContain('Sobrescrita proibida');
    }

    const winningWriter = fulfilled[0].value;
    const persistedBuffer = await storage.getObject(targetKey);
    const persistedSha256 = crypto.createHash('sha256').update(persistedBuffer).digest('hex');

    expect(persistedSha256).toBe(winningWriter.sha256);
    expect(persistedBuffer.equals(winningWriter.payload)).toBe(true);

    const tmpDir = path.join(testStorageDir, '.tmp_uploads');
    if (fs.existsSync(tmpDir)) {
      const tempFiles = fs.readdirSync(tmpDir).filter((f) => f.startsWith('.tmp_'));
      expect(tempFiles.length).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. TESTE COM BARREIRA DETERMINÍSTICA (SWAP PÓS-VALIDAÇÃO / PRÉ-PUBLISH)
  // ---------------------------------------------------------------------------
  it('Concorrente Escrita (Swap pós-validação inicial com barreira): swap apontando para arquivo externo não-existente deve abortar sem criar fora da raiz', async () => {
    const parentDir = path.join(testStorageDir, 'users', 'barrier_write_nonexist');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const externalNewFile = path.join(testSandboxDir, 'should_never_appear_outside.fit');
    expect(fs.existsSync(externalNewFile)).toBe(false);

    const attackKey = 'users/barrier_write_nonexist/swap_node/should_never_appear_outside.fit';
    const maliciousBuffer = Buffer.from('MALICIOUS_ESCAPE_PAYLOAD');

    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-publish') {
        barrierTriggered = true;
        // Swap do diretório intermediário para o diretório externo
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

    // Comprovação estrita: NENHUM arquivo externo foi criado
    expect(fs.existsSync(externalNewFile)).toBe(false);

    // Comprovação estrita: temporários removidos
    const tmpDir = path.join(testStorageDir, '.tmp_uploads');
    if (fs.existsSync(tmpDir)) {
      const tmpEntries = fs.readdirSync(tmpDir);
      expect(tmpEntries.length).toBe(0);
    }
  });

  it('Concorrente Escrita (Swap imediatamente antes da publicação): swap apontando para sentinela existente bloqueia sobrescrita e preserva hash', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'barrier_write_sentinel');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const attackKey = 'users/barrier_write_sentinel/swap_node/canary_sentinel_host_file.txt';
    const maliciousBuffer = Buffer.from('MALICIOUS_OVERWRITE_PAYLOAD_CORRUPT');

    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-publish') {
        barrierTriggered = true;
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

    // Sentinela jamais alterada
    const content = fs.readFileSync(sentinelFilePath, 'utf8');
    expect(content).toBe(canarySecret);
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);

    // Temporários removidos
    const tmpDir = path.join(testStorageDir, '.tmp_uploads');
    if (fs.existsSync(tmpDir)) {
      const tmpEntries = fs.readdirSync(tmpDir);
      expect(tmpEntries.length).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. TESTE COM BARREIRA DETERMINÍSTICA: LEITURA E EXCLUSÃO
  // ---------------------------------------------------------------------------
  it('Concorrente Leitura (Swap pós-validação com barreira): swap durante pre-read bloqueia leitura e preserva hash da sentinela', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

    const parentDir = path.join(testStorageDir, 'users', 'barrier_read');
    const swapTarget = path.join(parentDir, 'swap_node');
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(swapTarget, { recursive: true, mode: 0o700 });

    const attackKey = 'users/barrier_read/swap_node/canary_sentinel_host_file.txt';
    const genuineFile = path.join(swapTarget, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(genuineFile, 'GENUINE_INITIAL_CONTENT', { mode: 0o600 });

    let barrierTriggered = false;
    storage.setTestBarrier(async (point) => {
      if (point === 'pre-read') {
        barrierTriggered = true;
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

    const errDump = JSON.stringify(errorThrown);
    expect(errDump).not.toContain(canarySecret);

    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
  });

  it('Concorrente Exclusão (Swap pós-validação com barreira): swap durante pre-delete bloqueia remoção da sentinela e preserva hash', async () => {
    const canarySecret = `CANARY_HOST_SECRET_TOKEN_${crypto.randomBytes(32).toString('hex')}`;
    const sentinelFilePath = path.join(testSandboxDir, 'canary_sentinel_host_file.txt');
    fs.writeFileSync(sentinelFilePath, canarySecret, { mode: 0o600 });
    const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');

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

    expect(fs.existsSync(sentinelFilePath)).toBe(true);
    const content = fs.readFileSync(sentinelFilePath, 'utf8');
    expect(content).toBe(canarySecret);
    const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelFilePath)).digest('hex');
    expect(sentinelHashAfter).toBe(sentinelHashBefore);
  });

  // ---------------------------------------------------------------------------
  // 6. VALIDAÇÃO DE CONTRATO DO HELPER LINUX (OPENAT2 / DESCRITORES)
  // ---------------------------------------------------------------------------
  it('Helper Linux de Descritores: verifica contrato de operações relativas ao descritor de diretório', () => {
    const isLinux = process.platform === 'linux';
    const helperAvailable = LinuxStorageHelper.isLinuxDescriptorHelperAvailable();

    if (isLinux) {
      expect(helperAvailable).toBe(true);
      const bin = LinuxStorageHelper.findHelperBinary();
      expect(bin).not.toBeNull();
      expect(fs.existsSync(bin!)).toBe(true);
    } else {
      // Ambiente de desenvolvimento Windows: helper Linux só executa em target POSIX
      expect(helperAvailable).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 7. FAIL-CLOSED NO STARTUP EM STAGING E PRODUÇÃO
  // ---------------------------------------------------------------------------
  it('Fail-Closed: inicialização em staging ou produção sem helper funcional deve abortar com erro fechado', () => {
    const configMock = {
      get: (key: string) => {
        if (key === 'STORAGE_PATH') return testStorageDir;
        return null;
      },
    } as unknown as ConfigService;

    const originalNodeEnv = process.env.NODE_ENV;
    const originalAppEnv = process.env.APP_ENV;

    try {
      // Simula ambiente staging
      process.env.NODE_ENV = 'staging';
      process.env.APP_ENV = 'staging';

      const s = new PrivateObjectStorageService(configMock);
      if (process.platform !== 'linux') {
        expect(() => s.onModuleInit()).toThrow(/\[FAIL_CLOSED\]/);
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.APP_ENV = originalAppEnv;
    }
  });
});
