# Runbook Operacional: Implantação e Operação de Staging do Módulo de Wearables (G4.2)

## 1. Visão Geral
Este runbook descreve os procedimentos operacionais para provisionamento, validação e execução controlada do ambiente de **Staging** do módulo de Wearables do **Vita Saúde**, garantindo isolamento total em relação aos recursos de produção existentes na VPS.

## 2. Bloqueios Arquiteturais Estritos (Invioláveis)
- **G5 — Garmin Connect Developer Program:** BLOQUEADO.
- **G6 — OAuth 2.0 PKCE / Sincronização Garmin Cloud:** BLOQUEADO.
- **G7 — Score de Vitalidade, Dra. Clara e Coach Iron:** BLOQUEADO.
- **Zero Scraping:** Proibido uso de scraping ou endpoints privados da Garmin.
- **Zero Senhas:** Proibido solicitar, armazenar ou trafegar senhas de usuários Garmin.

## 3. Matriz de Isolamento Produção × Staging

| Recurso | Produção (Ativo) | Staging (Isolado) | Status de Isolamento |
| :--- | :--- | :--- | :--- |
| **API Container** | `sf-api-qo40k8o4g8owcoww0s4sccog-213922545655` | `sf-api-staging` (porta 3011) | Segregação total |
| **Worker Container** | Integrado na API prod | `sf-worker-staging` | Segregação total |
| **PostgreSQL Container** | `sf-db-qo40k8o4g8owcoww0s4sccog-213922496244` | `sf-db-staging` (porta 5434) | Segregação total |
| **Banco de Dados** | `saudefinancas` | `vita_saude_staging` | Segregação total |
| **Role da Aplicação** | `sf_user` | `vita_staging_app` | Privilégio mínimo |
| **Redis Container** | `sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114` | `sf-redis-staging` (porta 6381) | Instância dedicada |
| **Fila BullMQ** | `wearables-fit-import` | `wearables-fit-import-staging` | Namespace isolado |
| **Prefixo BullMQ** | `bull` | `bull_staging` | Namespace isolado |
| **LOCAL_SECURE Path** | N/A (Em memória / transitório) | `/data/vita-saude-staging/wearables` | Volume exclusivo |
| **Backup Path** | N/A | `/data/vita-saude-staging-backups` | Volume exclusivo |
| **Domínio / FQDN** | `appapi.robersonsouza.com.br` | `staging.vitasaude.local` ou subdomínio | Segregação DNS/Proxy |
| **Portas Internas** | 3001, 5432, 6379 | 3011, 5434, 6381 | Portas sem colisão |

## 4. Pré-requisitos Obrigatórios Antes da Inicialização
1. **Backup da Produção:** Executar snapshot manual do banco `saudefinancas` antes de qualquer alteração de infraestrutura.
2. **Execução do Guard Rail:**
   ```bash
   node apps/api/scripts/vps_isolation_guard_rail.mjs
   ```
   *Critério de parada: O script DEVE retornar Exit Code 0. Se retornar Exit Code != 0, abortar.*
3. **Validação de Permissões POSIX:**
   - Diretório `/data/vita-saude-staging/wearables`: permissões `0700` (`drwx------`).
   - Arquivos ingeridos: permissões `0600` (`-rw-------`).

## 5. Procedimento de Implantação de Migrations em Staging
Executar as migrations no banco de staging com timeouts seguros de sessão:
```bash
PGOPTIONS="-c lock_timeout=5000 -c statement_timeout=30000" npx prisma migrate deploy
```

Auditar constraints no PostgreSQL:
```sql
SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE 'chk_%';
```
*Todas as 5 constraints temporais devem retornar `convalidated = true`.*

## 6. Verificação de Health Probes
- **Liveness:** `GET /health/liveness` -> `200 OK` (`{ status: "UP" }`)
- **Readiness:** `GET /health/readiness` -> `200 OK` (`{ status: "UP", checks: { database: "UP", timezone: "UTC", redis: "UP", storage: "UP" } }`)
- **Métricas Prometheus:** `GET /health/metrics` -> `200 OK` (Content-Type: `text/plain`)

## 7. Procedimento de Rollback
Em caso de anomalia durante o teste na staging:
1. Executar rollback SQL da migration específica:
   ```bash
   psql -U vita_staging_app -d vita_saude_staging -f prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql
   ```
2. Derrubar contêineres de staging:
   ```bash
   docker-compose -f docker-compose.staging.yml down -v
   ```
3. Limpar diretório de storage efêmero de staging:
   ```bash
   rm -rf /data/vita-saude-staging/wearables/*
   ```
4. Jamais tocar nos containers com prefixo `qo40k8o4g8owcoww0s4sccog_sf-*`.
