-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20260921191000_wearables_fit_importer
-- Descrição: Criação das tabelas de Wearables e Importador FIT (Gate G1)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Enums
CREATE TYPE "WearableProvider" AS ENUM ('GARMIN', 'MANUAL_FIT', 'STRAVA', 'OTHER');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'DUPLICATE', 'FAILED', 'CANCELLED');
CREATE TYPE "ActivitySourceType" AS ENUM ('FIT_FILE', 'ACTIVITY_API', 'PUSH_WEBHOOK', 'MANUAL_INPUT');
CREATE TYPE "SportCategory" AS ENUM ('RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH_TRAINING', 'WALKING', 'HIIT', 'CARDIO', 'OTHER');
CREATE TYPE "ConsentType" AS ENUM ('WEARABLE_DATA_PROCESSING', 'LOCATION_DATA_PROCESSING', 'HEALTH_METRICS_STORAGE');
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "SyncExecutionType" AS ENUM ('FILE_IMPORT', 'PULL', 'PUSH_WEBHOOK');
CREATE TYPE "SyncExecutionStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- 2. Tabela: ImportedFile
CREATE TABLE "ImportedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" "WearableProvider" NOT NULL DEFAULT 'MANUAL_FIT',
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'LOCAL',
    "fileSizeBytes" INTEGER NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/vnd.ant.fit',
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "workerPid" INTEGER,
    "processingStartedAt" TIMESTAMP(3),
    "processingDurationMs" INTEGER,
    "processedAt" TIMESTAMP(3),
    "retentionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ImportedFile_storageKey_key" ON "ImportedFile"("storageKey");
CREATE UNIQUE INDEX "ImportedFile_userId_fileSha256_key" ON "ImportedFile"("userId", "fileSha256");
CREATE INDEX "ImportedFile_userId_status_idx" ON "ImportedFile"("userId", "status");

-- 3. Tabela: WorkoutActivity (Canônica)
CREATE TABLE "WorkoutActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sportCategory" "SportCategory" NOT NULL DEFAULT 'OTHER',
    "sportNameOriginal" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "localDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Campo_Grande',
    "timezoneOffsetMinutes" INTEGER NOT NULL DEFAULT -240,
    "timezoneConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "durationSeconds" INTEGER NOT NULL,
    "movingDurationSeconds" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "elevationGainMeters" DOUBLE PRECISION,
    "elevationLossMeters" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPaceSecMeter" DOUBLE PRECISION,
    "avgCadence" DOUBLE PRECISION,
    "maxCadence" DOUBLE PRECISION,
    "totalCaloriesEstimated" DOUBLE PRECISION,
    "aerobicTrainingEffect" DOUBLE PRECISION,
    "anaerobicTrainingEffect" DOUBLE PRECISION,
    "deviceManufacturer" TEXT,
    "deviceModel" TEXT,
    "dataVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkoutActivity_userId_startedAt_idx" ON "WorkoutActivity"("userId", "startedAt");
CREATE INDEX "WorkoutActivity_userId_localDate_idx" ON "WorkoutActivity"("userId", "localDate");

-- 4. Tabela: ActivitySource (Rastreabilidade de Fontes)
CREATE TABLE "ActivitySource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "provider" "WearableProvider" NOT NULL,
    "sourceType" "ActivitySourceType" NOT NULL,
    "importedFileId" TEXT,
    "sessionIndex" INTEGER NOT NULL DEFAULT 0,
    "externalActivityId" TEXT,
    "sourceHash" TEXT,
    "metadata" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySource_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "WorkoutActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitySource_importedFileId_fkey" FOREIGN KEY ("importedFileId") REFERENCES "ImportedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ActivitySource_activityId_idx" ON "ActivitySource"("activityId");
CREATE INDEX "ActivitySource_importedFileId_idx" ON "ActivitySource"("importedFileId");

-- Índices Parciais SQL Obrigatórios (Ajuste 2 da Auditoria)
CREATE UNIQUE INDEX "activity_source_imported_file_session_idx" 
ON "ActivitySource"("importedFileId", "sessionIndex") 
WHERE "importedFileId" IS NOT NULL;

CREATE UNIQUE INDEX "activity_source_provider_external_id_idx" 
ON "ActivitySource"("provider", "externalActivityId") 
WHERE "externalActivityId" IS NOT NULL;

-- 5. Tabela: WorkoutLap
CREATE TABLE "WorkoutLap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "totalTimeSeconds" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION,
    "avgSpeedMeterSec" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "caloriesEstimated" DOUBLE PRECISION,
    CONSTRAINT "WorkoutLap_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "WorkoutActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkoutLap_activityId_lapIndex_key" ON "WorkoutLap"("activityId", "lapIndex");
CREATE INDEX "WorkoutLap_activityId_idx" ON "WorkoutLap"("activityId");

-- 6. Tabela: WorkoutTelemetry
CREATE TABLE "WorkoutTelemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "formatVersion" INTEGER NOT NULL DEFAULT 1,
    "samplingRateSeconds" INTEGER NOT NULL DEFAULT 5,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "hasLocationData" BOOLEAN NOT NULL DEFAULT false,
    "samples" JSONB NOT NULL,
    "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutTelemetry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "WorkoutActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkoutTelemetry_activityId_key" ON "WorkoutTelemetry"("activityId");
CREATE INDEX "WorkoutTelemetry_retentionExpiresAt_idx" ON "WorkoutTelemetry"("retentionExpiresAt");

-- 7. Tabela: SyncExecution (Auditoria - Preservada em Caso de Exclusão de Conta)
CREATE TABLE "SyncExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userPseudonym" TEXT NOT NULL,
    "provider" "WearableProvider" NOT NULL,
    "executionType" "SyncExecutionType" NOT NULL,
    "status" "SyncExecutionStatus" NOT NULL,
    "recordsIngested" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    CONSTRAINT "SyncExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SyncExecution_userId_startedAt_idx" ON "SyncExecution"("userId", "startedAt");
CREATE INDEX "SyncExecution_userPseudonym_startedAt_idx" ON "SyncExecution"("userPseudonym", "startedAt");

-- 8. Tabela: ConsentRecord (Governança & LGPD - Preservada em Caso de Exclusão)
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userPseudonym" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT '1.0',
    "status" "ConsentStatus" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");
CREATE INDEX "ConsentRecord_userPseudonym_consentType_idx" ON "ConsentRecord"("userPseudonym", "consentType");

-- 9. Extensão em WorkoutSession (Projeção Idempotente)
ALTER TABLE "WorkoutSession" ADD COLUMN "workoutActivityId" TEXT;
CREATE UNIQUE INDEX "WorkoutSession_workoutActivityId_key" ON "WorkoutSession"("workoutActivityId");
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutActivityId_fkey" 
FOREIGN KEY ("workoutActivityId") REFERENCES "WorkoutActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
