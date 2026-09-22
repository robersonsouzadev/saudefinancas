import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IPrivateObjectStorage, StoredObjectRef } from '../interfaces/storage.interface';

@Injectable()
export class PrivateObjectStorageService implements IPrivateObjectStorage {
  private readonly logger = new Logger(PrivateObjectStorageService.name);
  private readonly basePath: string;

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

  getBasePath(): string {
    return this.basePath;
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
      if (fs.existsSync(current)) {
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) {
          throw new BadRequestException(`Symlinks proibidos no storage: symlink detectado na árvore de diretórios (${current})`);
        }
        try {
          const real = fs.realpathSync(current);
          if (!real.startsWith(root + path.sep) && real !== root) {
            throw new BadRequestException(`Caminho canônico fora da raiz autorizada: ${real}`);
          }
        } catch {
          // Se realpath falhar em nó intermediário, rejeita imediatamente
          throw new BadRequestException(`Falha ao resolver caminho canônico intermediário: ${current}`);
        }
      }
      if (current === root) break;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  async putObject(key: string, buffer: Buffer, expectedSha256?: string): Promise<StoredObjectRef> {
    const { fullPath, dirPath, sanitizedKey } = this.validateAndResolveKey(key);

    try {
      this.validateNoSymlinksInPath(dirPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
      }

      // Validação de integridade do payload antes da escrita
      const calculatedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      if (expectedSha256 && calculatedSha256 !== expectedSha256) {
        throw new BadRequestException('SHA-256 do buffer não corresponde ao hash esperado antes da gravação.');
      }

      // Escrita segura em diretório temporário restrito à raiz autorizada do storage
      const tmpUploadsDir = path.join(this.basePath, '.tmp_uploads');
      if (!fs.existsSync(tmpUploadsDir)) {
        fs.mkdirSync(tmpUploadsDir, { recursive: true, mode: 0o700 });
      }

      const tempFileName = `.tmp_${crypto.randomBytes(16).toString('hex')}`;
      const tempPath = path.join(tmpUploadsDir, tempFileName);

      const openFlags =
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_WRONLY |
        (fs.constants.O_NOFOLLOW || 0);

      let fileHandle: fs.promises.FileHandle | null = null;
      try {
        fileHandle = await fs.promises.open(tempPath, openFlags, 0o600);
        await fileHandle.writeFile(buffer);
        await fileHandle.sync(); // fsync do arquivo temporário
        await fileHandle.close();
        fileHandle = null;

        // Re-validação pré-link de toda a cadeia de diretórios intermediários (Anti-TOCTOU)
        this.validateNoSymlinksInPath(dirPath);

        // Verificação via descritor de diretório: em Linux / procfs, valida se o dirHandle não escapou da raiz
        const dirOpenFlags = fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY || 0) | (fs.constants.O_NOFOLLOW || 0);
        let dirHandle: fs.promises.FileHandle | null = null;
        try {
          dirHandle = await fs.promises.open(dirPath, dirOpenFlags);
          if (fs.existsSync(`/proc/self/fd/${dirHandle.fd}`)) {
            const canonicalDirPath = fs.realpathSync(`/proc/self/fd/${dirHandle.fd}`);
            if (!canonicalDirPath.startsWith(this.basePath + path.sep) && canonicalDirPath !== this.basePath) {
              throw new BadRequestException('Symlinks proibidos no storage: escape de diretório detectado via descritor.');
            }
          }
        } finally {
          if (dirHandle) {
            await dirHandle.close().catch(() => {});
          }
        }

        // Publicação atômica NO-CLOBBER via fs.promises.link
        // Se fullPath já existir, link falha com EEXIST impedindo sobrescrita silenciosa
        await fs.promises.link(tempPath, fullPath);

        // Verificação pós-publicação do arquivo final aberto via O_NOFOLLOW
        const checkOpenFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
        let checkHandle: fs.promises.FileHandle | null = null;
        try {
          checkHandle = await fs.promises.open(fullPath, checkOpenFlags);
          if (fs.existsSync(`/proc/self/fd/${checkHandle.fd}`)) {
            const canonicalPublished = fs.realpathSync(`/proc/self/fd/${checkHandle.fd}`);
            if (!canonicalPublished.startsWith(this.basePath + path.sep)) {
              await fs.promises.unlink(fullPath).catch(() => {});
              throw new BadRequestException('Symlinks proibidos no storage: escape pós-publicação detectado.');
            }
          }
          const canonicalOnDisk = fs.realpathSync(fullPath);
          if (!canonicalOnDisk.startsWith(this.basePath + path.sep)) {
            await fs.promises.unlink(fullPath).catch(() => {});
            throw new BadRequestException('Symlinks proibidos no storage: escape pós-publicação detectado.');
          }
        } finally {
          if (checkHandle) {
            await checkHandle.close().catch(() => {});
          }
        }
      } catch (linkErr: any) {
        if (linkErr.code === 'EEXIST') {
          throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
        }
        throw linkErr;
      } finally {
        if (fileHandle) {
          await fileHandle.close().catch(() => {});
        }
        await fs.promises.unlink(tempPath).catch(() => {});
      }

      // fsync do diretório pai para durabilidade dos metadados (onde suportado)
      try {
        const syncDirHandle = await fs.promises.open(dirPath, fs.constants.O_RDONLY);
        await syncDirHandle.sync().catch(() => {});
        await syncDirHandle.close().catch(() => {});
      } catch {}

      return {
        storageKey: sanitizedKey.replace(/\\/g, '/'),
        storageDriver: 'LOCAL_SECURE',
        fileSizeBytes: buffer.length,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
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
    const { fullPath, dirPath } = this.validateAndResolveKey(key);

    try {
      if (!fs.existsSync(fullPath)) {
        throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
      }

      // 1. Verificação prévia de toda a hierarquia de diretórios intermediários
      this.validateNoSymlinksInPath(fullPath);

      // 2. Abertura do descritor de arquivo com O_NOFOLLOW para leitura imune a TOCTOU
      const openFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
      let fileHandle: fs.promises.FileHandle | null = null;
      try {
        fileHandle = await fs.promises.open(fullPath, openFlags);

        // Verificação de descritor: em Linux, valida o caminho canônico do fd via /proc/self/fd
        if (fs.existsSync(`/proc/self/fd/${fileHandle.fd}`)) {
          const canonicalFdPath = fs.realpathSync(`/proc/self/fd/${fileHandle.fd}`);
          if (!canonicalFdPath.startsWith(this.basePath + path.sep)) {
            throw new BadRequestException('Symlinks proibidos no storage: escape de diretório intermediário detectado via descritor.');
          }
        }

        // Re-validação canônica em qualquer plataforma
        const canonicalFile = fs.realpathSync(fullPath);
        if (!canonicalFile.startsWith(this.basePath + path.sep)) {
          throw new BadRequestException('Symlinks proibidos no storage: escape de diretório intermediário detectado.');
        }

        const stat = await fileHandle.stat();
        if (!stat.isFile()) {
          throw new BadRequestException('Recurso no storage não é um arquivo regular.');
        }

        const buffer = await fileHandle.readFile();

        if (expectedSha256) {
          const readSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
          if (readSha256 !== expectedSha256) {
            throw new BadRequestException(`Violação de integridade no storage: SHA-256 lido (${readSha256}) difere do esperado (${expectedSha256}).`);
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
    const { fullPath } = this.validateAndResolveKey(key);

    if (fs.existsSync(fullPath)) {
      const lstat = await fs.promises.lstat(fullPath);
      if (lstat.isSymbolicLink()) {
        throw new BadRequestException('Tentativa de remoção de symlink proibido no storage.');
      }
      try {
        await fs.promises.unlink(fullPath);
      } catch (unlinkErr: any) {
        if (unlinkErr.code !== 'ENOENT') {
          this.logger.error(`Falha ao remover arquivo do storage: ${key}. Erro: ${unlinkErr?.message}`);
          throw unlinkErr; // Propaga a falha para que a rotina de compensação registre o alerta de órfão
        }
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
          if (entry.name.startsWith('.tmp_')) continue;

          const relKey = path.relative(this.basePath, res).replace(/\\/g, '/');
          if (!knownKeys.has(relKey)) {
            // PROTEÇÃO ANTI-TOCTOU: só considerar órfão se mtime > grace period (default 1 hora)
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
              // Se stat falhar, ignorar silenciosamente
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

