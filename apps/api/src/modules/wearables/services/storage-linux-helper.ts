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

export interface LinuxStorageProbeResult {
  status: 'ok' | 'error';
  openat2: boolean;
  renameat2_noreplace: boolean;
  proc_self_fd: boolean;
  exitCode: number;
  rawStderr?: string;
}

export class LinuxStorageHelperError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = 'LinuxStorageHelperError';
  }
}

export class LinuxStorageHelper {
  private static helperPath: string | null = null;
  private static probeResult: LinuxStorageProbeResult | null = null;

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
            execFileSync('gcc', ['-O2', '-Wall', '-D_GNU_SOURCE', src, '-o', out], { stdio: 'pipe' });
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

  /**
   * Executa a auditoria de probe real contra o kernel Linux.
   * Não aceita verificação cosmética de existência de arquivo.
   * Exige Exit Code 0, openat2 ativo, renameat2 ativo e /proc/self/fd acessível.
   */
  static runProbe(): LinuxStorageProbeResult {
    if (this.probeResult !== null) return this.probeResult;

    if (process.platform !== 'linux') {
      this.probeResult = {
        status: 'error',
        openat2: false,
        renameat2_noreplace: false,
        proc_self_fd: false,
        exitCode: 4,
        rawStderr: 'Plataforma não-Linux',
      };
      return this.probeResult;
    }

    const bin = this.findHelperBinary();
    if (!bin) {
      this.probeResult = {
        status: 'error',
        openat2: false,
        renameat2_noreplace: false,
        proc_self_fd: false,
        exitCode: 4,
        rawStderr: 'Binário storage_linux_helper não encontrado',
      };
      return this.probeResult;
    }

    try {
      const res = spawnSync(bin, ['probe'], { stdio: 'pipe', timeout: 5000 });
      if (res.status !== 0) {
        this.probeResult = {
          status: 'error',
          openat2: false,
          renameat2_noreplace: false,
          proc_self_fd: false,
          exitCode: res.status ?? 1,
          rawStderr: res.stderr ? res.stderr.toString('utf8') : '',
        };
        return this.probeResult;
      }

      const outText = res.stdout ? res.stdout.toString('utf8').trim() : '';
      const parsed = JSON.parse(outText);
      if (parsed.status === 'ok' && parsed.openat2 === true && parsed.renameat2_noreplace === true) {
        this.probeResult = {
          status: 'ok',
          openat2: true,
          renameat2_noreplace: true,
          proc_self_fd: parsed.proc_self_fd === true,
          exitCode: 0,
        };
        return this.probeResult;
      }

      this.probeResult = {
        status: 'error',
        openat2: false,
        renameat2_noreplace: false,
        proc_self_fd: false,
        exitCode: 1,
        rawStderr: `Saída de probe inválida: ${outText}`,
      };
      return this.probeResult;
    } catch (err: any) {
      this.probeResult = {
        status: 'error',
        openat2: false,
        renameat2_noreplace: false,
        proc_self_fd: false,
        exitCode: 1,
        rawStderr: err.message,
      };
      return this.probeResult;
    }
  }

  static isLinuxDescriptorHelperAvailable(): boolean {
    const probe = this.runProbe();
    return probe.status === 'ok' && probe.exitCode === 0;
  }

  /**
   * Publicação estritamente atômica de arquivo via helper Linux baseado em descritores.
   * Cria temporário no mesmo diretório pai seguro, transmite payload pela stdin,
   * executa fsync e renameat2 com RENAME_NOREPLACE.
   */
  static putAtomic(baseDir: string, relPath: string, payload: Buffer): LinuxStorageHelperResult {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new LinuxStorageHelperError(4, 'Binário storage_linux_helper não disponível');
    }
    const res = spawnSync(bin, ['put', baseDir, relPath], {
      input: payload,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });

    const exitCode = res.status ?? -1;
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';

    if (exitCode !== 0) {
      if (exitCode === 2) {
        throw new LinuxStorageHelperError(2, `Destino já existe: ${relPath}`, stderr);
      }
      if (exitCode === 3) {
        throw new LinuxStorageHelperError(3, `Violação de segurança ou symlink detectado em ${relPath}: ${stderr}`, stderr);
      }
      if (exitCode === 4) {
        throw new LinuxStorageHelperError(4, `Syscall openat2/renameat2 indisponível no kernel: ${stderr}`, stderr);
      }
      throw new LinuxStorageHelperError(exitCode, `Falha operacional no helper Linux (${exitCode}): ${stderr}`, stderr);
    }

    return {
      success: true,
      exitCode: 0,
      stdout: res.stdout,
      stderr,
    };
  }

  /**
   * Leitura segura baseada em descritor via helper Linux.
   */
  static readSafe(baseDir: string, relPath: string): Buffer {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new LinuxStorageHelperError(4, 'Binário storage_linux_helper não disponível');
    }
    const res = spawnSync(bin, ['read', baseDir, relPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 100 * 1024 * 1024,
      timeout: 30000,
    });

    const exitCode = res.status ?? -1;
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';

    if (exitCode !== 0) {
      if (exitCode === 3) {
        throw new LinuxStorageHelperError(3, `Tentativa de ler symlink ou caminho fora da raiz: ${relPath}`, stderr);
      }
      throw new LinuxStorageHelperError(exitCode, `Falha ao ler arquivo seguro (${exitCode}): ${stderr}`, stderr);
    }

    return res.stdout;
  }

  /**
   * Exclusão segura no diretório pai relativo ao descritor seguro.
   */
  static unlinkSafe(baseDir: string, relPath: string): void {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new LinuxStorageHelperError(4, 'Binário storage_linux_helper não disponível');
    }
    const res = spawnSync(bin, ['unlink', baseDir, relPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    });

    const exitCode = res.status ?? -1;
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';

    if (exitCode !== 0) {
      throw new LinuxStorageHelperError(exitCode, `Falha ao excluir arquivo seguro (${exitCode}): ${stderr}`, stderr);
    }
  }

  /**
   * Stat seguro do arquivo.
   */
  static statSafe(baseDir: string, relPath: string): { size: number; mode: number; isReg: boolean } {
    const bin = this.findHelperBinary();
    if (!bin) {
      throw new LinuxStorageHelperError(4, 'Binário storage_linux_helper não disponível');
    }
    const res = spawnSync(bin, ['stat', baseDir, relPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    });

    const exitCode = res.status ?? -1;
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';

    if (exitCode !== 0) {
      throw new LinuxStorageHelperError(exitCode, `Falha no stat seguro (${exitCode}): ${stderr}`, stderr);
    }

    const outText = res.stdout ? res.stdout.toString('utf8').trim() : '{}';
    return JSON.parse(outText);
  }
}
