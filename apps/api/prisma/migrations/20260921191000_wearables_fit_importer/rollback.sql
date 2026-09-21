-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: 20260921191000_wearables_fit_importer
-- Descrição: Script de reversão completa para o Gate G1
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Remover Foreign Key e Coluna de WorkoutSession
ALTER TABLE "WorkoutSession" DROP CONSTRAINT IF EXISTS "WorkoutSession_workoutActivityId_fkey";
DROP INDEX IF EXISTS "WorkoutSession_workoutActivityId_key";
ALTER TABLE "WorkoutSession" DROP COLUMN IF EXISTS "workoutActivityId";

-- 2. Remover Tabelas em Ordem Reversa de Dependência
DROP TABLE IF EXISTS "ConsentRecord" CASCADE;
DROP TABLE IF EXISTS "SyncExecution" CASCADE;
DROP TABLE IF EXISTS "WorkoutTelemetry" CASCADE;
DROP TABLE IF EXISTS "WorkoutLap" CASCADE;
DROP TABLE IF EXISTS "ActivitySource" CASCADE;
DROP TABLE IF EXISTS "WorkoutActivity" CASCADE;
DROP TABLE IF EXISTS "ImportedFile" CASCADE;

-- 3. Remover Enums
DROP TYPE IF EXISTS "SyncExecutionStatus";
DROP TYPE IF EXISTS "SyncExecutionType";
DROP TYPE IF EXISTS "ConsentStatus";
DROP TYPE IF EXISTS "ConsentType";
DROP TYPE IF EXISTS "SportCategory";
DROP TYPE IF EXISTS "ActivitySourceType";
DROP TYPE IF EXISTS "ImportStatus";
DROP TYPE IF EXISTS "WearableProvider";
