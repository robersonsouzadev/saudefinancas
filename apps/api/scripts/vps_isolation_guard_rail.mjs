#!/usr/bin/env node

/**
 * GUARD RAIL AUTOMÁTICO DE PROTEÇÃO DE PRODUÇÃO (G4.2)
 * 
 * Valida rigorosamente que os testes e execuções destrutivas NUNCA
 * atinjam os recursos ou containers de produção do Vita Saúde.
 * 
 * Bloqueia incondicionalmente com Exit Code 1 em caso de falha de inspeção
 * ou violação de qualquer critério de isolamento.
 */

import { execSync } from 'child_process';

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

const FORBIDDEN_PORTS = [3001, 5432, 6379];

function runGuardRail() {
  console.log('================================================================================');
  console.log('        GUARD RAIL AUTOMÁTICO DE ISOLAMENTO VPS — VITA SAÚDE (G4.2)            ');
  console.log('================================================================================\n');

  const errors = [];
  const warnings = [];

  const isDestructiveRunner = process.argv.includes('--destructive-runner');

  // 1. Verificação de APP_ENV e NODE_ENV
  const nodeEnv = process.env.NODE_ENV || '';
  const appEnv = process.env.APP_ENV || '';

  console.log(`[Check 1] NODE_ENV: "${nodeEnv}", APP_ENV: "${appEnv}"`);
  if (nodeEnv !== 'staging' && nodeEnv !== 'test') {
    errors.push(`NODE_ENV deve ser 'staging' ou 'test'. Valor atual: '${nodeEnv}'`);
  }
  if (appEnv !== 'staging') {
    errors.push(`APP_ENV deve ser 'staging'. Valor atual: '${appEnv}'`);
  }

  // 2. Verificação do Nome do Banco de Dados
  const dbUrl = process.env.DATABASE_URL || '';
  console.log(`[Check 2] DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : '(ausente)'}`);
  if (!dbUrl) {
    errors.push('DATABASE_URL não informada.');
  } else {
    try {
      const parsedUrl = new URL(dbUrl);
      const dbName = parsedUrl.pathname.replace(/^\//, '');
      if (!dbName.endsWith('_staging') && !dbName.endsWith('_test')) {
        errors.push(`Nome do banco de dados deve terminar com '_staging' ou '_test'. Valor detectado: '${dbName}'`);
      }
      if (PRODUCTION_DB_NAMES.includes(dbName)) {
        errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL aponta para o banco de produção '${dbName}'!`);
      }
      const port = parseInt(parsedUrl.port || '5432', 10);
      if (FORBIDDEN_PORTS.includes(port) && !parsedUrl.hostname.includes('staging')) {
        errors.push(`VIOLAÇÃO CRÍTICA: Porta do banco (${port}) colide com portas de produção padrão sem host de staging!`);
      }
    } catch (err) {
      errors.push(`DATABASE_URL inválida ou malformada: ${err.message}`);
    }
  }

  // 3. Verificação do Diretório de Armazenamento LOCAL_SECURE
  const storagePath = process.env.LOCAL_STORAGE_BASE_PATH || process.env.STORAGE_PATH || '';
  console.log(`[Check 3] STORAGE_PATH: "${storagePath}"`);
  if (!storagePath) {
    errors.push('STORAGE_PATH não configurado.');
  } else {
    if (!storagePath.toLowerCase().includes('staging')) {
      errors.push(`STORAGE_PATH deve conter explicitamente 'staging'. Valor atual: '${storagePath}'`);
    }
    if (storagePath === '/data' || storagePath === '/var/lib' || storagePath === '/' || storagePath === '~') {
      errors.push(`STORAGE_PATH aponta para caminho raiz ou genérico perigoso: '${storagePath}'`);
    }
  }

  // 4. Verificação de Fila e Prefixo BullMQ
  const queueName = process.env.QUEUE_NAME || '';
  const queuePrefix = process.env.QUEUE_PREFIX || '';
  console.log(`[Check 4] Fila: "${queueName}", Prefixo: "${queuePrefix}"`);
  if (!queueName || !queueName.toLowerCase().includes('staging')) {
    errors.push(`Nome da fila deve conter 'staging'. Valor atual: '${queueName}'`);
  }
  if (!queuePrefix || !queuePrefix.toLowerCase().includes('staging')) {
    errors.push(`Prefixo da fila deve conter 'staging'. Valor atual: '${queuePrefix}'`);
  }

  // 5. Verificação da URL Pública / Domínio
  const publicUrl = process.env.PUBLIC_API_URL || process.env.APP_URL || '';
  console.log(`[Check 5] URL Pública: "${publicUrl}"`);
  for (const prodDomain of PRODUCTION_DOMAINS) {
    if (publicUrl.includes(prodDomain)) {
      errors.push(`VIOLAÇÃO CRÍTICA: URL aponta para domínio de produção: '${prodDomain}'`);
    }
  }

  // 6. Verificação de Flag Explícita de Testes Destrutivos
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TESTS;
  console.log(`[Check 6] Modo Destrutivo: isDestructiveRunner=${isDestructiveRunner}, ALLOW_DESTRUCTIVE_TESTS="${allowDestructive}"`);
  if (isDestructiveRunner) {
    if (allowDestructive !== 'true') {
      errors.push(`Para runners destrutivos (--destructive-runner), ALLOW_DESTRUCTIVE_TESTS deve ser explicitamente 'true'.`);
    }
  } else {
    // Para containers gerais de API e Worker, a flag destrutiva NÃO deve ser permanente
    if (allowDestructive === 'true') {
      warnings.push(`ALLOW_DESTRUCTIVE_TESTS está 'true' em contexto não-runner. Deve ser restrita aos runners autorizados.`);
    }
  }

  // 7. Verificação Efetiva de Containers Docker Ativos com Bloqueio em Caso de Falha
  console.log('[Check 7] Inspecionando containers Docker ativos...');
  try {
    const runningContainersRaw = execSync("docker ps --format '{{.Names}}'", { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    });
    const runningContainers = runningContainersRaw.split('\n').map((s) => s.trim()).filter(Boolean);

    const stagingApiContainer = process.env.STAGING_API_CONTAINER_NAME || 'sf-api-staging';
    const stagingDbContainer = process.env.STAGING_DB_CONTAINER_NAME || 'sf-db-staging';
    const stagingWorkerContainer = process.env.STAGING_WORKER_CONTAINER_NAME || 'sf-worker-staging';
    const stagingRedisContainer = process.env.STAGING_REDIS_CONTAINER_NAME || 'sf-redis-staging';

    const stagingNames = [stagingApiContainer, stagingDbContainer, stagingWorkerContainer, stagingRedisContainer];

    for (const name of stagingNames) {
      if (PRODUCTION_CONTAINERS.includes(name)) {
        errors.push(`VIOLAÇÃO CRÍTICA: Identificador de container de staging '${name}' coincide com container de produção!`);
      }
    }

    console.log(`- Containers ativos detectados: ${runningContainers.length}`);
  } catch (dockerErr) {
    // AUDITORIA G4.2: Se a inspeção do Docker falhar, O GUARD RAIL DEVE BLOQUEAR!
    errors.push(`FALHA CRÍTICA DE INSPEÇÃO DO ENGINE DOCKER: Não foi possível executar 'docker ps': ${dockerErr.message}. Execução bloqueada.`);
  }

  // 8. Relatório Final do Guard Rail
  console.log('\n--- RESULTADO DA VERIFICAÇÃO DO GUARD RAIL ---');
  if (warnings.length > 0) {
    console.log('ALERTAS:');
    warnings.forEach((w) => console.log(`  [!] ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n[BLOQUEIO DE SEGURANÇA ACIONADO] O ambiente NÃO é um staging isolado válido:');
    errors.forEach((e) => console.error(`  [X] ${e}`));
    console.error('\nExecução abortada imediatamente com Exit Code 1. Nenhuma ação foi executada.');
    process.exit(1);
  }

  console.log('[SUCESSO] Todos os requisitos de isolamento foram atendidos e comprovados. Ambiente de staging validado.');
  process.exit(0);
}

runGuardRail();
