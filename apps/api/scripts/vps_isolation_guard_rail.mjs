#!/usr/bin/env node

/**
 * GUARD RAIL AUTOMÁTICO DE PROTEÇÃO DE PRODUÇÃO E ISOLAMENTO (G4.2)
 * 
 * Opera em duas fases mutuamente exclusivas:
 * 1. --phase=pre-provisioning: Validação estática, somente leitura, de configuração,
 *    variáveis de ambiente, portas proibidas e caminhos locais antes de provisionar staging.
 *    Não exige que contêineres de staging ou banco já existam.
 * 2. --phase=post-provisioning: Validação rigorosa de runtime com contêineres ativos.
 *    Exige OBRIGATORIAMENTE os 4 contêineres de staging no estado Running:
 *    - sf-db-staging
 *    - sf-redis-staging
 *    - sf-api-staging
 *    - sf-worker-staging
 *    Falha com Exit Code 1 se qualquer contêiner faltar ou falhar nas regras de isolamento.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import net from 'net';

const { Client } = pg;

const PRODUCTION_CONTAINERS = [
  'sf-api-qo40k8o4g8owcoww0s4sccog-213922545655',
  'sf-web-qo40k8o4g8owcoww0s4sccog-213922581192',
  'sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114',
  'sf-db-qo40k8o4g8owcoww0s4sccog-213922496244',
];

const PRODUCTION_DOMAINS = [
  'app.robersonsouza.com.br',
  'appapi.robersonsouza.com.br',
  '72.60.249.235:3000',
  '72.60.249.235:3001',
];

const PRODUCTION_DB_NAMES = [
  'saudefinancas',
  'postgres',
];

const PRODUCTION_PATHS = [
  '/data/saudefinancas',
  '/var/lib/postgresql/data',
  '/data/coolify',
];

const FORBIDDEN_HOST_PORTS = [3000, 3001, 5432, 6379];

function pingRedis(host, port, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let responded = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });

    socket.on('data', (data) => {
      const resp = data.toString();
      responded = true;
      socket.destroy();
      if (resp.includes('+PONG')) {
        resolve('PONG');
      } else {
        reject(new Error(`Resposta inesperada do Redis: ${resp.trim()}`));
      }
    });

    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms) aguardando PONG do Redis em ${host}:${port}`));
    });

    socket.once('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.connect(port, host);
  });
}

async function runGuardRail() {
  const phaseArg = process.argv.find((a) => a.startsWith('--phase='));
  const phase = phaseArg
    ? phaseArg.split('=')[1]
    : process.argv.includes('--post-provisioning')
    ? 'post-provisioning'
    : 'pre-provisioning';

  const isPost = phase === 'post-provisioning';
  const isPre = !isPost;

  console.log('================================================================================');
  console.log(` GUARD RAIL DE ISOLAMENTO VPS — VITA SAÚDE (G4.2) [FASE: ${phase.toUpperCase()}] `);
  console.log('================================================================================\n');

  const errors = [];
  const warnings = [];

  const isDestructiveRunner = process.argv.includes('--destructive-runner');
  const allowOffline = process.argv.includes('--allow-offline');

  let dbClient = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Verificação de Variáveis de Ambiente Básicas
    // -------------------------------------------------------------------------
    const nodeEnv = process.env.NODE_ENV || '';
    const appEnv = process.env.APP_ENV || '';

    console.log(`[Check 1] NODE_ENV: "${nodeEnv}", APP_ENV: "${appEnv}"`);
    if (nodeEnv !== 'staging' && nodeEnv !== 'test') {
      errors.push(`NODE_ENV deve ser 'staging' ou 'test'. Valor atual: '${nodeEnv}'`);
    }
    if (appEnv !== 'staging') {
      errors.push(`APP_ENV deve ser 'staging'. Valor atual: '${appEnv}'`);
    }

    // -------------------------------------------------------------------------
    // 2. Verificação de URL e Nome do Banco de Dados
    // -------------------------------------------------------------------------
    const dbUrl = process.env.DATABASE_URL || '';
    console.log(`[Check 2] DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : '(ausente)'}`);
    if (!dbUrl) {
      if (isPost) {
        errors.push('DATABASE_URL não informada em modo pós-provisionamento.');
      } else {
        warnings.push('DATABASE_URL não informada na verificação pré-provisionamento.');
      }
    } else {
      try {
        const parsedUrl = new URL(dbUrl);
        const dbName = parsedUrl.pathname.replace(/^\//, '');
        if (!dbName.endsWith('_staging') && !dbName.endsWith('_test')) {
          errors.push(`Nome do banco de dados deve terminar com '_staging' ou '_test'. Detectado: '${dbName}'`);
        }
        if (PRODUCTION_DB_NAMES.includes(dbName)) {
          errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL aponta para o banco de produção '${dbName}'!`);
        }
        const port = parseInt(parsedUrl.port || '5432', 10);
        if (FORBIDDEN_HOST_PORTS.includes(port) && !parsedUrl.hostname.includes('staging') && parsedUrl.hostname !== 'sf-db-staging') {
          errors.push(`VIOLAÇÃO CRÍTICA: Porta do banco (${port}) colide com portas padrão sem host de staging!`);
        }
      } catch (err) {
        errors.push(`DATABASE_URL inválida ou malformada: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Verificação de Fila e Prefixo BullMQ
    // -------------------------------------------------------------------------
    const queueName = process.env.QUEUE_NAME || '';
    const queuePrefix = process.env.QUEUE_PREFIX || '';
    console.log(`[Check 3] Fila BullMQ: "${queueName}", Prefixo: "${queuePrefix}"`);
    if (!queueName || !queueName.toLowerCase().includes('staging')) {
      errors.push(`Nome da fila BullMQ deve conter 'staging'. Valor atual: '${queueName}'`);
    }
    if (!queuePrefix || !queuePrefix.toLowerCase().includes('staging')) {
      errors.push(`Prefixo da fila BullMQ deve conter 'staging'. Valor atual: '${queuePrefix}'`);
    }

    // -------------------------------------------------------------------------
    // 4. Verificação de URLs Públicas e Domínios
    // -------------------------------------------------------------------------
    const publicUrl = process.env.PUBLIC_API_URL || process.env.APP_URL || '';
    console.log(`[Check 4] URL Pública: "${publicUrl}"`);
    for (const prodDomain of PRODUCTION_DOMAINS) {
      if (publicUrl.includes(prodDomain)) {
        errors.push(`VIOLAÇÃO CRÍTICA: URL aponta para domínio de produção: '${prodDomain}'`);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Flag Explícita para Testes Destrutivos
    // -------------------------------------------------------------------------
    const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TESTS;
    console.log(`[Check 5] Flag Destrutiva: isDestructiveRunner=${isDestructiveRunner}, ALLOW_DESTRUCTIVE_TESTS="${allowDestructive}"`);
    if (isDestructiveRunner) {
      if (allowDestructive !== 'true') {
        errors.push(`Para runners destrutivos (--destructive-runner), ALLOW_DESTRUCTIVE_TESTS deve ser explicitamente 'true'.`);
      }
    } else {
      if (allowDestructive === 'true') {
        warnings.push(`ALLOW_DESTRUCTIVE_TESTS está 'true' em contexto de serviço padrão. Deve ser restrita aos runners autorizados.`);
      }
    }

    // -------------------------------------------------------------------------
    // 6. Realpath do Storage e Ausência de Symlinks / Recursos Compartilhados
    // -------------------------------------------------------------------------
    const storagePath = process.env.LOCAL_STORAGE_BASE_PATH || process.env.STORAGE_PATH || '';
    console.log(`[Check 6] STORAGE_PATH: "${storagePath}"`);
    if (!storagePath) {
      errors.push('STORAGE_PATH não configurado.');
    } else {
      if (!storagePath.toLowerCase().includes('staging')) {
        errors.push(`STORAGE_PATH deve conter explicitamente 'staging'. Valor atual: '${storagePath}'`);
      }
      if (storagePath === '/data' || storagePath === '/var/lib' || storagePath === '/' || storagePath === '~') {
        errors.push(`STORAGE_PATH aponta para caminho raiz ou genérico perigoso: '${storagePath}'`);
      }
      for (const prodPath of PRODUCTION_PATHS) {
        if (storagePath.startsWith(prodPath)) {
          errors.push(`VIOLAÇÃO CRÍTICA: STORAGE_PATH compartilha caminho com diretório de produção: '${prodPath}'`);
        }
      }

      if (fs.existsSync(storagePath)) {
        try {
          const resolvedPath = fs.realpathSync(storagePath);
          console.log(`- Storage realpath: "${resolvedPath}"`);
          const lstat = fs.lstatSync(storagePath);
          if (lstat.isSymbolicLink()) {
            errors.push(`VIOLAÇÃO CRÍTICA: STORAGE_PATH é um symlink proibido: '${storagePath}' -> '${resolvedPath}'`);
          }
          for (const prodPath of PRODUCTION_PATHS) {
            if (resolvedPath.startsWith(prodPath)) {
              errors.push(`VIOLAÇÃO CRÍTICA: Realpath do storage resolve para caminho de produção: '${prodPath}'`);
            }
          }
        } catch (pathErr) {
          errors.push(`Falha ao resolver realpath de STORAGE_PATH: ${pathErr.message}`);
        }
      } else {
        if (isPost) {
          errors.push(`STORAGE_PATH '${storagePath}' deve existir no filesystem em modo pós-provisionamento.`);
        } else {
          warnings.push(`STORAGE_PATH '${storagePath}' ainda não existe no filesystem local (aceitável em pré-provisionamento).`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 7. Inspeção Docker (Pre vs Post Provisioning)
    // -------------------------------------------------------------------------
    console.log('\n[Check 7] Inspecionando Docker Engine, Containers, Labels, Mounts e Redes...');
    const stagingContainers = ['sf-db-staging', 'sf-redis-staging', 'sf-api-staging', 'sf-worker-staging'];
    const expectedProject = process.env.STAGING_COMPOSE_PROJECT || 'vita_staging';
    const expectedNet = process.env.STAGING_NETWORK || 'vita_staging_net';

    let dockerAvailable = false;
    let foundStagingRunning = [];

    try {
      const dockerPsRaw = execSync("docker ps --format '{{.ID}}|{{.Names}}|{{.Labels}}|{{.State}}|{{.Ports}}|{{.Networks}}'", {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      dockerAvailable = true;

      const lines = dockerPsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      console.log(`- Containers Docker ativos no host: ${lines.length}`);

      for (const line of lines) {
        const [id, name, labels, state, ports, networks] = line.split('|');

        // Validação de colisão de ID e Nome com produção
        for (const prodName of PRODUCTION_CONTAINERS) {
          if (name === prodName || id.startsWith(prodName)) {
            console.log(`- Container de produção detectado no host: ${name} (ID: ${id}) [Segregação verificada]`);
          }
        }

        if (stagingContainers.includes(name)) {
          if (state && state.toLowerCase().includes('running')) {
            foundStagingRunning.push(name);
          }

          console.log(`\n  Inspecionando container de staging: [${name}] (ID: ${id}, State: ${state})`);

          // 7a. Verificação do Projeto Docker Compose
          if (!labels.includes(`com.docker.compose.project=${expectedProject}`)) {
            errors.push(`Container '${name}' não possui label 'com.docker.compose.project=${expectedProject}'. Labels: ${labels}`);
          }

          // 7b. Verificação de Redes
          if (!networks.includes(expectedNet)) {
            errors.push(`Container '${name}' não conectado à rede '${expectedNet}'. Redes: '${networks}'`);
          }

          // 7c. Inspeção estruturada de Portas e Mounts via docker inspect JSON
          try {
            const inspectRaw = execSync(`docker inspect ${id}`, { encoding: 'utf8' });
            const [inspectData] = JSON.parse(inspectRaw.trim() || '[]');

            // Verificação estruturada de Mounts
            const mounts = inspectData?.Mounts || [];
            for (const m of mounts) {
              const src = m.Source || '';
              console.log(`    - Mount: ${src} -> ${m.Destination} (${m.Type})`);
              for (const prodPath of PRODUCTION_PATHS) {
                if (src.startsWith(prodPath)) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container de staging '${name}' monta caminho de produção: '${src}'!`);
                }
              }
            }

            // Verificação estruturada de Portas (NetworkSettings.Ports)
            const portBindings = inspectData?.NetworkSettings?.Ports || {};
            for (const [containerPort, hostBindings] of Object.entries(portBindings)) {
              if (Array.isArray(hostBindings)) {
                for (const b of hostBindings) {
                  const hostIp = b.HostIp;
                  const hostPort = b.HostPort;
                  console.log(`    - Porta publicada: ${containerPort} -> ${hostIp}:${hostPort}`);
                  if (hostIp !== '127.0.0.1') {
                    errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' publicou porta ${hostPort} em IP não-loopback '${hostIp}' (esperado: 127.0.0.1)!`);
                  }
                }
              }
            }
          } catch (inspectErr) {
            errors.push(`Falha ao inspecionar container '${name}': ${inspectErr.message}`);
          }
        }
      }

      console.log(`- Containers de staging ativos (Running): ${foundStagingRunning.length}/${stagingContainers.length}`);
    } catch (dockerErr) {
      if (isPost || !allowOffline) {
        if (isPost) {
          errors.push(`FALHA CRÍTICA DE RUNTIME: Docker não disponível no host em modo pós-provisionamento: ${dockerErr.message}`);
        } else {
          warnings.push(`Docker não disponível no host local: ${dockerErr.message}`);
        }
      }
    }

    // Exigência estrita em modo PÓS-PROVISIONAMENTO
    if (isPost) {
      if (!dockerAvailable) {
        errors.push('Modo pós-provisionamento exige Docker Engine operacional no host.');
      } else {
        for (const sc of stagingContainers) {
          if (!foundStagingRunning.includes(sc)) {
            errors.push(`Container de staging obrigatório '${sc}' não encontrado ou não está no estado Running!`);
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 8. Consulta Runtime no Banco: current_database(), current_user e Timezone
    // -------------------------------------------------------------------------
    if (dbUrl && !dbUrl.includes('build_dummy')) {
      console.log('\n[Check 8] Conectando ao PostgreSQL para validação de runtime...');
      try {
        dbClient = new Client({ connectionString: dbUrl });
        await dbClient.connect();

        const runtimeRes = await dbClient.query(`
          SELECT current_database() as db,
                 current_user as usr,
                 current_setting('timezone') as tz;
        `);

        const row = runtimeRes.rows[0];
        console.log(`- current_database(): "${row.db}"`);
        console.log(`- current_user:       "${row.usr}"`);
        console.log(`- timezone efetivo:   "${row.tz}"`);

        if (!row.db.endsWith('_staging') && !row.db.endsWith('_test')) {
          errors.push(`VIOLAÇÃO CRÍTICA: current_database() '${row.db}' não termina com _staging ou _test!`);
        }
        if (PRODUCTION_DB_NAMES.includes(row.db)) {
          errors.push(`VIOLAÇÃO CRÍTICA: Conectado diretamente ao banco de produção '${row.db}'!`);
        }
        if (row.usr === 'sf_user' || row.usr === 'postgres') {
          errors.push(`current_user '${row.usr}' é role administrativa de produção! Esperado: vita_staging_app ou vita_staging_migrator.`);
        }
        if (row.tz !== 'UTC') {
          errors.push(`Timezone da sessão do banco de dados é '${row.tz}'. Esperado rigorosamente: 'UTC'.`);
        }

        // Verificação de privilégios restritos
        const privRes = await dbClient.query(`
          SELECT rolsuper, rolcreaterole, rolcreatedb 
          FROM pg_roles 
          WHERE rolname = current_user;
        `);
        const privs = privRes.rows[0];
        if (privs?.rolsuper === true) {
          errors.push(`VIOLAÇÃO DE PRIVILÉGIOS: current_user '${row.usr}' possui flag SUPERUSER ativa!`);
        }
        if (privs?.rolcreaterole === true) {
          errors.push(`VIOLAÇÃO DE PRIVILÉGIOS: current_user '${row.usr}' possui flag CREATEROLE ativa!`);
        }
        if (privs?.rolcreatedb === true) {
          errors.push(`VIOLAÇÃO DE PRIVILÉGIOS: current_user '${row.usr}' possui flag CREATEDB ativa!`);
        }
      } catch (dbErr) {
        if (isPost) {
          errors.push(`Falha na inspeção de runtime do banco de dados em pós-provisionamento: ${dbErr.message}`);
        } else {
          warnings.push(`Banco de dados inacessível em modo pré-provisionamento: ${dbErr.message}`);
        }
      }
    } else if (isPost) {
      errors.push('DATABASE_URL ausente em modo pós-provisionamento.');
    }

    // -------------------------------------------------------------------------
    // 9. Conexão Runtime ao Redis e Resposta PONG (Obrigatória em pós-provisionamento)
    // -------------------------------------------------------------------------
    if (isPost) {
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = parseInt(process.env.REDIS_PORT || '6381', 10);
      console.log(`\n[Check 9] Verificando Redis runtime em ${redisHost}:${redisPort}...`);
      try {
        const pong = await pingRedis(redisHost, redisPort, 3000);
        console.log(`- Redis respondeu: "${pong}" com sucesso.`);
      } catch (redisErr) {
        errors.push(`Falha na conexão ao Redis runtime (${redisHost}:${redisPort}): ${redisErr.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // 10. Relatório Final do Guard Rail
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`         SUMÁRIO FINAL DO GUARD RAIL — FASE ${phase.toUpperCase()}             `);
    console.log('================================================================================');

    if (warnings.length > 0) {
      console.log('ALERTAS REGISTRADOS:');
      warnings.forEach((w) => console.log(`  [!] ${w}`));
    }

    if (errors.length > 0) {
      console.error(`\n[BLOQUEIO DE SEGURANÇA ACIONADO] O ambiente NÃO cumpriu todos os critérios da fase ${phase}:`);
      errors.forEach((e) => console.error(`  [X] ${e}`));
      console.error(`\nExecução bloqueada com Exit Code 1. Nenhuma modificação autorizada.`);
      process.exitCode = 1;
      return;
    }

    console.log(`[SUCESSO FACTUAL] Todos os requisitos da fase ${phase} foram auditados e aprovados.`);
    process.exitCode = 0;
  } catch (fatalErr) {
    console.error(`\n[FATAL ERROR INESPERADO NO GUARD RAIL]: ${fatalErr.message}`);
    process.exitCode = 1;
  } finally {
    if (dbClient) {
      await dbClient.end().catch(() => {});
    }
  }
}

runGuardRail();
