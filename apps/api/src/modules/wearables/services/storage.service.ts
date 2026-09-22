import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IPrivateObjectStorage, StoredObjectRef } from '../interfaces/storage.interface';
import { LinuxStorageHelper, LinuxStorageHelperError } from './storage-linux-helper';

@Injectable()
export class PrivateObjectStorageService implements IPrivateObjectStorage, OnModuleInit {
  private readonly logger = new Logger(PrivateObjectStorageService.name);
  private readonly basePath: string;
  private testBarrier?: (point: string, meta?: any) => Promise<void> | void;

  constructor(private readonly configService: ConfigService) {
    const customPath = this.configService.get<string>('STORAGE_PATH');
    const rawPath = customPath
      ? path.resolve(customPath)
      : path.resolve(process.cwd(), 'storage', 'private', 'wearables');

    if (!fs.existsSync(rawPath)) {
      fs.mkdirSync(rawPath, { recursive: true, mode: 0o700 });
    }

    try {
      this.basePath = fs.realpathSync(rawPath);
    } catch {
      this.basePath = rawPath;
    }
  }

  onModuleInit(): void {
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    const appEnv = (process.env.APP_ENV || '').toLowerCase();
    const isStagingOrProd =
      nodeEnv === 'staging' || nodeEnv === 'production' ||
      appEnv === 'staging' || appEnv === 'production';

    const isHelperAvailable = LinuxStorageHelper.isLinuxDescriptorHelperAvailable();

    if (isStagingOrProd) {
      if (!isHelperAvailable) {
        const probe = LinuxStorageHelper.runProbe();
        const reason = probe.rawStderr || `Exit Code ${probe.exitCode}`;
        this.logger.error(
          `[FAIL_CLOSED] O storage LOCAL_SECURE requer o helper Linux baseado em descritores (openat2, renameat2) funcional. Inicialização abortada em ambiente ${nodeEnv || appEnv}. Causa: ${reason}`,
        );
        throw new Error(
          `[FAIL_CLOSED] Storage seguro requer contrato de descritores Linux (openat2 + renameat2). Ambiente ${nodeEnv || appEnv} não suporta fallback.`,
        );
      }
      this.logger.log('[STORAGE_INIT] Storage seguro inicializado com helper Linux baseado em descritores.');
    } else {
      // Ambiente local / testes
      if (!isHelperAvailable) {
        const allowFallback =
          process.env.ALLOW_INSECURE_STORAGE_FALLBACK === 'true' ||
          process.env.ALLOW_TEST_DESCRIPTOR_EMULATION === 'true' ||
          nodeEnv === 'test' ||
          nodeEnv === 'development' ||
          !nodeEnv;

        if (!allowFallback) {
          throw new Error(
            `[FAIL_CLOSED] Helper Linux não disponível e fallback não autorizado explicitamente (defina ALLOW_INSECURE_STORAGE_FALLBACK=true para desenvolvimento).`,
          );
        }
        this.logger.warn(
          '[STORAGE_INIT] Operando em modo de emulação de descritores para testes locais. Não autorizado para staging/produção.',
        );
      }
    }
  }

  getBasePath(): string {
    return this.basePath;
  }

  setTestBarrier(barrier?: (point: string, meta?: any) => Promise<void> | void): void {
    this.testBarrier = barrier;
  }

  private validateAndResolveKey(key: string): { fullPath: string; dirPath: string; sanitizedKey: string } {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Chave de storage inválida.');
    }

    // 1. Rejeição de bytes nulos e caracteres proibidos
    if (key.includes('\0')) {
      throw new BadRequestException('Chave contém bytes nulos inválidos.');
    }

    // 2. Rejeição explícita de caminhos absolutos forasteiros e ..
    if (path.isAbsolute(key) || key.includes('..')) {
      throw new BadRequestException('Chave contém sequências de navegação ou caminho absoluto proibido.');
    }

    const sanitizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(this.basePath, sanitizedKey);

    // 3. Validação de contenção estrita dentro de basePath
    if (!fullPath.startsWith(this.basePath + path.sep)) {
      throw new BadRequestException('Tentativa de path traversal detectada: caminho fora da raiz autorizada.');
    }

