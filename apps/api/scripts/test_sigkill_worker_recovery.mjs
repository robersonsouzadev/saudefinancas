import pg from 'pg';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Queue } from 'bullmq';

const { Client } = pg;

/**
 * TESTE FACTUAL DE RESILIÊNCIA A SIGKILL, REINICIALIZAÇÃO E RECUPERAÇÃO DO WORKER (G4.2)
 * 
 * Executa o teste de resiliência estrito com:
 * 1. Payload de arquivo FIT sintético válido (synthetic_running.fit);
 * 2. Ingestão e enfileiramento real no BullMQ com jobId determinístico (<fileId>-dispatch-0);
 * 3. Confirmação de job ativo em processamento (status=PROCESSING);
 * 4. Inspeção detalhada pré-SIGKILL (PID, StartedAt, RestartCount, Id, Running);
 * 5. Disparo de SIGKILL durante o processamento ativo (falha fatal se docker kill falhar);
 * 6. Inspeção detalhada pós-SIGKILL comprovando que o novo processo Node é diferente do anterior;
 * 7. Separação explícita entre:
 *    - Cenário A: Expiração natural do lease (aguarda ~60s sem manipulação de banco);
 *    - Cenário B: Teste acelerado com lease manipulado (identificado expressamente como acelerado);
 * 8. Recuperação pelo OutboxReconciliationService com status PENDING e recoverySequence incrementado;
 * 9. Conclusão pelo worker reiniciado com status PROCESSED;
 * 10. Auditoria de integridade do schema via relacionamento real ActivitySource.importedFileId:
 *     - Exatamente 1 WorkoutActivity associada;
 *     - Exatamente 1 ActivitySource por sessionIndex;
 *     - Ausência de laps duplicados (WorkoutLap);
 *     - Ausência de telemetria duplicada (WorkoutTelemetry);
 * 11. Encerramento seguro via process.exitCode, garantindo execução de finally assíncrono.
 */

