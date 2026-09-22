# Runbook Operacional: Implantação e Operação de Staging do Módulo de Wearables (G4.2)

**Status Atual:** `G4.2 = PENDING_VPS_HOMOLOGATION`  
*Atenção: A execução controlada na VPS 72.60.249.235 foi autorizada exclusivamente para o ambiente de staging isolado. Produção permanece 100% intocável.*

## 1. Visão Geral
Este runbook descreve os procedimentos operacionais para provisionamento, validação e execução controlada do ambiente de **Staging** do módulo de Wearables do **Vita Saúde**, garantindo isolamento total em relação aos recursos de produção existentes na VPS.

## 2. Bloqueios Arquiteturais Estritos (Invioláveis)
- **G5 — Garmin Connect Developer Program:** BLOQUEADO.
- **G6 — OAuth 2.0 PKCE / Sincronização Garmin Cloud:** BLOQUEADO.
- **G7 — Score de Vitalidade, Dra. Clara e Coach Iron:** BLOQUEADO.
- **Zero Scraping:** Proibido uso de scraping ou endpoints privados da Garmin.
- **Zero Senhas:** Proibido solicitar, armazenar ou trafegar senhas de usuários Garmin.
- **Zero db push:** Terminantemente proibido o uso de `prisma db push` ou flags `--accept-data-loss`.
- **Produção Intocável:** Jamais executar DDL, DML, restart, kill ou testes contra os containers ou banco de produção (`sf-api-qo4...`, `sf-web-qo4...`, `sf-redis-qo4...`, `sf-db-qo4...`, `saudefinancas`).

## 3. Matriz de Isolamento Produção × Staging

| Recurso | Produção (Ativo) | Staging (Isolado) | Status de Isolamento |
| :--- | :--- | :--- | :--- |
| **API Container** | `sf-api-qo40k8o4g8owcoww0s4sccog-213922545655` | `sf-api-staging` (porta 127.0.0.1:3011) | Isolado |
| **Worker Container** | Integrado na API prod | `sf-worker-staging` | Isolado (UID 1000) |
| **PostgreSQL Container** | `sf-db-qo40k8o4g8owcoww0s4sccog-213922496244` | `sf-db-staging` (porta 127.0.0.1:5434) | Isolado |
| **Banco de Dados** | `saudefinancas` | `vita_saude_staging` | Isolado |
| **Role de DDL** | `sf_user` | `vita_staging_migrator` | Isolado (Timeouts 5s/30s) |
| **Role da Aplicação** | `sf_user` | `vita_staging_app` | Isolado (Sem superuser/CREATE) |
| **Redis Container** | `sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114` | `sf-redis-staging` (porta 127.0.0.1:6381) | Isolado |
| **Fila BullMQ** | `wearables-fit-import` | `wearables-fit-import-staging` | Isolado |
| **Prefixo BullMQ** | `bull` | `bull_staging` | Isolado |
| **Intervalo Reconciliador** | 30s (`RECONCILIATION_INTERVAL_MS=30000`) | 10s (`RECONCILIATION_INTERVAL_MS=10000`) | Isolado |
| **LOCAL_SECURE Path** | N/A (Em memória / transitório) | `/data/vita-saude-staging/wearables` | Isolado (0700) |
| **Backup Path** | N/A | `/data/vita-saude-backups/prod-pre-g4-2` | Isolado (0700/0600) |
| **Portas Internas** | 3001, 5432, 6379 | 127.0.0.1:3011, 127.0.0.1:5434, 127.0.0.1:6381 | Isolado (Zero colisão) |

---

## 4. Sequência Operacional Rigorosa de Execução

A execução na VPS obedece estritamente às etapas numeradas a partir da raiz do repositório (`/data/vita-saude-staging-deploy`):

### Etapa 0: Baseline de Latência e Guard Rail Pré-Provisionamento
1. Coletar 5 amostras da API de produção:
   ```bash
   for i in $(seq 1 5); do
     curl -o /dev/null -s -w "%{time_total}\n" https://appapi.robersonsouza.com.br/api/health/liveness
     sleep 10
   done
   ```
2. Executar guard rail prévio (Fase de Pré-Provisionamento) com variáveis de staging:
   ```bash
   node apps/api/scripts/vps_isolation_guard_rail.mjs --phase=pre-provisioning
   ```
   *Critério de parada: Exit Code 0 obrigatório. Bloqueia se containers de staging já existirem ou colidirem com portas.*

