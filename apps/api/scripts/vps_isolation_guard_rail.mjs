#!/usr/bin/env node

/**
 * GUARD RAIL AUTOMÁTICO DE PROTEÇÃO DE PRODUÇÃO E ISOLAMENTO (G4.2 V5)
 * 
 * Opera em três fases mutuamente exclusivas:
 * 1. --phase=pre-provisioning: Validação estática, somente leitura, de configuração,
 *    variáveis de ambiente obrigatórias, portas proibidas e caminhos locais antes de provisionar staging.
 *    Exige: NODE_ENV, APP_ENV, STORAGE_PATH, QUEUE_NAME, QUEUE_PREFIX, STAGING_COMPOSE_PROJECT, STAGING_NETWORK.
 * 2. --phase=post-provisioning: Validação rigorosa de runtime com contêineres ativos.
 *    Exige OBRIGATORIAMENTE os 4 contêineres de staging no estado Running:
 *    - sf-db-staging: porta exata 127.0.0.1:5434 -> 5432
 *    - sf-redis-staging: porta exata 127.0.0.1:6381 -> 6379
 *    - sf-api-staging: porta exata 127.0.0.1:3011 -> 3001
 *    - sf-worker-staging: SEM porta publicada
 *    Exige estritamente: database = vita_saude_staging e user = vita_staging_app (rejeita _test).
 *    Compara IDs físicos e mounts dos 4 containers de produção factuais.
 * 3. --phase=migration: Execução de migração DDL.
 *    Exige: database = vita_saude_staging e user = vita_staging_migrator.
 * 
 * Qualquer outro valor de --phase produz Exit Code diferente de zero.
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

const EXPECTED_STAGING_PORTS = {
  'sf-api-staging': { containerPort: '3001/tcp', hostIp: '127.0.0.1', hostPort: '3011' },
  'sf-db-staging': { containerPort: '5432/tcp', hostIp: '127.0.0.1', hostPort: '5434' },
  'sf-redis-staging': { containerPort: '6379/tcp', hostIp: '127.0.0.1', hostPort: '6381' },
  'sf-worker-staging': null, // Sem porta publicada!
};

function pingRedis(host, port, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });

    socket.on('data', (data) => {
      const resp = data.toString();
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
  const phase = phaseArg ? phaseArg.split('=')[1] : null;

  const validPhases = ['pre-provisioning', 'post-provisioning', 'migration'];
  if (!phase || !validPhases.includes(phase)) {
    console.error(`[ERRO FATAL DE FASE]: Argumento --phase é obrigatório e deve ser um dos seguintes: ${validPhases.join(', ')}. Recebido: "${phase || '(nenhum)'}"`);
    process.exitCode = 1;
    return;
  }

  const isPre = phase === 'pre-provisioning';
  const isPost = phase === 'post-provisioning';
  const isMigration = phase === 'migration';

  console.log('================================================================================');
  console.log(` GUARD RAIL DE ISOLAMENTO VPS — VITA SAÚDE (G4.2 V5) [FASE: ${phase.toUpperCase()}] `);
  console.log('================================================================================\n');

  const errors = [];
  const warnings = [];
  const allowOffline = process.argv.includes('--allow-offline');

  let dbClient = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Verificação de Variáveis de Ambiente Obrigatórias
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

    if (isPre) {
      const requiredPreVars = [
        'NODE_ENV',
        'APP_ENV',
        'STORAGE_PATH',
        'QUEUE_NAME',
        'QUEUE_PREFIX',
        'STAGING_COMPOSE_PROJECT',
        'STAGING_NETWORK',
      ];
      for (const v of requiredPreVars) {
        if (!process.env[v]) {
          errors.push(`Variável de pré-provisionamento obrigatória ausente: ${v}`);
        } else {
          console.log(`  - ${v}: "${process.env[v]}"`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. Verificação de URL e Nome do Banco de Dados
    // -------------------------------------------------------------------------
    const dbUrl = process.env.DATABASE_URL || '';
    console.log(`[Check 2] DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : '(ausente)'}`);
    if (!dbUrl) {
      if (isPost || isMigration) {
        errors.push(`DATABASE_URL não informada na fase ${phase}.`);
      } else {
        warnings.push('DATABASE_URL não informada na verificação pré-provisionamento.');
      }
    } else {
      try {
        const parsedUrl = new URL(dbUrl);
        const host = parsedUrl.hostname;
        const port = parseInt(parsedUrl.port || '5432', 10);
        const dbName = parsedUrl.pathname.replace(/^\//, '');
        const dbUser = parsedUrl.username;

        console.log(`- Host: ${host}, Porta: ${port}, Banco: "${dbName}", Usuário: "${dbUser}"`);

        if (PRODUCTION_DB_NAMES.includes(dbName)) {
          errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL aponta para banco de produção '${dbName}'!`);
        }
        if (dbName !== 'vita_saude_staging') {
          errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL aponta para banco '${dbName}', esperado estritamente 'vita_saude_staging'.`);
        }
        if (isPost && dbName.includes('_test')) {
          errors.push(`VIOLAÇÃO CRÍTICA: Banco '${dbName}' contém sufixo de teste proibido no pós-provisionamento normal.`);
        }

        if (FORBIDDEN_HOST_PORTS.includes(port) && (host === 'localhost' || host === '127.0.0.1' || host === '72.60.249.235')) {
          errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL utiliza porta de produção ${port}!`);
        }
        if (host === '72.60.249.235') {
          errors.push(`VIOLAÇÃO CRÍTICA: Conexão direta ao IP público da VPS sem passar pelo túnel/loopback isolado!`);
        }
        if (dbUser === 'sf_user' || dbUser === 'postgres') {
          errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL utiliza usuário de produção '${dbUser}'!`);
        }

        if (isPost && dbUser !== 'vita_staging_app') {
          errors.push(`VIOLAÇÃO CRÍTICA: Usuário da DATABASE_URL em pós-provisionamento é '${dbUser}', esperado estritamente 'vita_staging_app'.`);
        }
        if (isMigration && dbUser !== 'vita_staging_migrator') {
          errors.push(`VIOLAÇÃO CRÍTICA: Usuário da DATABASE_URL na fase de migration é '${dbUser}', esperado estritamente 'vita_staging_migrator'.`);
        }
      } catch (urlErr) {
        errors.push(`DATABASE_URL com formato inválido: ${urlErr.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Verificação de Caminhos de Armazenamento de Arquivos
    // -------------------------------------------------------------------------
    const storagePath = process.env.STORAGE_PATH || '';
    console.log(`\n[Check 3] STORAGE_PATH: "${storagePath}"`);
    if (!storagePath) {
      errors.push('STORAGE_PATH não configurado.');
    } else {
      const resolvedStorage = path.resolve(storagePath);
      for (const prodPath of PRODUCTION_PATHS) {
        if (resolvedStorage.startsWith(prodPath)) {
          errors.push(`VIOLAÇÃO CRÍTICA: STORAGE_PATH ('${resolvedStorage}') coincide ou é subdiretório de produção ('${prodPath}')!`);
        }
      }
      if (!resolvedStorage.includes('staging') && !resolvedStorage.includes('test')) {
        errors.push(`STORAGE_PATH ('${resolvedStorage}') não contém a palavra 'staging' ou 'test' para garantir isolamento.`);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Verificação de Filas e Prefixos Redis/BullMQ
    // -------------------------------------------------------------------------
    const queueName = process.env.QUEUE_NAME || '';
    const queuePrefix = process.env.QUEUE_PREFIX || '';
    console.log(`\n[Check 4] QUEUE_NAME: "${queueName}", QUEUE_PREFIX: "${queuePrefix}"`);
    if (!queueName.includes('staging') && !queueName.includes('test')) {
      errors.push(`QUEUE_NAME ('${queueName}') deve conter 'staging' ou 'test'.`);
    }
    if (queueName === 'wearables-fit-import') {
      errors.push(`VIOLAÇÃO CRÍTICA: QUEUE_NAME coincide com a fila de produção 'wearables-fit-import'!`);
    }
    if (!queuePrefix.includes('staging') && !queuePrefix.includes('test')) {
      errors.push(`QUEUE_PREFIX ('${queuePrefix}') deve conter 'staging' ou 'test'.`);
    }
    if (queuePrefix === 'bull') {
      errors.push(`VIOLAÇÃO CRÍTICA: QUEUE_PREFIX coincide com o prefixo padrão de produção 'bull'!`);
    }

    // -------------------------------------------------------------------------
    // 5. Verificação de Domínios e URLs Públicas
    // -------------------------------------------------------------------------
    const publicApiUrl = process.env.PUBLIC_API_URL || '';
    console.log(`\n[Check 5] PUBLIC_API_URL: "${publicApiUrl}"`);
    for (const prodDomain of PRODUCTION_DOMAINS) {
      if (publicApiUrl.includes(prodDomain)) {
        errors.push(`VIOLAÇÃO CRÍTICA: PUBLIC_API_URL ('${publicApiUrl}') aponta para domínio de produção '${prodDomain}'!`);
      }
    }

    // -------------------------------------------------------------------------
    // 6. Verificação de Portas Vinculadas (Bind em 127.0.0.1 estrito)
    // -------------------------------------------------------------------------
    console.log('\n[Check 6] Verificando portas proibidas de produção...');
    for (const forbiddenPort of FORBIDDEN_HOST_PORTS) {
      if (publicApiUrl.includes(`:${forbiddenPort}`)) {
        errors.push(`PUBLIC_API_URL utiliza porta de produção ${forbiddenPort}!`);
      }
    }

    // -------------------------------------------------------------------------
    // 7. Inspeção do Docker Engine e Comparação Física de Volumes e Redes
    // -------------------------------------------------------------------------
    console.log('\n[Check 7] Inspecionando Docker Engine, Volumes Físicos e Redes...');
    const stagingContainers = ['sf-db-staging', 'sf-redis-staging', 'sf-api-staging', 'sf-worker-staging'];
    const expectedProject = process.env.STAGING_COMPOSE_PROJECT || 'vita_staging';
    const expectedNet = process.env.STAGING_NETWORK || 'vita_staging_net';

    let dockerAvailable = false;
    let foundStagingRunning = [];
    const prodVolumeIdentifiers = new Set();

    try {
      // Coletar volumes físicos e mounts dos 4 containers factuais de produção
      for (const prodC of PRODUCTION_CONTAINERS) {
        try {
          const prodInspectRaw = execSync(`docker inspect ${prodC}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
          const [prodData] = JSON.parse(prodInspectRaw.trim() || '[]');
          if (prodData?.Mounts) {
            for (const m of prodData.Mounts) {
              if (m.Name) prodVolumeIdentifiers.add(m.Name);
              if (m.Source) prodVolumeIdentifiers.add(m.Source);
            }
          }
        } catch {}
      }

      console.log(`- Identificadores de volumes/mounts físicos de produção rastreados: ${prodVolumeIdentifiers.size}`);

      const dockerPsRaw = execSync("docker ps --format '{{.ID}}|{{.Names}}|{{.Labels}}|{{.State}}|{{.Ports}}|{{.Networks}}'", {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      dockerAvailable = true;

      const lines = dockerPsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      console.log(`- Containers Docker ativos no host: ${lines.length}`);

      for (const line of lines) {
        const [id, name, labels, state, ports, networks] = line.split('|');

        if (stagingContainers.includes(name)) {
          if (state && state.toLowerCase().includes('running')) {
            foundStagingRunning.push(name);
          }

          console.log(`\n  Inspecionando container de staging: [${name}] (ID: ${id}, State: ${state})`);

          // 7a. Projeto Docker Compose
          if (!labels.includes(`com.docker.compose.project=${expectedProject}`)) {
            errors.push(`Container '${name}' não possui label 'com.docker.compose.project=${expectedProject}'. Labels: ${labels}`);
          }

          // 7b. Redes Autorizadas (Exclusivamente expectedNet)
          const activeNetworks = networks.split(',').map((n) => n.trim()).filter(Boolean);
          for (const netName of activeNetworks) {
            if (netName !== expectedNet && netName !== `${expectedProject}_default`) {
              errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' conectado à rede não autorizada '${netName}' (esperado apenas '${expectedNet}')!`);
            }
          }

          // 7c. Inspeção estruturada de Portas e Mounts via docker inspect JSON
          try {
            const inspectRaw = execSync(`docker inspect ${id}`, { encoding: 'utf8' });
            const [inspectData] = JSON.parse(inspectRaw.trim() || '[]');

            // Comparação física estrita de Mounts com os volumes de produção
            const mounts = inspectData?.Mounts || [];
            for (const m of mounts) {
              const src = m.Source || '';
              const mName = m.Name || '';
              console.log(`    - Mount: ${src} -> ${m.Destination} (${m.Type})`);

              if (mName && prodVolumeIdentifiers.has(mName)) {
                errors.push(`VIOLAÇÃO CRÍTICA DE VOLUME: Container de staging '${name}' compartilha volume físico de produção '${mName}'!`);
              }
              if (src && prodVolumeIdentifiers.has(src)) {
                errors.push(`VIOLAÇÃO CRÍTICA DE VOLUME: Container de staging '${name}' compartilha caminho físico de produção '${src}'!`);
              }

              for (const prodPath of PRODUCTION_PATHS) {
                if (src.startsWith(prodPath)) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container de staging '${name}' monta caminho de produção: '${src}'!`);
                }
              }
            }

            // Verificação rigorosa de portas publicadas
            const portBindings = inspectData?.NetworkSettings?.Ports || {};
            const expectedPortRule = EXPECTED_STAGING_PORTS[name];

            if (expectedPortRule === null) {
              // sf-worker-staging: NÃO pode ter portas publicadas
              for (const [p, binds] of Object.entries(portBindings)) {
                if (Array.isArray(binds) && binds.length > 0) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' publicou portas na máquina hospedeira (${p})! Não deve ter portas publicadas.`);
                }
              }
            } else if (expectedPortRule) {
              const binds = portBindings[expectedPortRule.containerPort];
              if (!Array.isArray(binds) || binds.length === 0) {
                errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' não publicou a porta obrigatória ${expectedPortRule.containerPort}!`);
              } else {
                const b = binds[0];
                if (b.HostIp !== expectedPortRule.hostIp || b.HostPort !== expectedPortRule.hostPort) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' com mapeamento incorreto: ${b.HostIp}:${b.HostPort} (esperado: ${expectedPortRule.hostIp}:${expectedPortRule.hostPort})!`);
                }
              }

              // Rejeita portas adicionais
              for (const [p, binds] of Object.entries(portBindings)) {
                if (p !== expectedPortRule.containerPort && Array.isArray(binds) && binds.length > 0) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container '${name}' possui porta adicional não autorizada publicada: ${p}!`);
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
      if (isPost || isMigration || !allowOffline) {
        if (isPost || isMigration) {
          errors.push(`FALHA CRÍTICA DE RUNTIME: Docker não disponível no host em fase ${phase}: ${dockerErr.message}`);
        } else {
          warnings.push(`Docker não disponível no host local: ${dockerErr.message}`);
        }
      }
    }

    if (isPost || isMigration) {
      if (!dockerAvailable) {
        errors.push(`Fase ${phase} exige Docker Engine operacional no host.`);
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

        if (row.db !== 'vita_saude_staging') {
          errors.push(`VIOLAÇÃO CRÍTICA: current_database() '${row.db}' não é 'vita_saude_staging'!`);
        }
        if (isPost && row.db.includes('_test')) {
          errors.push(`VIOLAÇÃO CRÍTICA: Banco '${row.db}' contém sufixo de teste proibido no pós-provisionamento normal.`);
        }
        if (PRODUCTION_DB_NAMES.includes(row.db)) {
          errors.push(`VIOLAÇÃO CRÍTICA: Conectado diretamente ao banco de produção '${row.db}'!`);
        }

        if (isPost && row.usr !== 'vita_staging_app') {
          errors.push(`VIOLAÇÃO CRÍTICA: current_user '${row.usr}' difere de 'vita_staging_app' no pós-provisionamento normal.`);
        }
        if (isMigration && row.usr !== 'vita_staging_migrator') {
          errors.push(`VIOLAÇÃO CRÍTICA: current_user '${row.usr}' difere de 'vita_staging_migrator' na fase de migration.`);
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
        if (isPost || isMigration) {
          errors.push(`Falha na inspeção de runtime do banco de dados na fase ${phase}: ${dbErr.message}`);
        } else {
          warnings.push(`Banco de dados inacessível em modo pré-provisionamento: ${dbErr.message}`);
        }
      }
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
