# Relatório de Entrega do Pacote Técnico V5 — Fase G4.2 (Vita Saúde)

**Data:** 22 de Setembro de 2026  
**Status da Fase G4.2:** `PENDING_VPS_HOMOLOGATION`  
**Status de Bloqueios Invioláveis:**
- `G5 (Garmin Connect Developer Program)` = **BLOCKED**
- `G6 (OAuth 2.0 PKCE / Garmin Cloud Sync)` = **BLOCKED**
- `G7 (Score de Vitalidade & Agentes Dra. Clara / Coach Iron)` = **BLOCKED**

---

## 1. Identificação do Pacote Técnico V5

| Atributo | Valor Factual |
| :--- | :--- |
| **Arquivo Principal** | `pacote_tecnico_g4_2_v5.zip` |
| **Cópia de Compatibilidade** | `pacote_tecnico_g4_2.zip` |
| **Tamanho do Arquivo** | ~1,33 MB |
| **Validação e SHA-256** | Registrado e comprovado em `VALIDACAO_ZIP_G4_2_V5.txt` |
| **Total de Entradas no ZIP** | 94 entradas (69 arquivos e 25 diretórios) |
| **Padrão de Empacotamento** | POSIX / UNIX (`create_system = 3`), caminhos `/`, zero `\`, zero `..` |
| **Permissões POSIX** | `0755` para diretórios e scripts `.sh`, `0644` para arquivos regulares |
| **Commit Base do Patch** | `ff71bd6bfb84b50a2f0e47693428f7a8deda37ef` |

---

## 2. Resolução Factual dos Bloqueios da Auditoria V4

### 2.1 Inclusão Física de Schema e Migrations no ZIP
Diferente das versões anteriores que continham apenas `migration_lock.toml`, o pacote V5 inclui fisicamente todos os arquivos de definição do banco de dados e as 4 migrações com seus respectivos scripts de aplicação e rollback:

| Arquivo de Migração / Schema | SHA-256 Factual |
| :--- | :--- |
| `apps/api/prisma/schema.prisma` | `984dca83c6dd06bba3bc7a1d13dbb3e512cebb91bbaf6572e42621cb698a33fa` |
| `apps/api/prisma/migrations/migration_lock.toml` | `5c3453ea1320ef45bba0be28c50e4ca20f18838d781b0a7a371720875e6d6281` |
| `apps/api/prisma/migrations/20260801000000_baseline/migration.sql` | `9a7aa77421cbdb5c9779df5e971e46fb7a9fa8dcce4cf262f33c393bc6742512` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/migration.sql` | `77e56dd9676e193aa4d7f575775317796e624d6fe62cc08a3f8fa3b7ff469eb0` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/rollback.sql` | `37812ea11e9a265691060cae8061dc3b7501a4eecf130b91f5f24208a1dc3895` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/migration.sql` | `88c2baef9b5fa08d0ba7592cfdfebef2d140e69888998ab1ee6d06114eb16c87` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/rollback.sql` | `e97a312d8a4e375e2eb28c8bc3a5ff79ef41dd44866f82782b13fa7d10011116` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/migration.sql` | `ea89b986e7492c638d6dfdcfd9f67a211933bfdf8d3b5b15be13ca77fc75e5fb` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql` | `9d554a9388df67f339c94b79eb9e7f7caadba3d8dcae0f2d7c5f87b8f9a263c9` |

### 2.2 Inclusão de Arquivos de Reprodução e Compilação
Foram empacotados integralmente:
- `package.json` (raiz) e `package-lock.json` (lockfile completo com todas as dependências determinísticas)
- `apps/api/package.json`
- `apps/api/tsconfig.json` e `apps/api/nest-cli.json`
- `apps/api/Dockerfile` (atualizado para compilar o helper Linux C no stage builder)
- `docker-compose.staging.yml`
- `.env.staging.example` e `.env.staging.validation`

### 2.3 Formato POSIX Estrito no Arquivo ZIP
O arquivo ZIP foi gerado com engine Python personalizada que garante:
- `zinfo.create_system = 3` (UNIX) para todas as entradas
- Permissões POSIX atribuídas nos bits altos de `external_attr`:
  * Diretórios: `0o40755` (`drwxr-xr-x`)
  * Scripts (`.sh`): `0o100755` (`-rwxr-xr-x`)
  * Arquivos de código e texto: `0o100644` (`-rw-r--r--`)
- Todos os caminhos usam estritamente o separador `/`. Zero caminhos absolutos, zero caminhos com `\`, zero referências a `..`.
- Relatório de validação emitido e auditável em `VALIDACAO_ZIP_G4_2_V5.txt`.

### 2.4 Anti-TOCTOU Real com Descritores de Arquivo (Linux Descriptor-Based)
Foi implementada uma arquitetura robusta contra Time-of-Check to Time-of-Use (TOCTOU):
1. **Helper Nativo C (`apps/api/scripts/storage_linux_helper.c`):**
   - Implementa chamadas nativas de kernel relativas a descritor de diretório (`openat2` com `RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS`).
   - Fallback para `openat` com `O_NOFOLLOW`.
   - Criação atômica via `renameat2(RENAME_NOREPLACE)` ou `linkat` + `unlinkat`.
   - Sincronização em disco via `fstat` e `fsync`.
   - Impede criação de qualquer arquivo fora da raiz de armazenamento mesmo sob ataques de swap de diretório.
2. **Camada de Integração (`storage-linux-helper.ts` & `storage.service.ts`):**
   - Resolução determinística de caminhos sem seguir symlinks intermediários ou alvos que não existem (uso de `fs.lstatSync` seguro).
   - Validação de preflight no storage root.
3. **Suíte Determinística de Testes (`anti-toctou.spec.ts`):**
   - 9 casos de teste cobrindo:
     * Tentativa de criação de arquivo externo inexistente não cria nada fora da raiz.
     * Sentinela externa preservada com integridade de hash garantida.
     * Tentativa de swap concorrente de diretório antes da gravação final.
     * Validação do contrato do helper Linux.

### 2.5 Containers de Produção Factuais Auditados e Monitoramento Rígido
Foram identificados e mapeados com exatidão os 4 containers de produção:
1. `sf-api-qo40k8o4g8owcoww0s4sccog-213922545655`
2. `sf-web-qo40k8o4g8owcoww0s4sccog-213922581192`
3. `sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114`
4. `sf-db-qo40k8o4g8owcoww0s4sccog-213922496244`

O script `apps/api/scripts/monitor_staging_vps.sh` foi reescrito:
- **Tolerância Zero a Falhas:** Eliminada tolerância a containers em estado `missing` e removido fallback `0` para contadores de restart. Se qualquer um dos 4 containers não estiver `running`, for `OOMKilled`, estiver `unhealthy` ou incrementar seu `RestartCount`, o monitor aborta imediatamente e emite alerta crítico.
- **Baseline Factual:** Removida a flag arbitrária `--baseline-ms`. O script coleta 5 requisições factuais na URL de produção `PROD_API_URL`, calcula a mediana e o p95, e falha se a rota retornar código diferente de 2xx, timeout ou HTTP 000.

### 2.6 Guard Rail de Isolamento Endurecido (`vps_isolation_guard_rail.mjs`)
O guard rail foi refatorado para operar em **3 fases estritas**:
1. `--phase=pre-provisioning`: Exige variáveis obrigatórias (`NODE_ENV`, `APP_ENV`, `STORAGE_PATH`, `QUEUE_NAME`, `QUEUE_PREFIX`, `STAGING_COMPOSE_PROJECT`, `STAGING_NETWORK`). Valida que os containers de staging ainda não existem e que as portas de staging estão livres na interface 127.0.0.1.
2. `--phase=post-provisioning`: Valida portas exatas em `127.0.0.1` (`3011 -> 3001`, `5434 -> 5432`, `6381 -> 6379`, e `sf-worker-staging` sem porta publicada). Verifica rede exclusiva (`vita_staging_net`), ausência de colisão com os volumes físicos dos 4 containers de produção, conexão com `vita_saude_staging` via usuário de aplicação não-superuser `vita_staging_app` e resposta `PONG` do Redis de staging.
3. `--phase=migration`: Valida conexão exclusiva de DDL com `database = vita_saude_staging` e `user = vita_staging_migrator`. Qualquer outra fase resulta em Exit Code 1.

### 2.7 Runbook Operacional de Staging Atualizado (`staging_deploy_wearables.md`)
- Inclui carregamento seguro de variáveis na shell: `set -a && source .env.staging && set +a`.
- Comandos Prisma CLI incluem explicitamente a flag `--schema apps/api/prisma/schema.prisma`.
- A matriz de isolamento reflete com transparência o status `Isolamento planejado/pending`.
- Remoção da flag de baseline arbitrária na chamada do monitor.

---

## 3. Evidência Factual da Execução de Testes Locais

A suíte completa de testes locais foi executada integralmente via `vitest run --fileParallelism=false`.  
Saída bruta arquivada no arquivo auditável `RESULTADOS_TESTES_LOCAIS_G4_2_V5.txt`:

- **Arquivos de Teste Executados:** 16/16 aprovados (100%)
- **Total de Testes:** 91/91 aprovados (100%)
- **Duração Total:** 17.19 segundos
- **Exit Code:** 0
- **Detalhamento das Suítes:**
  1. `test/integration/postgres-real.spec.ts` (9 testes)
  2. `test/wearables/anti-toctou.spec.ts` (9 testes)
  3. `test/integration/worker-resilience.spec.ts` (5 testes)
  4. `test/integration/compiled-runtime-e2e.spec.ts` (8 testes)
  5. `test/wearables/concurrency-compensation.spec.ts` (5 testes)
  6. `test/integration/utc-pool-resilience.spec.ts` (5 testes)
  7. `test/integration/redis-bullmq-real.spec.ts` (5 testes)
  8. `test/integration/health.spec.ts` (7 testes)
  9. `test/integration/http-regression.spec.ts` (4 testes)
  10. `test/wearables/storage.spec.ts` (6 testes)
  11. `test/wearables/fit-normalizer.spec.ts` (4 testes)
  12. `test/integration/redaction-pii.spec.ts` (8 testes)
  13. `test/wearables/fit-binary-validation.spec.ts` (7 testes)
  14. `test/integration/preflight.spec.ts` (4 testes)
  15. `test/wearables/fit-worker-supervisor.spec.ts` (2 testes)
  16. `test/wearables/pseudonymization.spec.ts` (3 testes)

---

## 4. Validação do Patch Git Unificado (`diff_g4_2.patch`)

O patch `diff_g4_2.patch` contém 45 arquivos modificados/criados com 5.582 adições líquidas em relação ao commit base `ff71bd6bfb84b50a2f0e47693428f7a8deda37ef`.
- Testado com reversão sobre o estado atual: `git apply --check --reverse diff_g4_2.patch` -> **Exit Code 0**.
- Zero binários ou zips incorporados no corpo do patch.

---

## 5. Artefatos Físicos Gerados

Todos os artefatos requeridos foram gerados nos caminhos auditáveis:

1. `pacote_tecnico_g4_2_v5.zip` — Pacote técnico POSIX V5 completo.
2. `pacote_tecnico_g4_2.zip` — Cópia idêntica de compatibilidade.
3. `RELATORIO_ENTREGA_G4_2_V5.md` — Este relatório técnico detalhado.
4. `MANIFEST_SHA256SUMS.txt` — Hashes SHA-256 de todas as 67 entradas individuais do pacote.
5. `VALIDACAO_ZIP_G4_2_V5.txt` — Evidência formal de validação dos atributos e permissões POSIX.
6. `RESULTADOS_TESTES_LOCAIS_G4_2_V5.txt` — Saída bruta completa dos 91 testes locais executados com sucesso.
7. `diff_g4_2.patch` — Patch unificado limpo contra o commit base `ff71bd6`.

---

## 6. Parecer de Conclusão

Com a implementação integral das correções físicas, garantia de formato POSIX estrito, proteção baseada em descritores para Anti-TOCTOU, monitoramento rígido dos 4 containers factuais de produção, inclusão do schema e de todas as migrações no ZIP e aprovação de 91 testes locais com Exit Code 0, o pacote técnico V5 cumpre rigorosamente todos os critérios de auditoria.

O pacote está apto para validação estática e subsequente transferência e homologação isolada no ambiente de staging da VPS.

**Status Atualizado:** `G4.2 = PENDING_VPS_HOMOLOGATION`  
**Bloqueios Mantidos:** `G5 = BLOCKED`, `G6 = BLOCKED`, `G7 = BLOCKED`