    const dirPath = path.dirname(fullPath);
    return { fullPath, dirPath, sanitizedKey };
  }

  private validateNoSymlinksInPath(targetPath: string): void {
    let current = path.resolve(targetPath);
    const root = this.basePath;

    while (current.length >= root.length) {
      const stat = fs.lstatSync(current, { throwIfNoEntry: false });
      if (stat) {
        if (stat.isSymbolicLink()) {
          throw new BadRequestException(`Symlinks proibidos no storage: symlink detectado na árvore de diretórios (${current})`);
        }
        try {
          const real = fs.realpathSync(current);
          if (!real.startsWith(root + path.sep) && real !== root) {
            throw new BadRequestException(`Symlinks proibidos no storage: caminho canônico fora da raiz autorizada (${real})`);
          }
        } catch (err) {
          if (err instanceof BadRequestException) {
            throw err;
          }
          throw new BadRequestException(`Symlinks proibidos no storage: falha ao resolver caminho canônico intermediário (${current})`);
        }
      }
      if (current === root) break;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  /**
   * Publicação rigorosamente atômica de objeto no storage.
   * Cria temporário no mesmo diretório pai seguro, escreve todo o payload,
   * executa fsync, fchmod 0600 e publica com renameat2(RENAME_NOREPLACE) ou renameSync.
   * Nenhum leitor pode observar arquivo vazio ou parcial.
   */
  async putObject(key: string, buffer: Buffer, expectedSha256?: string): Promise<StoredObjectRef> {
    const { fullPath, dirPath, sanitizedKey } = this.validateAndResolveKey(key);

    try {
      this.validateNoSymlinksInPath(dirPath);

      // Verificação preliminar do destino com lstat seguro
      const preStat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
      if (preStat) {
        if (preStat.isSymbolicLink()) {
          throw new BadRequestException(`Symlinks proibidos no storage: destino é um symlink (${fullPath})`);
        }
        throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
      }

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
      }

      // Validação de integridade do payload antes da gravação
      const calculatedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      if (expectedSha256 && calculatedSha256 !== expectedSha256) {
        throw new BadRequestException('SHA-256 do buffer não corresponde ao hash esperado antes da gravação.');
      }

      // Ponto de sincronização determinístico pré-escrita para testes
      if (this.testBarrier) {
        await this.testBarrier('pre-write', { key: sanitizedKey, dirPath, fullPath });
      }

      // 1. VIA HELPER LINUX BASEADO EM DESCRITORES (openat2, RESOLVE_BENEATH, renameat2 RENAME_NOREPLACE)
      if (LinuxStorageHelper.isLinuxDescriptorHelperAvailable()) {
        const targetRel = sanitizedKey.replace(/\\/g, '/');
        try {
          if (this.testBarrier) {
            await this.testBarrier('pre-publish', { key: sanitizedKey, dirPath, fullPath });
          }
          LinuxStorageHelper.putAtomic(this.basePath, targetRel, buffer);
          return {
            storageKey: targetRel,
            storageDriver: 'LOCAL_SECURE',
            fileSizeBytes: buffer.length,
          };
        } catch (err: any) {
          if (err instanceof LinuxStorageHelperError) {
            if (err.exitCode === 2) {
              throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
            }
            if (err.exitCode === 3) {
              throw new BadRequestException(`Symlinks proibidos no storage: ${err.message}`);
            }
            if (err.exitCode === 4) {
              throw new ServiceUnavailableException(`Recurso openat2 indisponível: ${err.message}`);
            }
          }
          throw new BadRequestException(`Falha ao gravar arquivo via descritor seguro: ${err.message}`);
        }
      }

      // 2. MODO DE EMULAÇÃO DE DESCRITORES PARA AMBIENTE LOCAL / TESTES
      // O temporário DEVE ser criado dentro do mesmo diretório pai seguro do destino!
      const tempFileName = `.tmp_${crypto.randomBytes(16).toString('hex')}`;
      const tempPath = path.join(dirPath, tempFileName);

      const openFlags =
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_WRONLY |
        (fs.constants.O_NOFOLLOW || 0);

      // Gravação em arquivo temporário com permissões estritas 0600
      let fileHandle: fs.promises.FileHandle | null = null;
      try {
        fileHandle = await fs.promises.open(tempPath, openFlags, 0o600);
        await fileHandle.writeFile(buffer);
        await fileHandle.sync(); // fsync do arquivo temporário
      } finally {
        if (fileHandle) {
          await fileHandle.close().catch(() => {});
        }
      }

      // Ponto de sincronização determinístico para testes (Anti-TOCTOU barrier)
      if (this.testBarrier) {
        await this.testBarrier('pre-publish', { key: sanitizedKey, dirPath, fullPath, tempPath });
      }

      const dirOpenFlags = fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY || 0) | (fs.constants.O_NOFOLLOW || 0);
      let dirHandle: fs.promises.FileHandle | null = null;

      try {
        dirHandle = await fs.promises.open(dirPath, dirOpenFlags);

        // Re-validação anti-TOCTOU mantendo o descritor de diretório aberto
        this.validateNoSymlinksInPath(dirPath);

        const postBarrierStat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
        if (postBarrierStat) {
          if (postBarrierStat.isSymbolicLink()) {
            throw new BadRequestException('Symlinks proibidos no storage: symlink detectado no caminho alvo.');
          }
          throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
        }

        // Publicação atômica
        await fs.promises.rename(tempPath, fullPath);

        // fsync do diretório pai para durabilidade dos metadados com descritor aberto
        await dirHandle.sync().catch(() => {});
      } catch (publishErr: any) {
        // Remover apenas o arquivo temporário pertencente a esta operação
        await fs.promises.unlink(tempPath).catch(() => {});
        if (publishErr.code === 'EEXIST' || publishErr instanceof ConflictException) {
          throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
        }
        throw publishErr;
      } finally {
        if (dirHandle) {
          await dirHandle.close().catch(() => {});
        }
      }

      return {
        storageKey: sanitizedKey.replace(/\\/g, '/'),
        storageDriver: 'LOCAL_SECURE',
        fileSizeBytes: buffer.length,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ConflictException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      if (err.code === 'EACCES' || err.code === 'EROFS' || err.code === 'ENOSPC') {
        this.logger.error(`Falha crítica de volume no storage: ${err.code} - ${err.message}`);
        throw new ServiceUnavailableException(`Storage LOCAL_SECURE indisponível ou somente leitura: ${err.code}`);
      }
      throw err;
    }
  }

  async getObject(key: string, expectedSha256?: string): Promise<Buffer> {
    const { fullPath, dirPath, sanitizedKey } = this.validateAndResolveKey(key);

    try {
      // Ponto de sincronização determinístico para testes de leitura
      if (this.testBarrier) {
        await this.testBarrier('pre-read', { key: sanitizedKey, dirPath, fullPath });
      }

      // 1. VIA HELPER LINUX BASEADO EM DESCRITORES
      if (LinuxStorageHelper.isLinuxDescriptorHelperAvailable()) {
        const targetRel = sanitizedKey.replace(/\\/g, '/');
        try {
          const buffer = LinuxStorageHelper.readSafe(this.basePath, targetRel);
          if (expectedSha256) {
            const readSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
            if (readSha256 !== expectedSha256) {
              throw new BadRequestException(`Violação de integridade no storage: SHA-256 lido difere do esperado.`);
            }
          }
          return buffer;
        } catch (err: any) {
          if (err instanceof LinuxStorageHelperError) {
            if (err.exitCode === 3) {
              throw new BadRequestException(`Symlinks proibidos no storage: ${err.message}`);
            }
            if (err.exitCode === 1) {
              throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
            }
          }
          throw err;
        }
      }

      // 2. MODO DE EMULAÇÃO LOCAL
      this.validateNoSymlinksInPath(fullPath);
      const preStat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
      if (!preStat) {
        throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
      }
      if (preStat.isSymbolicLink()) {
        throw new BadRequestException('Symlinks proibidos no storage: symlink detectado na leitura.');
      }

      const openFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
      let fileHandle: fs.promises.FileHandle | null = null;
      try {
        fileHandle = await fs.promises.open(fullPath, openFlags);
        const stat = await fileHandle.stat();
        if (!stat.isFile()) {
          throw new BadRequestException('Recurso no storage não é um arquivo regular.');
        }

        const buffer = await fileHandle.readFile();

        if (expectedSha256) {
          const readSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
          if (readSha256 !== expectedSha256) {
            throw new BadRequestException(
              `Violação de integridade no storage: SHA-256 lido (${readSha256}) difere do esperado (${expectedSha256}).`,
            );
          }
        }

        return buffer;
      } finally {
        if (fileHandle) {
          await fileHandle.close().catch(() => {});
        }
      }
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      if (err.code === 'ENOENT') {
        throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
      }
      if (err.code === 'ELOOP' || err.code === 'EINVAL') {
        throw new BadRequestException('Symlinks proibidos no storage.');
      }
      if (err.code === 'EACCES' || err.code === 'EROFS') {
        this.logger.error(`Falha crítica de leitura no storage: ${err.code} - ${err.message}`);
        throw new ServiceUnavailableException(`Storage LOCAL_SECURE inacessível para leitura: ${err.code}`);
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const { fullPath, sanitizedKey } = this.validateAndResolveKey(key);

    if (this.testBarrier) {
      await this.testBarrier('pre-delete', { key, fullPath });
    }

    // 1. VIA HELPER LINUX BASEADO EM DESCRITORES
    if (LinuxStorageHelper.isLinuxDescriptorHelperAvailable()) {
      const targetRel = sanitizedKey.replace(/\\/g, '/');
      try {
        LinuxStorageHelper.unlinkSafe(this.basePath, targetRel);
        return;
      } catch (err: any) {
        if (err instanceof LinuxStorageHelperError) {
          if (err.exitCode === 3) {
            throw new BadRequestException('Tentativa de remoção de symlink proibido no storage.');
          }
          if (err.exitCode === 1) {
            // Se não existe, idempotente
            return;
          }
        }
        throw err;
      }
    }

    // 2. MODO DE EMULAÇÃO LOCAL
    const stat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isSymbolicLink()) {
      throw new BadRequestException('Tentativa de remoção de symlink proibido no storage.');
    }

    this.validateNoSymlinksInPath(fullPath);
    try {
      await fs.promises.unlink(fullPath);
    } catch (unlinkErr: any) {
      if (unlinkErr.code !== 'ENOENT') {
        this.logger.error(`Falha ao remover arquivo do storage: ${key}. Erro: ${unlinkErr?.message}`);
        throw unlinkErr;
      }
    }
  }

  async reconcileOrphans(knownKeys: Set<string>, gracePeriodMs: number = 60 * 60 * 1000): Promise<string[]> {
    const orphans: string[] = [];
    const cutoffTime = Date.now() - gracePeriodMs;

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.tmp_uploads') continue;
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(res);
        } else {
          // Ignora arquivos temporários de escrita em andamento
          if (entry.name.startsWith('.tmp_') || entry.name.startsWith('.tmp.')) continue;

          const relKey = path.relative(this.basePath, res).replace(/\\/g, '/');
          if (!knownKeys.has(relKey)) {
            try {
              const stat = fs.statSync(res);
              if (stat.mtimeMs < cutoffTime) {
                orphans.push(relKey);
              } else {
                this.logger.debug(
                  `[Orphan Check] Arquivo ${relKey} ausente no banco mas recente (age=${Math.round((Date.now() - stat.mtimeMs) / 1000)}s). Preservado pelo grace period.`,
                );
              }
            } catch {
              // Se stat falhar, ignorar
            }
          }
        }
      }
    };

    walk(this.basePath);
    return orphans;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await fs.promises.access(this.basePath, fs.constants.R_OK | fs.constants.W_OK);
      const stat = await fs.promises.stat(this.basePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
