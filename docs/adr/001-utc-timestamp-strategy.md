# ADR 001: Estratégia de Timestamps em UTC e Invariantes Temporais no Módulo de Wearables

## Status
Aprovado (Phase G4.2)

## Contexto
Durante as auditorias das fases G4.1 e G4.1.1, identificou-se uma anomalia crítica onde o campo `processedAt` foi gravado com timestamp anterior ao `createdAt` (diferença de aproximadamente 4 horas, correspondente ao fuso de Mato Grosso do Sul, UTC-4). Essa discrepância foi provocada pela assimetria entre:
1. Funções de biblioteca de data no ambiente Node.js operando com horários locais do servidor (`Intl.DateTimeFormat().resolvedOptions().timeZone`);
2. Configuração de timezone de sessão do PostgreSQL herdada do host ou de conexões reutilizadas no pool do Prisma;
3. Inexistência de travas estruturais de integridade relacional a nível de banco de dados (`CHECK constraints`).

## Decisões Tomadas

### 1. Governança Estrita em UTC Global
- Todas as colunas temporais de auditoria e telemetria (`createdAt`, `updatedAt`, `processingStartedAt`, `processedAt`, `leaseExpiresAt`, `startedAt`, `finishedAt`) são registradas estritamente em UTC.
- No PostgreSQL, todas as operações de escrita SQL direta utilizam `timezone('UTC', NOW())`.
- No código Node.js/TypeScript, utiliza-se exclusivamente `new Date().toISOString()` e métodos UTC (`getUTCFullYear()`, `getUTCMonth()`, etc.). É proibido o uso de `Intl.DateTimeFormat().resolvedOptions().timeZone` para definir fuso horário do usuário ou do servidor.
- O fuso horário do usuário é obtido exclusivamente do perfil do usuário (`User.timezone`) ou do cabeçalho de atividade do dispositivo, com validação IANA.

### 2. Defesa em Profundidade no Banco de Dados
- Configuração do timezone padrão no nível do banco e da role de aplicação:
  ```sql
  ALTER DATABASE vita_saude_staging SET timezone TO 'UTC';
  ALTER ROLE vita_staging_app SET timezone TO 'UTC';
  ```
- No `PrismaService.onModuleInit()`, execução de `SET TIME ZONE 'UTC'` e auditoria via `SHOW TIMEZONE`.
- Adição de 5 CHECK constraints na migration `20260921220000_temporal_invariants_and_utc_fencing`:
  - `chk_imported_file_processing_started_at`: `processingStartedAt IS NULL OR processingStartedAt >= createdAt`
  - `chk_imported_file_processed_at`: `processedAt IS NULL OR processedAt >= createdAt`
  - `chk_imported_file_duration_positive`: `processingDurationMs IS NULL OR processingDurationMs >= 0`
  - `chk_workout_activity_finished_at`: `finishedAt IS NULL OR finishedAt >= startedAt`
  - `chk_sync_execution_completed_at`: `completedAt IS NULL OR completedAt >= startedAt`

### 3. Fencing e Heartbeat de Lease
- O controle de concorrência e fencing utiliza `leaseVersion` do tipo `BigInt`, incrementado atomicamente via `UPDATE ... RETURNING`.
- Workers zumbis ou com leases expirados são abortados com `FencingViolationError` e rollback transacional total no commit.

### 4. Readiness Probe e Falha Rápida
- O endpoint de prontidão (`/health/readiness`) executa `SELECT current_setting('timezone')` a cada verificação. Se qualquer conexão do pool reportar timezone diferente de `UTC`, o serviço retorna imediatamente HTTP 503 Service Unavailable.

## Consequências
- Imutabilidade e consistência causal garantida entre eventos de ingestão, fila e projeção canônica.
- Impossibilidade de gravação de registros inconsistentes no banco, mesmo em cenários de partição ou dessincronia de relógio.
- Proteção total contra deslocamentos de fuso horário local.
