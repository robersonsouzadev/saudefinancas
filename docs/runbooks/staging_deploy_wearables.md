# Runbook Operacional: Implantação e Operação de Staging do Módulo de Wearables (G4.2)

## 1. Visão Geral
Este runbook descreve os procedimentos operacionais para provisionamento, validação e execução controlada do ambiente de **Staging** do módulo de Wearables do **Vita Saúde**, garantindo isolamento total em relação aos recursos de produção existentes na VPS.

## 2. Bloqueios Arquiteturais Estritos (Invioláveis)
- **G5 — Garmin Connect Developer Program:** BLOQUEADO.
- **G6 — OAuth 2.0 PKCE / Sincronização Garmin Cloud:** BLOQUEADO.
- **G7 — Score de Vitalidade, Dra. Clara e Coach Iron:** BLOQUEADO.
- **Zero Scraping:** Proibido uso de scraping ou endpoints privados da Garmin.
- **Zero Senhas:** Proibido solicitar, armazenar ou trafegar senhas de usuários Garmin.
- **Zero db push:** Terminantemente proibido o uso de `prisma db push` ou flags `--accept-data-loss`.

## 3. Matriz de Isolamento Produção × Staging

| Recurso | Produção (Ativo) | Staging (Isolado) | Status de Isolamento |
| :--- | :--- | :--- | :--- |
| **API Container** | `sf-api-qo40k8o4g8owcoww0s4sccog-213922545655` | `sf-api-staging` (porta 3011) | Segregação total |
| **Worker Container** | Integrado na API prod | `sf-worker-staging` | Container dedicado (UID 1000) |
| **PostgreSQL Container** | `sf-db-qo40k8o4g8owcoww0s4sccog-213922496244` | `sf-db-staging` (porta 5434) | Segregação total |
| **Banco de Dados** | `saudefinancas` | `vita_saude_staging` | Segregação total |
| **Role de DDL** | `sf_user` | `vita_staging_migrator` | Lock/statement timeouts configurados |
| **Role da Aplicação** | `sf_user` | `vita_staging_app` | Sem superuser, sem permissão CREATE |
| **Redis Container** | `sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114` | `sf-redis-staging` (porta 6381) | Instância dedicada |
| **Fila BullMQ** | `wearables-fit-import` | `wearables-fit-import-staging` | Namespace isolado |
| **Prefixo BullMQ** | `bull` | `bull_staging` | Namespace isolado |
| **LOCAL_SECURE Path** | N/A (Em memória / transitório) | `/data/vita-saude-staging/wearables` | Volume exclusivo (0700) |
| **Backup Path** | N/A | `/data/vita-saude-backups/prod-pre-g4-2` | Volume exclusivo (0700/0600) |
| **Portas Internas** | 3001, 5432, 6379 | 3011, 5434, 6381 | Zero colisão de portas |

---

## 4. Sequência Operacional Rigorosa de Execução

A execução na VPS obedece estritamente às etapas numeradas:

### Etapa 0: Baseline de Latência e Guard Rail Pré-Provisionamento
1. Coletar 5 amostras da API de produção:
   ```bash
   for i in $(seq 1 5); do
     curl -o /dev/null -s -w "%{time_total}\n" https://appapi.robersonsouza.com.br/health/liveness
     sleep 10
   done
   ```
2. Executar guard rail prévio:
   ```bash
   node apps/api/scripts/vps_isolation_guard_rail.mjs
   ```
   *Critério de parada: Exit Code 0 obrigatório.*

### Etapa 1: Salvaguarda da Produção (Backup Factual)
1. Executar snapshot manual com arquivo criado atomicamente com permissão 0600:
   ```bash
   bash apps/api/scripts/backup_production_safeguard.sh
   ```
   *Verificar SHA-256 e consistência da TOC via `pg_restore --list`.*
   *Proibição absoluta: Jamais restaurar este arquivo no ambiente de staging.*

### Etapa 2: Bootstrap da Infraestrutura Isolada
1. Provisionar infraestrutura base de staging:
   ```bash
   docker compose -f docker-compose.staging.yml up -d sf-db-staging sf-redis-staging
   ```
