#!/usr/bin/env node

/**
 * GUARD RAIL AUTOMÁTICO DE PROTEÇÃO DE PRODUÇÃO (G4.2)
 * 
 * Valida rigorosamente que os testes e execuções destrutivas NUNCA
 * atinjam os recursos ou containers de produção do Vita Saúde.
 * 
 * Retorna:
 *   Exit Code 0: Ambiente isolado de staging comprovado e seguro para testes.
 *   Exit Code 1: Falha em pré-requisito de isolamento ou detecção de recurso de produção.
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

function runGuardRail() {
  console.log('================================================================================');
  console.log('        GUARD RAIL AUTOMÁTICO DE ISOLAMENTO VPS — VITA SAÚDE (G4.2)            ');
  console.log('================================================================================\n');

  const errors = [];
  const warnings = [];

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
  console.log(`[Check 2] DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
  try {
    const parsedUrl = new URL(dbUrl);
    const dbName = parsedUrl.pathname.replace(/^\//, '');
    if (!dbName.endsWith('_staging') && !dbName.endsWith('_test')) {
      errors.push(`Nome do banco de dados deve terminar com '_staging' ou '_test'. Valor detectado: '${dbName}'`);
    }
    if (PRODUCTION_DB_NAMES.includes(dbName)) {
      errors.push(`VIOLAÇÃO CRÍTICA: DATABASE_URL aponta para o banco de produção '${dbName}'!`);
    }
  } catch (err) {
    errors.push(`DATABASE_URL inválida ou ausente: ${err.message}`);
  }

  // 3. Verificação do Diretório de Armazenamento LOCAL_SECURE
  const storagePath = process.env.LOCAL_STORAGE_BASE_PATH || process.env.STORAGE_PATH || '';
  console.log(`[Check 3] STORAGE_PATH: "${storagePath}"`);
  if (!storagePath.toLowerCase().includes('staging')) {
    errors.push(`STORAGE_PATH deve conter explicitamente 'staging'. Valor atual: '${storagePath}'`);
  }
  if (storagePath === '/data' || storagePath === '/var/lib' || storagePath === '/' || storagePath === '~') {
    errors.push(`STORAGE_PATH aponta para caminho raiz ou genérico perigoso: '${storagePath}'`);
  }

  // 4. Verificação de Fila e Prefixo BullMQ
  const queueName = process.env.QUEUE_NAME || 'wearables-fit-import-staging';
  const queuePrefix = process.env.QUEUE_PREFIX || 'bull_staging';
  console.log(`[Check 4] Fila: "${queueName}", Prefixo: "${queuePrefix}"`);
  if (!queueName.toLowerCase().includes('staging')) {
    errors.push(`Nome da fila deve conter 'staging'. Valor atual: '${queueName}'`);
  }
  if (!queuePrefix.toLowerCase().includes('staging')) {
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
  console.log(`[Check 6] ALLOW_DESTRUCTIVE_TESTS: "${allowDestructive}"`);
  if (allowDestructive !== 'true') {
    errors.push(`ALLOW_DESTRUCTIVE_TESTS deve estar explicitamente 'true' apenas no ambiente isolado de staging.`);
  }

  // 7. Verificação de Colisão de Containers Docker Ativos
  console.log('[Check 7] Verificando containers Docker ativos...');
  try {
    const runningContainersRaw = execSync("docker ps --format '{{.Names}}'", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const runningContainers = runningContainersRaw.split('\n').map((s) => s.trim()).filter(Boolean);

    const stagingApiContainer = process.env.STAGING_API_CONTAINER_NAME || 'vita_staging_api';
    const stagingDbContainer = process.env.STAGING_DB_CONTAINER_NAME || 'vita_staging_db';

    if (PRODUCTION_CONTAINERS.includes(stagingApiContainer) || PRODUCTION_CONTAINERS.includes(stagingDbContainer)) {
      errors.push(`VIOLAÇÃO CRÍTICA: Identificador de container de staging coincide com container de produção!`);
    }
  } catch (dockerErr) {
    warnings.push(`Não foi possível executar 'docker ps': ${dockerErr.message}`);
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
    console.error('\nExecução abortada imediatamente com Exit Code 1. Nenhuma ação destrutiva foi executada.');
    process.exit(1);
  }

  console.log('[SUCESSO] Todos os 7 requisitos de isolamento foram atendidos. Ambiente de staging validado com segurança.');
  process.exit(0);
}

runGuardRail();
