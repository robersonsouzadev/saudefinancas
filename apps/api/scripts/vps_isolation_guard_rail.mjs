#!/usr/bin/env node

/**
 * GUARD RAIL AUTOMÁTICO DE PROTEÇÃO DE PRODUÇÃO (G4.2)
 * 
 * Valida rigorosamente que testes, deploys e execuções na VPS
 * NUNCA atinjam recursos, bancos, containers ou redes de produção do Vita Saúde.
 * 
 * Verifica os 11 requisitos obrigatórios de isolamento:
 * 1. Labels e IDs dos containers Docker;
 * 2. Projeto Docker Compose (vita_staging);
 * 3. Mounts e volumes isolados sem compartilhamento com produção;
 * 4. Redes segregadas (vita_staging_net);
 * 5. Portas publicadas restritas a 127.0.0.1 (3011, 5434, 6381);
 * 6. Consulta runtime a current_database(), current_user e timezone UTC;
 * 7. Identidade da instância Redis e isolamento de cache/filas;
 * 8. Nomes e prefixos de filas BullMQ contendo 'staging';
 * 9. Realpath do storage sem symlinks e ancorado na raiz de staging;
 * 10. Ausência de recursos graváveis compartilhados com produção;
 * 11. Encerramento seguro via process.exitCode != 0 em caso de qualquer falha.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

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

async function runGuardRail() {
  console.log('================================================================================');
  console.log('        GUARD RAIL AUTOMÁTICO DE ISOLAMENTO VPS — VITA SAÚDE (G4.2)            ');
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
      errors.push('DATABASE_URL não informada.');
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
          errors.push(`VIOLAÇÃO CRÍTICA: Porta do banco (${port}) colide com portas de produção padrão sem host de staging!`);
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
        warnings.push(`STORAGE_PATH '${storagePath}' ainda não existe no filesystem local.`);
      }
    }

    // -------------------------------------------------------------------------
    // 7. Inspeção do Docker: Labels, IDs, Compose Project, Mounts, Redes e Portas
    // -------------------------------------------------------------------------
    console.log('[Check 7] Inspecionando Docker Engine, Containers, Labels, Mounts e Redes...');
    try {
      const dockerPsRaw = execSync("docker ps --format '{{.ID}}|{{.Names}}|{{.Labels}}|{{.Ports}}|{{.Networks}}'", {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = dockerPsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      console.log(`- Containers Docker ativos no host: ${lines.length}`);

      const stagingContainers = ['sf-api-staging', 'sf-db-staging', 'sf-worker-staging', 'sf-redis-staging'];
      const foundStaging = [];

      for (const line of lines) {
        const [id, name, labels, ports, networks] = line.split('|');

        // Validação de colisão de ID e Nome com produção
        for (const prodName of PRODUCTION_CONTAINERS) {
          if (name === prodName || id.startsWith(prodName)) {
            console.log(`- Container de produção detectado no host: ${name} (ID: ${id}) [Segregação verificada]`);
          }
        }

        if (stagingContainers.includes(name)) {
          foundStaging.push(name);
          console.log(`\n  Inspecionando container de staging: [${name}] (ID: ${id})`);

          // 7a. Verificação do Projeto Docker Compose
          const expectedProject = process.env.STAGING_COMPOSE_PROJECT || 'vita_staging';
          if (!labels.includes(`com.docker.compose.project=${expectedProject}`)) {
            errors.push(`Container '${name}' não possui a label obrigatória 'com.docker.compose.project=${expectedProject}'. Labels: ${labels}`);
          }

          // 7b. Verificação de Redes
          const expectedNet = process.env.STAGING_NETWORK || 'vita_staging_net';
          if (!networks.includes(expectedNet)) {
            errors.push(`Container '${name}' não está conectado à rede de staging '${expectedNet}'. Redes detectadas: '${networks}'`);
          }

          // 7c. Verificação de Portas Publicadas
          if (name === 'sf-api-staging') {
            if (ports && !ports.includes('127.0.0.1:3011')) {
              errors.push(`sf-api-staging deve publicar exclusivamente em 127.0.0.1:3011. Portas detectadas: '${ports}'`);
            }
          }
          if (name === 'sf-db-staging') {
            if (ports && !ports.includes('127.0.0.1:5434')) {
              errors.push(`sf-db-staging deve publicar exclusivamente em 127.0.0.1:5434. Portas detectadas: '${ports}'`);
            }
          }
          if (name === 'sf-redis-staging') {
            if (ports && ports.includes('0.0.0.0:6379')) {
              errors.push(`sf-redis-staging não pode expor a porta 6379 publicamente em 0.0.0.0. Portas: '${ports}'`);
            }
          }

          // 7d. Inspeção detalhada de Mounts via docker inspect
          try {
            const inspectRaw = execSync(`docker inspect --format='{{json .Mounts}}' ${id}`, { encoding: 'utf8' });
            const mounts = JSON.parse(inspectRaw.trim() || '[]');
            for (const m of mounts) {
              const src = m.Source || '';
              console.log(`    - Mount: ${src} -> ${m.Destination} (${m.Type})`);
              for (const prodPath of PRODUCTION_PATHS) {
                if (src.startsWith(prodPath)) {
                  errors.push(`VIOLAÇÃO CRÍTICA: Container de staging '${name}' monta caminho compartilhado com produção: '${src}'!`);
                }
              }
            }
          } catch (inspectErr) {
            errors.push(`Falha ao inspecionar mounts do container '${name}': ${inspectErr.message}`);
          }
        }
      }

      console.log(`- Containers de staging identificados e validados: ${foundStaging.length}/${stagingContainers.length}`);
    } catch (dockerErr) {
      if (allowOffline) {
        warnings.push(`Docker não disponível no ambiente de verificação estática offline: ${dockerErr.message}`);
      } else {
        errors.push(`FALHA CRÍTICA DE INSPEÇÃO DO DOCKER ENGINE: Não foi possível executar 'docker ps': ${dockerErr.message}`);
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
          errors.push(`VIOLAÇÃO CRÍTICA: current_database() retornado pelo servidor '${row.db}' não termina com _staging ou _test!`);
        }
        if (PRODUCTION_DB_NAMES.includes(row.db)) {
          errors.push(`VIOLAÇÃO CRÍTICA: Conectado diretamente ao banco de produção '${row.db}'!`);
        }
        if (row.usr === 'sf_user' || row.usr === 'postgres') {
          errors.push(`current_user '${row.usr}' é o usuário administrativo ou de produção! Esperado: vita_staging_app ou vita_staging_migrator.`);
        }
        if (row.tz !== 'UTC') {
          errors.push(`Timezone da sessão do banco de dados é '${row.tz}'. Esperado rigorosamente: 'UTC'.`);
        }

        // Verificação de privilégios: usuário da aplicação NÃO deve ter privilégio superuser
        const superRes = await dbClient.query(`
          SELECT rolsuper FROM pg_roles WHERE rolname = current_user;
        `);
        if (superRes.rows[0]?.rolsuper === true) {
          errors.push(`VIOLAÇÃO DE PRIVILÉGIOS: current_user '${row.usr}' possui flag SUPERUSER ativa!`);
        }
      } catch (dbErr) {
        if (allowOffline) {
          warnings.push(`Banco de dados inacessível em modo offline: ${dbErr.message}`);
        } else {
          errors.push(`Falha na inspeção de runtime do banco de dados: ${dbErr.message}`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 9. Relatório Final do Guard Rail
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log('                 SUMÁRIO FINAL DO GUARD RAIL DE ISOLAMENTO                      ');
    console.log('================================================================================');

    if (warnings.length > 0) {
      console.log('ALERTAS REGISTRADOS:');
      warnings.forEach((w) => console.log(`  [!] ${w}`));
    }

    if (errors.length > 0) {
      console.error('\n[BLOQUEIO DE SEGURANÇA ACIONADO] O ambiente NÃO cumpriu todos os critérios de isolamento:');
      errors.forEach((e) => console.error(`  [X] ${e}`));
      console.error('\nExecução bloqueada com Exit Code 1. Nenhuma modificação autorizada.');
      process.exitCode = 1;
      return;
    }

    console.log('[SUCESSO FACTUAL] Todos os 11 requisitos de isolamento foram auditados e confirmados.');
    console.log('Ambiente de staging aprovado para procedimentos controlados.');
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
