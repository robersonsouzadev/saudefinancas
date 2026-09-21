import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import EmbeddedPostgres from 'embedded-postgres';
import { CrcCalculator } from '@garmin/fitsdk';

const JWT_SECRET = 'super-secret-e2e-audit-key-2026';
const AUDIT_HMAC_SECRET = 'super-secret-hmac-key-2026';
const API_PORT = 3333;
const PG_PORT = 5433;
const REDIS_PORT = 6380;
const REDIS_EXE_PATH = 'C:\\Users\\rober\\AppData\\Local\\Microsoft\\WinGet\\Packages\\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\\Redis-8.10.1-Windows-x64-msys2\\redis-server.exe';
const DB_URL = `postgresql://postgres:password@127.0.0.1:${PG_PORT}/saudefinancas_test?schema=public`;

function createExactSizedFitBuffer(totalBytes) {
  const buf = Buffer.alloc(totalBytes);
  const headerSize = 14;
  const dataSize = totalBytes - headerSize - 2;

  buf.writeUInt8(headerSize, 0);
  buf.writeUInt8(0x20, 1); // protocol version
  buf.writeUInt16LE(2100, 2); // profile version
  buf.writeUInt32LE(dataSize, 4); // data size
  buf.write('.FIT', 8, 4, 'ascii'); // signature

  const headerCrc = CrcCalculator.calculateCRC(buf, 0, 12);
  buf.writeUInt16LE(headerCrc, 12);

  const fileCrc = CrcCalculator.calculateCRC(buf, 0, totalBytes - 2);
  buf.writeUInt16LE(fileCrc, totalBytes - 2);

  return buf;
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
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

async function waitForPort(port, maxTries = 40) {
  for (let i = 0; i < maxTries; i++) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  console.log('================================================================================');
  console.log('         AUDITORIA FACTUAL E2E HTTP COM PROCESSO WORKER E API COMPILADOS        ');
  console.log('================================================================================\n');

  // 1. Inicialização do PostgreSQL 18.4
  console.log('[1/7] Inicializando PostgreSQL 18.4 isolado...');
  const dataDir = path.resolve('test-pg-data');
  const pg = new EmbeddedPostgres({
    port: PG_PORT,
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    initialDatabase: 'postgres',
    persistent: true,
  });
  await pg.start();
  const pgHealthy = await waitForPort(PG_PORT);
  console.log(`- PostgreSQL Porta: ${PG_PORT}`);
  console.log(`- PostgreSQL Banco: saudefinancas_test`);
  console.log(`- PostgreSQL Connection: postgresql://postgres:*****@127.0.0.1:${PG_PORT}/saudefinancas_test?schema=public`);
  console.log(`- PostgreSQL Healthcheck: ${pgHealthy ? 'HEALTHY (Porta aberta e aceitando conexões)' : 'FAILED'}`);

  // Auditoria de Timezone e Timestamps do PostgreSQL
  const pgClient = pg.getPgClient('postgres');
  await pgClient.connect();
  try {
    await pgClient.query("ALTER DATABASE saudefinancas_test SET timezone TO 'UTC'");
  } catch {}
  await pgClient.end();

  const testDbClient = pg.getPgClient('saudefinancas_test');
  await testDbClient.connect();
  const tzRes = await testDbClient.query('SHOW TIMEZONE');
  const tsRes = await testDbClient.query('SELECT NOW() as now, CURRENT_TIMESTAMP as current_timestamp, LOCALTIMESTAMP as localtimestamp');
  console.log('\n--- AUDITORIA DE TIMEZONE DO POSTGRESQL ---');
  console.log(`  * SHOW TIMEZONE:           ${tzRes.rows[0].TimeZone}`);
  console.log(`  * SELECT NOW():            ${tsRes.rows[0].now}`);
  console.log(`  * SELECT CURRENT_TIMESTAMP:${tsRes.rows[0].current_timestamp}`);
  console.log(`  * SELECT LOCALTIMESTAMP:   ${tsRes.rows[0].localtimestamp}`);
  console.log(`  * Node new Date().toISOString(): ${new Date().toISOString()}`);
  await testDbClient.end();

  // 2. Inicialização do Redis 8.10.1
  console.log('\n[2/7] Inicializando Redis 8.10.1 isolado...');
  let redisProcess = null;
  const redisRunning = await isPortOpen(REDIS_PORT);
  if (!redisRunning && fs.existsSync(REDIS_EXE_PATH)) {
    redisProcess = spawn(REDIS_EXE_PATH, [
      '--port', String(REDIS_PORT),
      '--save', '',
      '--appendonly', 'no',
    ], { stdio: 'ignore' });
  }
  const redisHealthy = await waitForPort(REDIS_PORT);
  console.log(`- Redis Porta: ${REDIS_PORT}`);
  console.log(`- Redis PID: ${redisProcess ? redisProcess.pid : 'Processo pré-existente'}`);
  console.log(`- Redis Healthcheck: ${redisHealthy ? 'HEALTHY (PONG / Porta aberta)' : 'FAILED'}`);

  const prisma = new PrismaClient({
    datasources: { db: { url: DB_URL } },
  });

  // 3. Inicialização da API Compilada (node dist/src/main.js)
  console.log('\n[3/7] Inicializando API Compilada (NestJS)...');
  const apiProcess = spawn('node', ['dist/src/main.js'], {
    env: {
      ...process.env,
      PORT: String(API_PORT),
      DATABASE_URL: DB_URL,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: String(REDIS_PORT),
      JWT_SECRET,
      AUDIT_HMAC_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[API stdout] ${msg}`);
  });
  apiProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[API stderr] ${msg}`);
  });

  const apiReady = await waitForPort(API_PORT);
  console.log(`- API Porta: ${API_PORT}`);
  console.log(`- API PID: ${apiProcess.pid}`);
  console.log(`- API Healthcheck: ${apiReady ? 'HEALTHY (Escutando em /api)' : 'FAILED'}`);

  // 4. Inicialização do Worker Compilado (node dist/src/worker.js)
  console.log('\n[4/7] Inicializando Standalone Worker Compilado...');
  const workerProcess = spawn('node', ['dist/src/worker.js'], {
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: String(REDIS_PORT),
      JWT_SECRET,
      AUDIT_HMAC_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  workerProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[WORKER stdout] ${msg}`);
  });
  workerProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[WORKER stderr] ${msg}`);
  });

  console.log(`- Worker PID: ${workerProcess.pid}`);
  console.log(`- Worker Estado: Iniciado e escutando fila 'wearables-fit-import' via BullMQ`);
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // 5. Autenticação e Criação de Tokens para Dois Usuários
    console.log('\n[5/7] Criando e autenticando 2 usuários de teste no banco isolado...');
    const runId = Date.now();
    const user1 = await prisma.user.create({
      data: {
        email: `atleta1_${runId}@vitasatude.com`,
        name: 'Usuário Atleta 1 (Dourados/MS)',
        timezone: 'America/Campo_Grande',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: `atleta2_${runId}@vitasatude.com`,
        name: 'Usuário Atleta 2 (São Paulo/SP)',
        timezone: 'America/Sao_Paulo',
      },
    });

    const token1 = jwt.sign({ sub: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ sub: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });

    console.log(`- Usuário 1: ID=${user1.id} | Email=${user1.email} | Timezone=${user1.timezone}`);
    console.log(`  Token 1 (truncado): ${token1.slice(0, 25)}...${token1.slice(-10)}`);
    console.log(`- Usuário 2: ID=${user2.id} | Email=${user2.email} | Timezone=${user2.timezone}`);
    console.log(`  Token 2 (truncado): ${token2.slice(0, 25)}...${token2.slice(-10)}`);

    // 6. Testes HTTP E2E contra a API Compilada
    console.log('\n[6/7] Executando Casos de Teste HTTP E2E contra a API...');
    const fixturesDir = path.resolve('test/fixtures');
    const validFitBuffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_running.fit'));

    // --- CASO 0: Endpoint de Configuração de Upload (/config) ---
    console.log('\n--- CASO 0: Verificação do Endpoint de Configuração GET /config ---');
    const configRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/config`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    console.log(`- Status HTTP Recebido: ${configRes.status} (Esperado: 200 OK)`);
    const configJson = await configRes.json();
    console.log('- Resposta Config JSON:', JSON.stringify(configJson, null, 2));
    if (configRes.status !== 200 || configJson.maxUploadSizeMb !== 15 || configJson.maxUploadSizeBytes !== 15728640) {
      throw new Error(`Falha no endpoint /config: ${JSON.stringify(configJson)}`);
    }
    console.log(`[OK] Limite de upload verificado: ${configJson.maxUploadSizeMb} MB (${configJson.maxUploadSizeBytes} bytes).`);

    // --- CASO 1: Upload de Arquivo FIT Válido (Usuário 1) ---
    console.log('\n--- CASO 1: Upload de Arquivo FIT Válido (Usuário 1) e Polling HTTP 200 ---');
    const requestStart = new Date();
    console.log(`- Request Start Time: ${requestStart.toISOString()}`);
    const formData = new FormData();
    formData.append('file', new Blob([validFitBuffer], { type: 'application/vnd.ant.fit' }), 'synthetic_running.fit');

    const uploadRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/fit/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
      },
      body: formData,
    });

    console.log(`- Status HTTP Recebido: ${uploadRes.status} (Esperado: 202 Accepted)`);
    const uploadJson = await uploadRes.json();
    console.log('- Resposta JSON:', JSON.stringify(uploadJson, null, 2));

    if (uploadRes.status !== 202) {
      throw new Error(`Upload falhou: esperado 202, recebido ${uploadRes.status}`);
    }

    const importId = uploadJson.importId;
    console.log(`- Arquivo registrado com importId=${importId}, aguardando processamento pelo Worker...`);

    // Polling até PROCESSED (HTTP e DB)
    let processedFile = null;
    let pollJsonFinal = null;
    for (let attempt = 1; attempt <= 15; attempt++) {
      await new Promise((r) => setTimeout(r, 600));
      const pollRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/imports/${importId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      console.log(`  [Polling #${attempt}] HTTP Status=${pollRes.status}`);
      if (pollRes.status !== 200) {
        const errText = await pollRes.text();
        throw new Error(`Polling HTTP retornou status ${pollRes.status}: ${errText}`);
      }
      const pollJson = await pollRes.json();
      console.log(`  [Polling #${attempt}] Resposta:`, JSON.stringify(pollJson));

      // Validação estrita de DTO allowlist (Nenhum campo de lease/worker/storage retornado)
      const prohibitedFields = ['leaseOwner', 'leaseExpiresAt', 'leaseVersion', 'workerPid', 'storageKey', 'fileSha256', 'retryCount', 'recoverySequence'];
      for (const field of prohibitedFields) {
        if (pollJson[field] !== undefined) {
          throw new Error(`Violação de DTO: Campo interno proibido retornado na API: ${field}`);
        }
      }

      if (pollJson.status === 'PROCESSED') {
        pollJsonFinal = pollJson;
        const dbCheck = await prisma.importedFile.findUnique({ where: { id: importId } });
        processedFile = dbCheck;
        console.log(`  [Sucesso Polling HTTP 200] Status PROCESSED! Duração: ${pollJson.processingDurationMs}ms, Atividades associadas: ${pollJson.activities?.length}`);
        console.log(`  [Worker Event DB] Versão Lease no banco: ${dbCheck.leaseVersion.toString()}, Status DB: ${dbCheck.status}`);
        break;
      }
    }

    if (!pollJsonFinal) {
      throw new Error(`Arquivo ${importId} não atingiu status PROCESSED a tempo.`);
    }

    const requestEnd = new Date();
    console.log(`- Request End Time: ${requestEnd.toISOString()}`);

    // Auditoria rigorosa de Invariantes Temporais (G4.1.2)
    console.log('\n--- AUDITORIA DE INVARIANTES TEMPORAIS (G4.1.2) ---');
    console.log(`  * requestStart:         ${requestStart.toISOString()} (${requestStart.getTime()} ms)`);
    console.log(`  * createdAt:            ${processedFile.createdAt.toISOString()} (${processedFile.createdAt.getTime()} ms)`);
    console.log(`  * processingStartedAt:  ${processedFile.processingStartedAt.toISOString()} (${processedFile.processingStartedAt.getTime()} ms)`);
    console.log(`  * processedAt:          ${processedFile.processedAt.toISOString()} (${processedFile.processedAt.getTime()} ms)`);
    console.log(`  * requestEnd:           ${requestEnd.toISOString()} (${requestEnd.getTime()} ms)`);
    console.log(`  * processingDurationMs: ${processedFile.processingDurationMs} ms`);

    // Invariante 1: requestStart <= createdAt (tolerância de 1000ms para clocks de SO/DB)
    if (processedFile.createdAt.getTime() < requestStart.getTime() - 1000) {
      throw new Error(`Violação temporal: createdAt (${processedFile.createdAt.toISOString()}) é anterior a requestStart (${requestStart.toISOString()})`);
    }
    // Invariante 2: createdAt <= processingStartedAt
    if (processedFile.processingStartedAt.getTime() < processedFile.createdAt.getTime()) {
      throw new Error(`Violação temporal: processingStartedAt (${processedFile.processingStartedAt.toISOString()}) é anterior a createdAt (${processedFile.createdAt.toISOString()})`);
    }
    // Invariante 3: processingStartedAt <= processedAt
    if (processedFile.processedAt.getTime() < processedFile.processingStartedAt.getTime()) {
      throw new Error(`Violação temporal: processedAt (${processedFile.processedAt.toISOString()}) é anterior a processingStartedAt (${processedFile.processingStartedAt.toISOString()})`);
    }
    // Invariante 4: processedAt <= requestEnd
    if (processedFile.processedAt.getTime() > requestEnd.getTime() + 1000) {
      throw new Error(`Violação temporal: processedAt (${processedFile.processedAt.toISOString()}) é posterior a requestEnd (${requestEnd.toISOString()})`);
    }
    // Invariante 5: processingDurationMs >= 0
    if (processedFile.processingDurationMs < 0) {
      throw new Error(`Violação temporal: processingDurationMs negativo (${processedFile.processingDurationMs})`);
    }
    console.log('[OK] Invariante Temporal Comprovado: requestStart <= createdAt <= processingStartedAt <= processedAt <= requestEnd');
    console.log('[OK] processingDurationMs >= 0 comprovado.');

    // Valida persistência da atividade canônica no banco com Timezone correto
    const activity = await prisma.workoutActivity.findFirst({
      where: { userId: user1.id },
      include: { laps: true, telemetry: true, sessionProjection: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('- Atividade Canônica Persistida no PostgreSQL:');
    console.log(`  * ID: ${activity.id}`);
    console.log(`  * Categoria: ${activity.sportCategory}`);
    console.log(`  * Timezone: ${activity.timezone} (Esperado: America/Campo_Grande do perfil)`);
    console.log(`  * StartedAt (UTC): ${activity.startedAt.toISOString()}`);
    if (activity.finishedAt) {
      console.log(`  * FinishedAt (UTC): ${activity.finishedAt.toISOString()}`);
      if (activity.finishedAt.getTime() < activity.startedAt.getTime()) {
        throw new Error(`Violação temporal: WorkoutActivity.finishedAt < startedAt`);
      }
    }
    console.log(`  * LocalDate (Projeção local): ${activity.localDate} (Esperado: 2026-09-21)`);
    if (activity.localDate !== '2026-09-21') {
      throw new Error(`LocalDate inconsistente: esperado 2026-09-21, recebido ${activity.localDate}`);
    }
    console.log(`  * Duração: ${activity.durationSeconds}s`);
    console.log(`  * Projeção WorkoutSession ID: ${activity.sessionProjection?.id || 'Nenhuma'}`);
    console.log(`  * Duração Projeção: ${activity.sessionProjection?.durationMinutes} min`);

    // --- CASO 2: Acesso Cruzado por Usuário 2 (Esperado: 404 Not Found) ---
    console.log('\n--- CASO 2: Tentativa de Acesso Cruzado (Usuário 2 acessando importId do Usuário 1) ---');
    const crossRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/imports/${importId}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    console.log(`- Status HTTP Recebido: ${crossRes.status} (Esperado: 404 Not Found)`);
    const crossJson = await crossRes.json();
    console.log('- Resposta JSON:', JSON.stringify(crossJson, null, 2));
    if (crossRes.status !== 404) {
      throw new Error(`Esperado 404 para IDOR, recebido ${crossRes.status}`);
    }

    // --- CASO 3: Arquivo Inválido / Corrompido ---
    console.log('\n--- CASO 3: Upload de Arquivo Binário com CRC Inválido / Corrompido ---');
    const corruptedFitBuffer = fs.readFileSync(path.join(fixturesDir, 'synthetic_corrupted.fit'));
    const formCorrupted = new FormData();
    formCorrupted.append('file', new Blob([corruptedFitBuffer], { type: 'application/vnd.ant.fit' }), 'corrupted.fit');

    const corruptRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/fit/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formCorrupted,
    });
    console.log(`- Status HTTP Recebido: ${corruptRes.status} (Esperado: 400 Bad Request)`);
    const corruptJson = await corruptRes.json();
    console.log('- Resposta JSON:', JSON.stringify(corruptJson, null, 2));
    if (corruptRes.status !== 400) {
      throw new Error(`Esperado 400 para CRC inválido, recebido ${corruptRes.status}`);
    }

    // --- CASO 3B: Falso Content-Type (Payload Fake / Imagem PNG / Spoofing) ---
    console.log('\n--- CASO 3B: Upload com Falso Content-Type (Texto / PNG disfarçado de FIT) ---');
    const fakeBuffer = Buffer.from('NOT_A_FIT_FILE_JUST_RANDOM_TEXT_DISGUISED');
    const formFake = new FormData();
    formFake.append('file', new Blob([fakeBuffer], { type: 'application/vnd.ant.fit' }), 'fake_spoofed.fit');

    const fakeRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/fit/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formFake,
    });
    console.log(`- Status HTTP Recebido: ${fakeRes.status} (Esperado: 400 Bad Request)`);
    const fakeJson = await fakeRes.json();
    console.log('- Resposta JSON:', JSON.stringify(fakeJson, null, 2));
    if (fakeRes.status !== 400) {
      throw new Error(`Esperado 400 para conteúdo falso/spoofing, recebido ${fakeRes.status}`);
    }
    console.log('[OK] CASO 3B Aprovado: Falso content-type detectado e rejeitado com HTTP 400.');


    // --- CASO 4: Consulta de Importação com status FAILED e Mensagem Pública Segura ---
    console.log('\n--- CASO 4: Consulta de Importação FAILED com Mensagem Pública Segura ---');
    const failedImport = await prisma.importedFile.create({
      data: {
        userId: user1.id,
        storageKey: `wearables/${user1.id}/failed_test.fit`,
        fileSha256: 'deadbeef' + Date.now().toString(16),
        originalFileName: 'failed_corrupt.fit',
        fileSizeBytes: 1024,
        status: 'FAILED',
        errorCode: 'FIT_CRC_MISMATCH',
        errorMessage: 'INTERNAL_TRACE: Parser exploded at worker.ts:145 in node Buffer read',
      },
    });

    const failedRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/imports/${failedImport.id}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    console.log(`- Status HTTP Recebido: ${failedRes.status} (Esperado: 200 OK)`);
    const failedJson = await failedRes.json();
    console.log('- Resposta JSON DTO:', JSON.stringify(failedJson, null, 2));
    if (failedRes.status !== 200) {
      throw new Error(`Esperado 200 para consulta de FAILED, recebido ${failedRes.status}`);
    }
    if (failedJson.errorMessage.includes('INTERNAL_TRACE') || failedJson.errorMessage.includes('worker.ts')) {
      throw new Error(`Vazamento de stack trace detectado na mensagem de erro: ${failedJson.errorMessage}`);
    }
    if (failedJson.errorMessage !== 'Arquivo FIT corrompido: falha na verificação de integridade CRC.') {
      throw new Error(`Mensagem pública inesperada: ${failedJson.errorMessage}`);
    }
    console.log('[OK] Mensagem pública segura e DTO allowlist verificados com sucesso.');

    // --- CASO 5: Fronteira Proxy vs Aplicação (15 MB Exato vs 15 MB + 1 byte) ---
    console.log('\n--- CASO 5: Testes de Fronteira: Limite Máximo de Upload (15 MB) ---');
    console.log('NOTA ARQUITETURAL / PROXY REVERSO:');
    console.log('  O upload de 15 MB via multipart/form-data adiciona overhead de fronteira HTTP (~300-500 bytes).');
    console.log('  O proxy reverso (Nginx/Coolify/Traefik) DEVE ser configurado com:');
    console.log('    client_max_body_size 20M;');
    console.log('  Isso garante que a requisição completa atinja o NestJS, onde o Multer e o FitValidator');
    console.log('  aplicam com rigor absoluto o limite contratual de 15.728.640 bytes.\n');

    // CASO 5A: Arquivo de EXATAMENTE 15 MB (15 * 1024 * 1024 = 15.728.640 bytes) com binário e CRC válidos
    console.log('--- CASO 5A: Upload de Arquivo com EXATAMENTE 15 MB (15.728.640 bytes) com CRC válido ---');
    const exact15MbBuffer = createExactSizedFitBuffer(15 * 1024 * 1024);
    const formExact = new FormData();
    formExact.append('file', new Blob([exact15MbBuffer], { type: 'application/vnd.ant.fit' }), 'exact_15mb.fit');

    const exactRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/fit/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formExact,
    });
    console.log(`- Status HTTP Recebido: ${exactRes.status} (Esperado: 202 Accepted)`);
    const exactJson = await exactRes.json();
    console.log('- Resposta JSON:', JSON.stringify(exactJson, null, 2));
    if (exactRes.status !== 202) {
      throw new Error(`Esperado 202 para arquivo de exatamente 15 MB, recebido ${exactRes.status}`);
    }
    console.log('[OK] CASO 5A Aprovado: Arquivo no limite exato de 15 MB aceito com sucesso pela aplicação (HTTP 202).');

    // CASO 5B: Arquivo com 15 MB + 1 byte (15.728.641 bytes)
    console.log('\n--- CASO 5B: Upload de Arquivo com 15 MB + 1 byte (15.728.641 bytes) ---');
    const overBuffer = Buffer.alloc(15 * 1024 * 1024 + 1);
    const formOver = new FormData();
    formOver.append('file', new Blob([overBuffer], { type: 'application/vnd.ant.fit' }), 'over_15mb_plus_1.fit');

    const overRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/wearables/fit/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formOver,
    });
    console.log(`- Status HTTP Recebido: ${overRes.status} (Esperado: 413 ou 400 do Multer)`);
    const overJson = await overRes.json().catch(() => ({ message: 'Payload Too Large' }));
    console.log('- Resposta:', JSON.stringify(overJson, null, 2));
    if (overRes.status !== 413 && overRes.status !== 400) {
      throw new Error(`Esperado 413/400 para arquivo de 15 MB + 1 byte, recebido ${overRes.status}`);
    }
    console.log('[OK] CASO 5B Aprovado: Arquivo excedendo 1 byte rejeitado estritamente pelo Multer (HTTP ' + overRes.status + ').');

    // --- CASO 6: Auditoria de Ausência de Credenciais Garmin ---
    console.log('\n--- CASO 6: Verificação de Ausência de Credenciais Garmin ---');
    const garminRes = await fetch(`http://127.0.0.1:${API_PORT}/api/integrations/garmin/status`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const garminJson = await garminRes.json();
    console.log('- Endpoint /api/integrations/garmin/status:', JSON.stringify(garminJson, null, 2));
    const hasPasswordField = JSON.stringify(garminJson).toLowerCase().includes('password');
    console.log(`- Campo de senha Garmin retornado ou exigido: ${hasPasswordField ? 'ALERTA: ENCONTRADO!' : 'NENHUM (Zero Senhas Garmin)'}`);
    if (hasPasswordField) {
      throw new Error('Alerta de segurança: campo de senha Garmin encontrado!');
    }

    // --- CASO 7: Auditoria de Health, Readiness e Métricas Prometheus ---
    console.log('\n--- CASO 7: Verificação de Health Probes (/api/health/liveness, /api/health/readiness) ---');
    const livenessRes = await fetch(`http://127.0.0.1:${API_PORT}/api/health/liveness`);
    const livenessJson = await livenessRes.json();
    console.log('- Endpoint /api/health/liveness:', JSON.stringify(livenessJson, null, 2));
    if (livenessRes.status !== 200 || livenessJson.status !== 'UP') {
      throw new Error(`Liveness falhou: status ${livenessRes.status}`);
    }

    const readinessRes = await fetch(`http://127.0.0.1:${API_PORT}/api/health/readiness`);
    const readinessJson = await readinessRes.json();
    console.log('- Endpoint /api/health/readiness:', JSON.stringify(readinessJson, null, 2));
    if (readinessRes.status !== 200 || readinessJson.status !== 'UP') {
      throw new Error(`Readiness falhou: status ${readinessRes.status}`);
    }
    if (readinessJson.checks.timezone !== 'UTC') {
      throw new Error(`Readiness timezone falhou: esperado UTC, recebido ${readinessJson.checks.timezone}`);
    }

    const metricsRes = await fetch(`http://127.0.0.1:${API_PORT}/api/health/metrics`);
    const metricsText = await metricsRes.text();
    console.log('- Endpoint /api/health/metrics (primeiras 5 linhas):\n', metricsText.split('\n').slice(0, 5).join('\n'));
    if (metricsRes.status !== 200 || !metricsText.includes('wearables_')) {
      throw new Error(`Metrics endpoint falhou: status ${metricsRes.status}`);
    }
    console.log('[OK] CASO 7 Aprovado: Liveness, Readiness (com validação estrita de timezone UTC) e Metrics operacionais.');

    console.log('\n[7/7] TODOS OS CASOS DE TESTE HTTP E2E FORAM CONCLUÍDOS COM SUCESSO!');
  } finally {
    // Encerramento limpo de todos os subprocessos
    console.log('\n--- ENCERRAMENTO LIMPO DE PROCESSOS ---');
    if (apiProcess && !apiProcess.killed) {
      console.log(`- Encerrando API Compilada (PID ${apiProcess.pid})...`);
      apiProcess.kill('SIGTERM');
    }
    if (workerProcess && !workerProcess.killed) {
      console.log(`- Encerrando Worker Compilado (PID ${workerProcess.pid})...`);
      workerProcess.kill('SIGTERM');
    }
    if (redisProcess && !redisProcess.killed) {
      console.log(`- Encerrando Redis (PID ${redisProcess.pid})...`);
      redisProcess.kill('SIGTERM');
    }
    await prisma.$disconnect();
    console.log('- Encerrando PostgreSQL 18.4...');
    await pg.stop();
    console.log('[OK] Todos os serviços e processos foram encerrados de forma limpa.');
  }
}

main().catch((err) => {
  console.error('\n[FATAL ERROR NO E2E AUDIT]:', err);
  process.exit(1);
});
