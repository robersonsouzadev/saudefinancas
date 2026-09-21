-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: 20260921220000_temporal_invariants_and_utc_fencing
-- Descrição: Reversão das constraints de invariantes temporais
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "ImportedFile" DROP CONSTRAINT IF EXISTS "chk_imported_file_processing_started_at";
ALTER TABLE "ImportedFile" DROP CONSTRAINT IF EXISTS "chk_imported_file_processed_at";
ALTER TABLE "ImportedFile" DROP CONSTRAINT IF EXISTS "chk_imported_file_duration_positive";

ALTER TABLE "WorkoutActivity" DROP CONSTRAINT IF EXISTS "chk_workout_activity_finished_at";

ALTER TABLE "SyncExecution" DROP CONSTRAINT IF EXISTS "chk_sync_execution_completed_at";
