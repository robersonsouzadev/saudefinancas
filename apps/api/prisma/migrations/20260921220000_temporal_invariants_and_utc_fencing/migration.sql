-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20260921220000_temporal_invariants_and_utc_fencing
-- Descrição: Invariantes temporais e checagem de consistência UTC
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Invariantes temporais em ImportedFile
ALTER TABLE "ImportedFile"
  ADD CONSTRAINT "chk_imported_file_processing_started_at"
  CHECK ("processingStartedAt" IS NULL OR "processingStartedAt" >= "createdAt");

ALTER TABLE "ImportedFile"
  ADD CONSTRAINT "chk_imported_file_processed_at"
  CHECK ("processedAt" IS NULL OR "processedAt" >= "createdAt");

ALTER TABLE "ImportedFile"
  ADD CONSTRAINT "chk_imported_file_duration_positive"
  CHECK ("processingDurationMs" IS NULL OR "processingDurationMs" >= 0);

-- 2. Invariantes temporais em WorkoutActivity
ALTER TABLE "WorkoutActivity"
  ADD CONSTRAINT "chk_workout_activity_finished_at"
  CHECK ("finishedAt" IS NULL OR "finishedAt" >= "startedAt");

-- 3. Invariantes temporais em SyncExecution
ALTER TABLE "SyncExecution"
  ADD CONSTRAINT "chk_sync_execution_completed_at"
  CHECK ("completedAt" IS NULL OR "completedAt" >= "startedAt");
