import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IPrivateObjectStorage, StoredObjectRef } from '../interfaces/storage.interface';

@Injectable()
export class PrivateObjectStorageService implements IPrivateObjectStorage {
  private readonly logger = new Logger(PrivateObjectStorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const customPath = this.configService.get<string>('STORAGE_PATH');
    this.basePath = customPath 
      ? path.resolve(customPath) 
      : path.resolve(process.cwd(), 'storage', 'private', 'wearables');

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async putObject(key: string, buffer: Buffer): Promise<StoredObjectRef> {
    const sanitizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(this.basePath, sanitizedKey);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, buffer, { mode: 0o600 });

    return {
      storageKey: sanitizedKey.replace(/\\/g, '/'),
      storageDriver: 'LOCAL',
      fileSizeBytes: buffer.length,
    };
  }

  async getObject(key: string): Promise<Buffer> {
    const sanitizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(this.basePath, sanitizedKey);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Objeto de storage não encontrado: ${key}`);
    }

    return fs.promises.readFile(fullPath);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const sanitizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(this.basePath, sanitizedKey);

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
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
}