2. Executar bootstrap SQL da etapa PRÉ-MIGRATION (Criação do banco, roles e timeouts):
   ```bash
   psql -h 127.0.0.1 -p 5434 -U vita_staging_admin -d postgres \
     -v MIGRATOR_PASS="$STAGING_MIGRATOR_PASSWORD" \
     -v APP_PASS="$STAGING_APP_PASSWORD" \
     -f apps/api/scripts/bootstrap_staging_pre_migration.sql
   ```

### Etapa 3: Guard Rail dos Recursos Efetivos
1. Re-executar validação de isolamento com containers de staging ativos:
   ```bash
   node apps/api/scripts/vps_isolation_guard_rail.mjs
   ```

### Etapa 4: Preflight Temporal e Migrações
1. Executar auditoria de preflight em modo bootstrap vazio explícito:
   ```bash
   DATABASE_URL="postgresql://vita_staging_migrator:$STAGING_MIGRATOR_PASSWORD@127.0.0.1:5434/vita_saude_staging?schema=public" \
     node apps/api/scripts/preflight_temporal_check.mjs --allow-empty
   ```
   *Critério de parada: Exit Code 0 obrigatório.*
2. Comprovar timeouts de migration via runner oficial:
   ```bash
   STAGING_ADMIN_DB_URL="postgresql://vita_staging_admin:$STAGING_DB_PASSWORD@127.0.0.1:5434/vita_saude_staging" \
   STAGING_MIGRATOR_DB_URL="postgresql://vita_staging_migrator:$STAGING_MIGRATOR_PASSWORD@127.0.0.1:5434/vita_saude_staging?schema=public" \
     node apps/api/scripts/verify_migration_timeouts.mjs
   ```
3. Aplicar as 4 migrações físicas via Prisma CLI como `vita_staging_migrator`:
   ```bash
   DATABASE_URL="postgresql://vita_staging_migrator:$STAGING_MIGRATOR_PASSWORD@127.0.0.1:5434/vita_saude_staging?schema=public" \
     npx prisma migrate deploy
   ```

### Etapa 5: Verificações Pós-Migration e Concessão de Privilégios
1. Auditar constraints no PostgreSQL:
   ```sql
   SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE 'chk_%';
   ```
   *Todas as 5 constraints temporais devem retornar `convalidated = true`.*
2. Executar bootstrap SQL da etapa PÓS-MIGRATION (Grants DML, proteção de `_prisma_migrations` e asserções):
   ```bash
   psql -h 127.0.0.1 -p 5434 -U vita_staging_migrator -d vita_saude_staging \
     -f apps/api/scripts/bootstrap_staging_post_migration.sql
   ```
   *As asserções em PL/pgSQL devem confirmar insufficient_privilege para criação de tabelas e escrita em _prisma_migrations.*

### Etapa 6: Subida dos Consumidores (API e Worker)
1. Subir a API e o Worker de staging:
   ```bash
   docker compose -f docker-compose.staging.yml up -d sf-api-staging sf-worker-staging
   ```

### Etapa 7: Testes Funcionais e Health Probes
1. Validar probes HTTP na porta 3011:
   - `GET /health/liveness` -> `200 OK`
   - `GET /health/readiness` -> `200 OK` (com DB, Timezone UTC, Redis e Storage)
   - `GET /health/metrics` -> `200 OK` (formato Prometheus)

### Etapa 8: Testes Destrutivos Controlados sob Monitoramento
1. Iniciar monitoramento contínuo em background:
   ```bash
   bash apps/api/scripts/monitor_staging_vps.sh --baseline-ms 45 &
   MONITOR_PID=$!
   ```
2. Executar runner destrutivo de SIGKILL e recuperação:
   ```bash
   ALLOW_DESTRUCTIVE_TESTS=true node apps/api/scripts/test_sigkill_worker_recovery.mjs
   ```
3. Executar suíte de testes de anti-TOCTOU concorrente:
   ```bash
   npx vitest run test/wearables/anti-toctou.spec.ts
   ```

### Etapa 9: Relatório Factual Final
1. Consolidar os relatórios de saída brutos de cada runner.
2. Desligar o ambiente de staging após a homologação:
   ```bash
   docker compose -f docker-compose.staging.yml down
   ```
3. O ambiente de produção permanece intocado durante todo o processo.