async function main() {
  console.log('================================================================================');
  console.log('    TESTE DE RESILIÊNCIA A SIGKILL COM PAYLOAD FIT VÁLIDO — VITA SAÚDE (G4.2)   ');
  console.log('================================================================================\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[ERRO DE CONFIGURAÇÃO]: Variável DATABASE_URL é estritamente obrigatória.');
    process.exitCode = 1;
    return;
  }

  const workerContainer = process.env.STAGING_WORKER_CONTAINER || 'sf-worker-staging';
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6381', 10);
  const queueName = process.env.QUEUE_NAME || 'wearables-fit-import-staging';
  const queuePrefix = process.env.QUEUE_PREFIX || 'bull_staging';
  const storageBasePath = process.env.STORAGE_PATH || '/data/vita-saude-staging/wearables';

  // Seleção de Cenário: A (Expiração Natural) ou B (Acelerado)
  const isNaturalLease = process.argv.includes('--natural-lease') || process.argv.includes('--scenario=A');
  const scenarioLabel = isNaturalLease
    ? 'CENÁRIO A: Prova de Expiração Natural de Lease (~60s)'
    : 'CENÁRIO B: Teste Acelerado com Lease Manipulado (NÃO é prova de expiração natural)';

  console.log(`[Modo de Execução]: ${scenarioLabel}\n`);

  // 1. Carregamento do binário FIT sintético válido
  const candidateFixturePaths = [
    path.resolve('apps/api/test/fixtures/synthetic_running.fit'),
    path.resolve('test/fixtures/synthetic_running.fit'),
    path.resolve(process.cwd(), 'apps/api/test/fixtures/synthetic_running.fit'),
  ];
  const fixturePath = candidateFixturePaths.find((p) => fs.existsSync(p));

  if (!fixturePath) {
    console.error(`[ERRO]: Fixture FIT sintético não encontrado nos caminhos pesquisados.`);
    process.exitCode = 1;
    return;
  }

  const fitBuffer = fs.readFileSync(fixturePath);
  const fileSha256 = crypto.createHash('sha256').update(fitBuffer).digest('hex');
  const fileSizeBytes = fitBuffer.length;

  console.log(`[Passo 1] Fixture FIT sintético carregado: ${fileSizeBytes} bytes, SHA-256=${fileSha256}`);
  console.log(`- Origem: ${fixturePath}`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const queue = new Queue(queueName, {
    connection: { host: redisHost, port: redisPort },
    prefix: queuePrefix,
  });

  try {
    // 2. Setup de Usuário e Armazenamento do Arquivo
    const userId = crypto.randomUUID();
    const fileId = crypto.randomUUID();
    const userDir = path.join(storageBasePath, 'users', userId, '2026', '09');
    fs.mkdirSync(userDir, { recursive: true, mode: 0o700 });

    const storageKey = `users/${userId}/2026/09/sigkill_test_${Date.now()}.fit`;
    const fullStoragePath = path.join(storageBasePath, storageKey);
    fs.writeFileSync(fullStoragePath, fitBuffer, { mode: 0o600 });
    console.log(`[Passo 2] Arquivo gravado no storage LOCAL_SECURE: ${fullStoragePath}`);

    // Criação do usuário sintético no PostgreSQL
    await client.query(`
      INSERT INTO "User" (id, email, name, timezone, "updatedAt")
      VALUES ($1, $2, 'SIGKILL Tester', 'America/Campo_Grande', timezone('UTC', NOW()))
      ON CONFLICT (id) DO NOTHING;
    `, [userId, `sigkill_tester_${Date.now()}@vitasaude.local`]);

    // Inserção do ImportedFile como PENDING
    await client.query(`
      INSERT INTO "ImportedFile" (
        id, "userId", "storageKey", "fileSha256", "originalFileName",
        "fileSizeBytes", status, "recoverySequence", "retryCount", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'synthetic_running.fit',
        $5, 'PENDING', 0, 0, timezone('UTC', NOW())
      );
    `, [fileId, userId, storageKey, fileSha256, fileSizeBytes]);

    console.log(`[Passo 2 Concluído]: Registro criado com status=PENDING (ID: ${fileId}).`);

    // 3. Enfileiramento do Job Real no BullMQ com JobId permitido (sem ':')
    const jobId = `${fileId}-dispatch-0`;
    await queue.add('process-fit', { importId: fileId, sequence: 0 }, { jobId });
    console.log(`[Passo 3] Job enfileirado no BullMQ com jobId=${jobId}. Aguardando worker claim...`);

    // 4. Aguardar o Worker capturar o Job e transicionar para PROCESSING
    let jobStarted = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const res = await client.query(`
        SELECT status, "leaseOwner", "leaseVersion" 
        FROM "ImportedFile" 
        WHERE id = $1
      `, [fileId]);

      if (res.rows[0]?.status === 'PROCESSING') {
        jobStarted = true;
        console.log(`[Passo 4] Worker capturou o job! Status=PROCESSING, leaseOwner=${res.rows[0].leaseOwner}, leaseVersion=${res.rows[0].leaseVersion}`);
        break;
      }
    }

    if (!jobStarted) {
      throw new Error('Timeout aguardando worker entrar em status PROCESSING.');
    }

    // 5. Inspeção Pré-SIGKILL do Container
    console.log(`\n[Passo 5] Inspecionando estado pré-SIGKILL do container: ${workerContainer}...`);
    let preInspect;
    try {
      const inspectRaw = execSync(`docker inspect ${workerContainer}`, { encoding: 'utf8' });
      const parsed = JSON.parse(inspectRaw);
      preInspect = parsed[0];
    } catch (inspectErr) {
      throw new Error(`Falha fatal ao executar docker inspect pré-SIGKILL: ${inspectErr.message}`);
    }

    const prePid = preInspect?.State?.Pid;
    const preStartedAt = preInspect?.State?.StartedAt;
    const preRestartCount = preInspect?.RestartCount;
    const preContainerId = preInspect?.Id;
    const preRunning = preInspect?.State?.Running;

    console.log(`- Container ID:     ${preContainerId}`);
    console.log(`- Node PID (Host):  ${prePid}`);
    console.log(`- StartedAt:        ${preStartedAt}`);
    console.log(`- RestartCount:     ${preRestartCount}`);
    console.log(`- Running Status:   ${preRunning}`);

    if (!preRunning) {
      throw new Error(`Container ${workerContainer} não estava em execução antes do teste.`);
    }

    // 6. Disparo de SIGKILL durante o processamento ativo
    console.log(`\n[Passo 6] Disparando SIGKILL contra o container: ${workerContainer}...`);
    try {
      execSync(`docker kill --signal=SIGKILL ${workerContainer}`, { stdio: 'pipe' });
      console.log(`[Passo 6 Concluído]: SIGKILL enviado com sucesso.`);
    } catch (killErr) {
      throw new Error(`Falha fatal ao executar docker kill --signal=SIGKILL: ${killErr.message}`);
    }

    // 7. Inspeção Pós-SIGKILL e Comprovação de Reinicialização com Novo Processo
    console.log('\n[Passo 7] Comprovando reinicialização do container e alteração de PID/StartedAt...');
    let postInspect = null;
    let postRunning = false;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const inspectRaw = execSync(`docker inspect ${workerContainer}`, { encoding: 'utf8' });
        const parsed = JSON.parse(inspectRaw);
        postInspect = parsed[0];
        if (postInspect?.State?.Running === true && postInspect?.State?.Pid !== prePid) {
          postRunning = true;
          break;
        }
      } catch {}
    }

    if (!postInspect || !postRunning) {
      throw new Error(`Container ${workerContainer} não reiniciou ou não retornou com novo PID.`);
    }

    const postPid = postInspect.State.Pid;
    const postStartedAt = postInspect.State.StartedAt;
    const postRestartCount = postInspect.RestartCount;
    const postContainerId = postInspect.Id;

    console.log(`- Container ID Pós:     ${postContainerId}`);
    console.log(`- Novo Node PID (Host): ${postPid} (Anterior: ${prePid})`);
    console.log(`- Novo StartedAt:       ${postStartedAt} (Anterior: ${preStartedAt})`);
    console.log(`- Novo RestartCount:    ${postRestartCount} (Anterior: ${preRestartCount})`);

    // Prova factual de que o processo posterior é diferente do anterior
    if (postPid === prePid && postStartedAt === preStartedAt) {
      throw new Error(`PROVA FALHOU: O processo após o SIGKILL possui o mesmo PID (${postPid}) e StartedAt (${postStartedAt}). Reinício não comprovado.`);
    }
    console.log(`[Passo 7 Concluído]: Prova confirmada — Novo processo Node instanciado (PID ${prePid} -> ${postPid}).`);

    // 8. Tratamento do Lease por Cenário
    if (isNaturalLease) {
      console.log('\n[Passo 8 - Cenário A]: Aguardando expiração natural do lease (60s)...');
      console.log('NENHUM update no banco de dados será executado. Aguardando tempo decorrer...');
      for (let s = 1; s <= 65; s += 5) {
        await new Promise((r) => setTimeout(r, 5000));
        process.stdout.write(`... ${s}s decorridos\n`);
      }
    } else {
      console.log('\n[Passo 8 - Cenário B]: Simulando passagem de tempo via manipulação acelerada de leaseExpiresAt...');
      console.log('AVISO: Cenário B acelera o teste para ambiente de desenvolvimento e NÃO constitui prova de expiração natural.');
      await client.query(`
        UPDATE "ImportedFile"
        SET "leaseExpiresAt" = timezone('UTC', NOW()) - INTERVAL '5 seconds'
        WHERE id = $1 AND status = 'PROCESSING';
      `, [fileId]);
    }

    // 9. Aguardar Reconciliação do Outbox e Processamento Final
    console.log('\n[Passo 9] Aguardando recuperação pelo Reconciliador e processamento final...');
    let processedSuccess = false;
    let finalRow = null;

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const checkRes = await client.query(`
        SELECT status, "recoverySequence", "retryCount", "processedAt", "createdAt"
        FROM "ImportedFile"
        WHERE id = $1
      `, [fileId]);

      finalRow = checkRes.rows[0];
      if (finalRow?.status === 'PROCESSED') {
        processedSuccess = true;
        console.log(`[Passo 9 Concluído]: Arquivo finalizado com status PROCESSED! (recoverySequence=${finalRow.recoverySequence})`);
        break;
      }
    }

    if (!processedSuccess) {
      throw new Error(`Falha na recuperação: Arquivo não atingiu status PROCESSED. Status atual: ${finalRow?.status}`);
    }

    // 10. Auditoria de Integridade do Schema via Relacionamento Real
    console.log('\n[Passo 10] Auditando integridade do schema via ActivitySource.importedFileId...');

    // Invariante de recuperação: recoverySequence deve ser >= 1
    if (finalRow.recoverySequence < 1) {
      throw new Error(`recoverySequence esperado >= 1, mas retornou: ${finalRow.recoverySequence}`);
    }

    // Invariante temporal: processedAt >= createdAt
    if (new Date(finalRow.processedAt) < new Date(finalRow.createdAt)) {
      throw new Error(`Invariante temporal violada: processedAt (${finalRow.processedAt}) < createdAt (${finalRow.createdAt})`);
    }

    // 10a. Validação de WorkoutActivity via JOIN com ActivitySource
    const activitiesRes = await client.query(`
      SELECT wa.id, wa."sportCategory", wa."startedAt", wa."finishedAt", wa."durationSeconds"
      FROM "WorkoutActivity" wa
      INNER JOIN "ActivitySource" src ON src."activityId" = wa.id
      WHERE src."importedFileId" = $1;
    `, [fileId]);

    console.log(`- WorkoutActivity encontradas associadas ao arquivo: ${activitiesRes.rows.length}`);
    if (activitiesRes.rows.length !== 1) {
      throw new Error(`ERRO DE DUPLICAÇÃO: Esperada exatamente 1 WorkoutActivity, mas foram encontradas: ${activitiesRes.rows.length}`);
    }
    const activity = activitiesRes.rows[0];
    console.log(`  -> Atividade ID: ${activity.id}, Categoria: ${activity.sportCategory}, Duração: ${activity.durationSeconds}s`);

    // 10b. Validação de ActivitySource: exatamente 1 por sessionIndex
    const sourcesRes = await client.query(`
      SELECT id, "sessionIndex", provider, "sourceType"
      FROM "ActivitySource"
      WHERE "importedFileId" = $1;
    `, [fileId]);

    console.log(`- ActivitySource encontradas: ${sourcesRes.rows.length}`);
    if (sourcesRes.rows.length !== 1) {
      throw new Error(`ERRO DE FONTES: Esperada exatamente 1 ActivitySource por sessionIndex, mas foram encontradas: ${sourcesRes.rows.length}`);
    }
    console.log(`  -> Source ID: ${sourcesRes.rows[0].id}, sessionIndex: ${sourcesRes.rows[0].sessionIndex}, Provider: ${sourcesRes.rows[0].provider}`);

    // 10c. Validação de Laps sem duplicidade
    const lapsRes = await client.query(`
      SELECT id, "lapIndex"
      FROM "WorkoutLap"
      WHERE "activityId" = $1;
    `, [activity.id]);

    const lapIndices = lapsRes.rows.map((r) => r.lapIndex);
    const uniqueLapIndices = new Set(lapIndices);
    console.log(`- Laps persistidos: ${lapsRes.rows.length} (Índices únicos: ${uniqueLapIndices.size})`);
    if (lapIndices.length !== uniqueLapIndices.size) {
      throw new Error(`ERRO DE DUPLICAÇÃO: Foram detectados laps duplicados para a atividade ${activity.id}`);
    }

    // 10d. Validação de Telemetria sem duplicidade
    const telemetryRes = await client.query(`
      SELECT id, "activityId"
      FROM "WorkoutTelemetry"
      WHERE "activityId" = $1;
    `, [activity.id]);

    console.log(`- Registros de Telemetria encontrados: ${telemetryRes.rows.length}`);
    if (telemetryRes.rows.length > 1) {
      throw new Error(`ERRO DE DUPLICAÇÃO: Mais de 1 registro de telemetria associado à atividade ${activity.id}`);
    }

    console.log('\n================================================================================');
    console.log(' [SUCESSO FACTUAL]: RESILIÊNCIA A SIGKILL E RECUPERAÇÃO HOMOLOGADAS COM SUCESSO!');
    console.log(` - Modo: ${scenarioLabel}`);
    console.log(' - Job processado ativamente');
    console.log(` - SIGKILL emitido com reinicialização comprovada (PID ${prePid} -> ${postPid})`);
    console.log(' - Reconciliação atômica para PENDING com recoverySequence incrementado');
    console.log(' - Processamento final PROCESSED do binário FIT válido');
    console.log(' - Exatamente 1 WorkoutActivity associada via ActivitySource (ZERO DUPLICATAS)');
    console.log(' - Zero laps e zero telemetrias duplicados');
    console.log('================================================================================');
    process.exitCode = 0;
  } catch (err) {
    console.error(`\n[FATAL ERROR NO TESTE DE SIGKILL]: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await queue.close().catch(() => {});
    await client.end().catch(() => {});
  }
}

main();

