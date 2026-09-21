-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20260921200000_imported_file_lease_fencing
-- Descrição: Lease formal, versionamento atômico e índice para reconciliação
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Adiciona colunas para lease formal, fencing e versionamento atômico
ALTER TABLE "ImportedFile" 
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "leaseVersion" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "recoverySequence" INTEGER NOT NULL DEFAULT 0;

-- 2. Índice composto para otimizar busca de jobs em processamento expirados pelo reconciliador
CREATE INDEX "imported_file_status_lease_expires_at_idx" 
  ON "ImportedFile"("status", "leaseExpiresAt");
