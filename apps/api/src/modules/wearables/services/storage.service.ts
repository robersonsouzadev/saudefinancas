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

  private validateNoSymlinksInPath(dirPath: string): void {
    let current = path.resolve(dirPath);
    const root = this.basePath;

    while (current.length >= root.length) {
      if (fs.existsSync(current)) {
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) {
          throw new BadRequestException(`Symlink proibido detectado na árvore de diretórios: ${current}`);
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

      // Escrita atômica em arquivo temporário com flags exclusivas
      const tempFileName = `.tmp_${crypto.randomBytes(16).toString('hex')}`;
      const tempPath = path.join(dirPath, tempFileName);

      const openFlags =
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_WRONLY |
        (fs.constants.O_NOFOLLOW || 0);

      let fileHandle: fs.promises.FileHandle | null = null;
      try {
        fileHandle = await fs.promises.open(tempPath, openFlags, 0o600);
        await fileHandle.writeFile(buffer);
        await fileHandle.sync(); // fsync do arquivo
      } finally {
        if (fileHandle) {
          await fileHandle.close();
        }
      }

      // Publicação atômica NO-CLOBBER via fs.promises.link
      // Se fullPath já existir, link falha com EEXIST impedindo sobrescrita silenciosa
      try {
        await fs.promises.link(tempPath, fullPath);
      } catch (linkErr: any) {
        if (linkErr.code === 'EEXIST') {
          throw new ConflictException(`Conflito de storage: arquivo já existe em destino (${sanitizedKey}). Sobrescrita proibida.`);
        }
        throw linkErr;
      } finally {
        // Limpeza garantida do arquivo temporário
        await fs.promises.unlink(tempPath).catch(() => {});
      }

      // fsync do diretório pai para durabilidade dos metadados (onde suportado)
      try {
        const dirHandle = await fs.promises.open(dirPath, 'r');
        await dirHandle.sync().catch(() => {});
        await dirHandle.close().catch(() => {});
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
    const { fullPath } = this.validateAndResolveKey(key);

    try {
      if (!fs.existsSync(fullPath)) {
        throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
      }

      const lstat = await fs.promises.lstat(fullPath);
      if (lstat.isSymbolicLink()) {
        throw new BadRequestException('Symlinks proibidos no storage.');
      }

      const buffer = await fs.promises.readFile(fullPath);

      if (expectedSha256) {
        const readSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        if (readSha256 !== expectedSha256) {
          throw new BadRequestException(`Violação de integridade no storage: SHA-256 lido (${readSha256}) difere do esperado (${expectedSha256}).`);
        }
      }

      return buffer;
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      if (err.code === 'EACCES' || err.code === 'EROFS') {
        this.logger.error(`Falha crítica de leitura no storage: ${err.code} - ${err.message}`);
        throw new ServiceUnavailableException(`Storage LOCAL_SECURE inacessível para leitura: ${err.code}`);
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const { fullPath } = this.validateAndResolveKey(key);

      if (fs.existsSync(fullPath)) {
        const lstat = await fs.promises.lstat(fullPath);
        if (!lstat.isSymbolicLink()) {
          await fs.promises.unlink(fullPath);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Falha ao remover arquivo do storage: ${key}. Erro: ${err?.message}`);
    }
  }

  async reconcileOrphans(knownKeys: Set<string>): Promise<string[]> {
    const orphans: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(res);
        } else {
          // Ignora arquivos temporários de escrita em andamento
          if (entry.name.startsWith('.tmp_')) continue;

          const relKey = path.relative(this.basePath, res).replace(/\\/g, '/');
          if (!knownKeys.has(relKey)) {
            orphans.push(relKey);
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