### Etapa 1: Salvaguarda da Produção (Auditoria Passiva Read-Only)
1. Inspecionar status, memória e RestartCount dos 4 containers de produção sem tocar neles:
   ```bash
   docker inspect --format='{{.Name}}: State={{.State.Status}}, Restarts={{.RestartCount}}' \
     sf-api-qo40k8o4g8owcoww0s4sccog-213922545655 \
     sf-web-qo40k8o4g8owcoww0s4sccog-214436573752 \
     sf-redis-qo40k8o4g8owcoww0s4sccog-212850989354 \
     sf-db-qo40k8o4g8owcoww0s4sccog-212850550005
   ```
   *Nota: Backup de produção (pg_dump) requer autorização formal separada. Staging opera 100% isolado.*

### Etapa 2: Bootstrap da Infraestrutura Isolada
1. Provisionar infraestrutura base de staging:
   ```bash
   docker compose --env-file .env.staging -f docker-compose.staging.yml -p vita_staging up -d sf-db-staging sf-redis-staging
   ```
2. Executar bootstrap SQL da etapa PRÉ-MIGRATION (Criação do banco `vita_saude_staging`, roles `vita_staging_migrator` e `vita_staging_app`, e timeouts):
   ```bash
   psql -h 127.0.0.1 -p 5434 -U vita_staging_admin -d postgres \
     -v MIGRATOR_PASS="$STAGING_MIGRATOR_PASSWORD" \
     -v APP_PASS="$STAGING_APP_PASSWORD" \
     -f apps/api/scripts/bootstrap_staging_pre_migration.sql
   ```

### Etapa 3: Guard Rail Pós-Provisionamento (Inspeção Rigorosa dos Containers)
1. Executar guard rail da Fase de Pós-Provisionamento:
   ```bash
   node apps/api/scripts/vps_isolation_guard_rail.mjs --phase=post-provisioning
   ```
   *Valida bind em 127.0.0.1, volumes isolados, database `vita_saude_staging`, timezone UTC, role não-superuser e Redis PONG.*

### Etapa 4: Preflight Temporal e Migrações
1. Executar auditoria de preflight em modo bootstrap vazio explícito:
   ```bash
   DATABASE_URL="postgresql://vita_staging_migrator:$STAGING_MIGRATOR_PASSWORD@127.0.0.1:5434/vita_saude_staging?schema=public" \
     node apps/api/scripts/preflight_temporal_check.mjs --allow-empty
   ```
   *Critério de parada: Exit Code 0 obrigatório.*
2. Comprovar timeouts de migration via runner oficial com mecanismo real:
   ```bash
   STAGING_ADMIN_DB_URL="postgresql://vita_staging_admin:$STAGING_DB_PASSWORD@127.0.0.1:5434/vita_saude_staging" \
   STAGING_MIGRATOR_DB_URL="postgresql://vita_staging_migrator:$STAGING_MIGRATOR_PASSWORD@127.0.0.1:5434/vita_saude_staging?schema=public" \
     node apps/api/scripts/verify_migration_timeouts.mjs
   ```
3. Aplicar as migrações físicas via Prisma CLI como `vita_staging_migrator`:
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
   docker compose --env-file .env.staging -f docker-compose.staging.yml -p vita_staging up -d sf-api-staging sf-worker-staging
   ```

### Etapa 7: Testes Funcionais e Health Probes
1. Validar probes HTTP na porta 3011 (disponíveis sob prefixo `/api/health` e `/health`):
   - `GET /api/health/liveness` -> `200 OK`
   - `GET /api/health/readiness` -> `200 OK` (com DB, Timezone UTC, Redis e Storage)
   - `GET /api/health/metrics` -> `200 OK` (formato Prometheus)
   - `GET /health/liveness` -> `200 OK`
   - `GET /health/readiness` -> `200 OK`
   - `GET /health/metrics` -> `200 OK`

### Etapa 8: Testes Destrutivos Controlados sob Monitoramento
1. Iniciar monitoramento contínuo em background:
   ```bash
   bash apps/api/scripts/monitor_staging_vps.sh --baseline-ms 45 &
   MONITOR_PID=$!
   ```
2. Executar runner destrutivo de SIGKILL e recuperação:
   ```bash
   ALLOW_DESTRUCTIVE_TESTS=true node apps/api/scripts/test_sigkill_worker_recovery.mjs --scenario=A
   ```
   *Comprova SIGKILL no container, reinicialização com novo PID, expiração de lease, recuperação atômica via outbox, persistência sem duplicatas e prova de fencing zumbi.*
3. Executar suíte de testes anti-TOCTOU concorrente com barreiras determinísticas:
   ```bash
   npx vitest run test/wearables/anti-toctou.spec.ts
   ```

### Etapa 9: Desligamento e Relatório Factual Final
1. Desligar o ambiente de staging após a homologação:
   ```bash
   docker compose --env-file .env.staging -f docker-compose.staging.yml -p vita_staging down
   ```
2. Matar o processo de monitoramento:
   ```bash
   kill $MONITOR_PID 2>/dev/null || true
   ```
3. Consolidar os relatórios factuais com saídas e exit codes. Produção permanece intocada.
