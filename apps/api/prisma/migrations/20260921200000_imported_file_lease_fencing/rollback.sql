-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: 20260921200000_imported_file_lease_fencing
-- Descrição: Reversão exclusiva das colunas e índice da migration de lease
-- ════════════════════════════════════════════════════════════════════════════

-- 1. DropIndex
DROP INDEX IF EXISTS "imported_file_status_lease_expires_at_idx";

-- 2. DropColumns
ALTER TABLE "ImportedFile" 
  DROP COLUMN IF EXISTS "leaseOwner",
  DROP COLUMN IF EXISTS "leaseExpiresAt",
  DROP COLUMN IF EXISTS "leaseVersion",
  DROP COLUMN IF EXISTS "recoverySequence";
