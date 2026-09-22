import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface LinuxStorageHelperResult {
  success: boolean;
  exitCode: number;
  stdout?: Buffer;
  stderr?: string;
  error?: Error;
}

export class LinuxStorageHelper {
  private static helperPath: string | null = null;
  private static isAvailable: boolean | null = null;

  static findHelperBinary(): string | null {
    if (this.helperPath && fs.existsSync(this.helperPath)) {
      return this.helperPath;
    }

    const candidatePaths = [
      process.env.STORAGE_LINUX_HELPER_PATH,
      '/usr/local/bin/storage_linux_helper',
      path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'storage_linux_helper'),
      path.resolve(process.cwd(), 'scripts', 'storage_linux_helper'),
      path.resolve(process.cwd(), 'apps', 'api', 'scripts', 'storage_linux_helper'),
    ].filter(Boolean) as string[];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          fs.accessSync(p, fs.constants.X_OK);
          this.helperPath = p;
          return p;
        } catch {}
      }
    }

    // Se estiver em Linux e gcc estiver disponível, compilar automaticamente
    if (process.platform === 'linux') {
      const srcCandidates = [
        path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'storage_linux_helper.c'),
        path.resolve(process.cwd(), 'scripts', 'storage_linux_helper.c'),
        path.resolve(process.cwd(), 'apps', 'api', 'scripts', 'storage_linux_helper.c'),
      ];

      for (const src of srcCandidates) {
        if (fs.existsSync(src)) {
          const out = path.join(path.dirname(src), 'storage_linux_helper');
          try {
            execFileSync('gcc', ['-O2', '-Wall', src, '-o', out], { stdio: 'pipe' });
            if (fs.existsSync(out)) {
              this.helperPath = out;
              return out;
            }
          } catch {}
        }
      }
    }

    return null;
  }

  static isLinuxDescriptorHelperAvailable(): boolean {
    if (this.isAvailable !== null) return this.isAvailable;
    if (process.platform !== 'linux') {
      this.isAvailable = false;
      return false;
    }
    const bin = this.findHelperBinary();
    this.isAvailable = bin !== null;
    return this.isAvailable;
  }

  static write(baseDir: string, relPath: string, tempRelPath: string): LinuxStorageHelperResult {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new Error('LinuxStorageHelper binary not available');
    }
    const res = spawnSync(bin, ['write', baseDir, relPath, tempRelPath], { stdio: 'pipe' });
    return {
      success: res.status === 0,
      exitCode: res.status ?? -1,
      stdout: res.stdout,
      stderr: res.stderr ? res.stderr.toString() : '',
    };
  }

  static read(baseDir: string, relPath: string): LinuxStorageHelperResult {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new Error('LinuxStorageHelper binary not available');
    }
    const res = spawnSync(bin, ['read', baseDir, relPath], { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 });
    return {
      success: res.status === 0,
      exitCode: res.status ?? -1,
      stdout: res.stdout,
      stderr: res.stderr ? res.stderr.toString() : '',
    };
  }

  static unlink(baseDir: string, relPath: string): LinuxStorageHelperResult {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new Error('LinuxStorageHelper binary not available');
    }
    const res = spawnSync(bin, ['unlink', baseDir, relPath], { stdio: 'pipe' });
    return {
      success: res.status === 0,
      exitCode: res.status ?? -1,
      stdout: res.stdout,
      stderr: res.stderr ? res.stderr.toString() : '',
    };
  }
}
