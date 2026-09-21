import EmbeddedPostgres from 'embedded-postgres';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

const REDIS_EXE_PATH = 'C:\\Users\\rober\\AppData\\Local\\Microsoft\\WinGet\\Packages\\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\\Redis-8.10.1-Windows-x64-msys2\\redis-server.exe';

export interface TestEnvironment {
  pg: EmbeddedPostgres;
  prisma: PrismaClient;
  redisProcess: ChildProcess | null;
  databaseUrl: string;
  redisPort: number;
}

let envInstance: TestEnvironment | null = null;

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  if (envInstance) return envInstance;

  // 1. Inicia PostgreSQL na porta 5433
  const dataDir = path.resolve(process.cwd(), 'test-pg-data');
  const needsInit = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    port: 5433,
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    initialDatabase: 'postgres',
    persistent: true,
  });

  if (needsInit) {
    await pg.initialise();
  }
  await pg.start();

  try {
    const rootClient = pg.getPgClient('postgres');
    await rootClient.connect();
    await rootClient.query("ALTER DATABASE saudefinancas_test SET timezone TO 'UTC'");
    await rootClient.end();
  } catch {}

  const databaseUrl = 'postgresql://postgres:password@127.0.0.1:5433/saudefinancas_test?schema=public';
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  // 2. Inicia Redis na porta 6380
  const redisPort = 6380;
  let redisProcess: ChildProcess | null = null;

  const redisAlreadyRunning = await isPortOpen(redisPort);
  if (!redisAlreadyRunning && fs.existsSync(REDIS_EXE_PATH)) {
    redisProcess = spawn(REDIS_EXE_PATH, [
      '--port', String(redisPort),
      '--save', '',
      '--appendonly', 'no',
    ], { stdio: 'ignore' });

    // Aguarda porta abrir
    for (let i = 0; i < 20; i++) {
      if (await isPortOpen(redisPort)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  envInstance = {
    pg,
    prisma,
    redisProcess,
    databaseUrl,
    redisPort,
  };

  return envInstance;
}

export async function teardownTestEnvironment(): Promise<void> {
  if (!envInstance) return;

  try {
    await envInstance.prisma.$disconnect();
  } catch {}

  try {
    await envInstance.pg.stop();
  } catch {}

  if (envInstance.redisProcess) {
    try {
      envInstance.redisProcess.kill('SIGTERM');
    } catch {}
  }

  envInstance = null;
}
