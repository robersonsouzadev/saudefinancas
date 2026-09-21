-- CreateExtension
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "MedicationType" AS ENUM ('MEDICAMENTO', 'VITAMINA', 'SUPLEMENTO', 'FITOTERAPICO');

-- CreateEnum
CREATE TYPE "MedicationCategory" AS ENUM ('CONTINUO', 'TEMPORARIO', 'SOS');

-- CreateEnum
CREATE TYPE "MedicationPriority" AS ENUM ('CRITICO', 'IMPORTANTE', 'ROTINA');

-- CreateEnum
CREATE TYPE "SchedulePeriod" AS ENUM ('MADRUGADA', 'MANHA', 'TARDE', 'NOITE');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DIARIO', 'DIAS_ALTERNADOS', 'SEMANAL', 'INTERVALO_HORAS');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('PENDENTE', 'TOMADO', 'ATRASADO', 'PULADO');

-- CreateEnum
CREATE TYPE "ExamSourceType" AS ENUM ('PHOTO', 'PDF', 'MANUAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "BiomarkerCategory" AS ENUM ('HEMOGRAMA', 'LIPIDIOS', 'METABOLICO', 'TIREOIDE', 'HEPATICO', 'RENAL', 'VITAMINAS_MINERAIS', 'HORMONIOS', 'INFLAMACAO', 'MARCADORES_TUMORAIS', 'URINARIO', 'OUTROS');

-- CreateEnum
CREATE TYPE "BiomarkerStatus" AS ENUM ('CRITICO_BAIXO', 'BAIXO', 'NORMAL', 'OTIMO', 'ALTO', 'CRITICO_ALTO');

-- CreateEnum
CREATE TYPE "AssessmentSourceType" AS ENUM ('MANUAL', 'IMPORTED', 'OCR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "birthDate" TIMESTAMP(3),
    "biologicalSex" "BiologicalSex",
    "heightCm" DOUBLE PRECISION,
    "uazapiInstance" TEXT,
    "uazapiToken" TEXT,
    "timezone" TEXT DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "modelName" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "department" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "uazapiInstanceName" TEXT,
    "uazapiToken" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "title" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'PDF',
    "totalChunks" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "embedding" TEXT,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyHealthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "bedTime" TEXT,
    "wakeTime" TEXT,
    "sleepFactors" TEXT,
    "waterIntakeMl" INTEGER NOT NULL DEFAULT 0,
    "waterGoalMl" INTEGER NOT NULL DEFAULT 2500,
    "moodScore" INTEGER,
    "moodTags" TEXT,
    "energyLevel" INTEGER,
    "stressLevel" INTEGER,
    "exerciseMinutes" INTEGER,
    "exerciseType" TEXT,
    "exerciseIntensity" TEXT,
    "symptoms" TEXT,
    "notes" TEXT,
    "vitalityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLogDate" TIMESTAMP(3),
    "shieldsRemaining" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HydrationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyGoalMl" INTEGER NOT NULL DEFAULT 2500,
    "useOmsCalculation" BOOLEAN NOT NULL DEFAULT true,
    "reminderInterval" INTEGER NOT NULL DEFAULT 90,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "endHour" INTEGER NOT NULL DEFAULT 21,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HydrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "neckCm" DOUBLE PRECISION,
    "shoulderCm" DOUBLE PRECISION,
    "abdomenCm" DOUBLE PRECISION,
    "leftBicepCm" DOUBLE PRECISION,
    "rightBicepCm" DOUBLE PRECISION,
    "leftForearmCm" DOUBLE PRECISION,
    "rightForearmCm" DOUBLE PRECISION,
    "leftThighCm" DOUBLE PRECISION,
    "rightThighCm" DOUBLE PRECISION,
    "leftCalfCm" DOUBLE PRECISION,
    "rightCalfCm" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL DEFAULT 'SNACK',
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealTime" TEXT,
    "totalCalories" DOUBLE PRECISION,
    "totalProtein" DOUBLE PRECISION,
    "totalCarbs" DOUBLE PRECISION,
    "totalFat" DOUBLE PRECISION,
    "totalFiber" DOUBLE PRECISION,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tacoId" INTEGER,
    "weightG" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "isManual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectiveType" TEXT NOT NULL DEFAULT 'MAINTAIN',
    "targetCalories" INTEGER NOT NULL DEFAULT 2200,
    "targetProteinG" INTEGER NOT NULL DEFAULT 140,
    "targetCarbsG" INTEGER NOT NULL DEFAULT 250,
    "targetFatG" INTEGER NOT NULL DEFAULT 65,
    "targetFiberG" INTEGER DEFAULT 25,
    "activityLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacoFood" (
    "id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION,
    "calciumMg" DOUBLE PRECISION,
    "ironMg" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "potassiumMg" DOUBLE PRECISION,
    "vitaminCMg" DOUBLE PRECISION,

    CONSTRAINT "TacoFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "type" "MedicationType" NOT NULL DEFAULT 'MEDICAMENTO',
    "category" "MedicationCategory" NOT NULL DEFAULT 'CONTINUO',
    "priority" "MedicationPriority" NOT NULL DEFAULT 'IMPORTANTE',
    "dosage" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "instructions" TEXT,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "stockAlertAt" INTEGER NOT NULL DEFAULT 5,
    "costPerUnit" DOUBLE PRECISION,
    "pharmacy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#5e6ad2',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSchedule" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "windowMinutes" INTEGER NOT NULL DEFAULT 30,
    "period" "SchedulePeriod" NOT NULL DEFAULT 'MANHA',
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'DIARIO',
    "intervalHours" INTEGER,
    "weekDays" TEXT,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "escalateToFamily" BOOLEAN NOT NULL DEFAULT false,
    "escalateAfterMin" INTEGER NOT NULL DEFAULT 45,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationIntakeLog" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "loggedAt" TIMESTAMP(3),
    "status" "IntakeStatus" NOT NULL DEFAULT 'PENDENTE',
    "skipReason" TEXT,
    "whatsappSentAt" TIMESTAMP(3),
    "whatsappReadAt" TIMESTAMP(3),
    "respondedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationIntakeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "laboratory" TEXT,
    "examDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" "ExamSourceType" NOT NULL DEFAULT 'PHOTO',
    "originalFile" TEXT,
    "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
    "aiInsight" TEXT,
    "phenoAge" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "biomarkerKey" TEXT NOT NULL,
    "biomarkerName" TEXT NOT NULL,
    "category" "BiomarkerCategory" NOT NULL DEFAULT 'METABOLICO',
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceMin" DOUBLE PRECISION,
    "referenceMax" DOUBLE PRECISION,
    "optimalMin" DOUBLE PRECISION,
    "optimalMax" DOUBLE PRECISION,
    "status" "BiomarkerStatus" NOT NULL DEFAULT 'NORMAL',
    "delta" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomarkerReference" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BiomarkerCategory" NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "standardMin" DOUBLE PRECISION,
    "standardMax" DOUBLE PRECISION,
    "optimalMin" DOUBLE PRECISION,
    "optimalMax" DOUBLE PRECISION,
    "criticalLow" DOUBLE PRECISION,
    "criticalHigh" DOUBLE PRECISION,
    "synonyms" TEXT,
    "description" TEXT,

    CONSTRAINT "BiomarkerReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT,
    "muscleGroup" TEXT NOT NULL,
    "secondaryMuscle" TEXT,
    "equipment" TEXT,
    "gifUrl" TEXT,
    "imageUrl" TEXT,
    "instructions" TEXT,
    "metValue" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER,
    "color" TEXT DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "targetSets" INTEGER NOT NULL DEFAULT 3,
    "targetReps" INTEGER NOT NULL DEFAULT 12,
    "targetWeight" DOUBLE PRECISION,
    "restSeconds" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "totalVolume" DOUBLE PRECISION,
    "caloriesBurned" DOUBLE PRECISION,
    "intensity" TEXT NOT NULL DEFAULT 'MODERATE',
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSessionExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "isDropset" BOOLEAN NOT NULL DEFAULT false,
    "rpe" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actionType" TEXT,
    "actionPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessorName" TEXT,
    "equipmentName" TEXT,
    "notes" TEXT,
    "sourceType" "AssessmentSourceType" NOT NULL DEFAULT 'MANUAL',
    "weightKg" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" "BiologicalSex" NOT NULL,
    "waistCm" DOUBLE PRECISION,
    "fatMassKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "leanMassKg" DOUBLE PRECISION,
    "leanMassPercent" DOUBLE PRECISION,
    "skeletalMuscleMassKg" DOUBLE PRECISION,
    "skeletalMusclePercent" DOUBLE PRECISION,
    "muscleFatRatio" DOUBLE PRECISION,
    "totalBodyWaterL" DOUBLE PRECISION,
    "totalBodyWaterPercent" DOUBLE PRECISION,
    "leanMassWaterPercent" DOUBLE PRECISION,
    "hydrationIndex" DOUBLE PRECISION,
    "intracellularWaterL" DOUBLE PRECISION,
    "intracellularWaterPercent" DOUBLE PRECISION,
    "extracellularWaterL" DOUBLE PRECISION,
    "extracellularWaterPercent" DOUBLE PRECISION,
    "basalMetabolicRate" DOUBLE PRECISION,
    "phaseAngle" DOUBLE PRECISION,
    "cellularAge" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "waistHeightRatio" DOUBLE PRECISION,
    "previousAssessmentId" TEXT,
    "deltaWeight" DOUBLE PRECISION,
    "deltaFatPercent" DOUBLE PRECISION,
    "deltaFatMass" DOUBLE PRECISION,
    "deltaLeanMass" DOUBLE PRECISION,
    "deltaMuscleMass" DOUBLE PRECISION,
    "deltaWaist" DOUBLE PRECISION,
    "deltaPhaseAngle" DOUBLE PRECISION,
    "deltaIntracellularWater" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyAssessmentGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "deadlineMonths" INTEGER,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyAssessmentGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyIndicatorReference" (
    "id" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "sex" "BiologicalSex" NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "optimalMin" DOUBLE PRECISION,
    "optimalMax" DOUBLE PRECISION,
    "attentionMin" DOUBLE PRECISION,
    "attentionMax" DOUBLE PRECISION,
    "criticalMin" DOUBLE PRECISION,
    "criticalMax" DOUBLE PRECISION,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyIndicatorReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappPhone_key" ON "User"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_userId_groupId_key" ON "FamilyMember"("userId", "groupId");

-- CreateIndex
CREATE INDEX "DailyHealthLog_userId_date_idx" ON "DailyHealthLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealthLog_userId_date_key" ON "DailyHealthLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HealthStreak_userId_key" ON "HealthStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HydrationSetting_userId_key" ON "HydrationSetting"("userId");

-- CreateIndex
CREATE INDEX "BodyMeasurement_userId_measuredAt_idx" ON "BodyMeasurement"("userId", "measuredAt");

-- CreateIndex
CREATE INDEX "MealLog_userId_loggedAt_idx" ON "MealLog"("userId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_userId_key" ON "NutritionGoal"("userId");

-- CreateIndex
CREATE INDEX "TacoFood_name_idx" ON "TacoFood"("name");

-- CreateIndex
CREATE INDEX "LabResult_examId_biomarkerKey_idx" ON "LabResult"("examId", "biomarkerKey");

-- CreateIndex
CREATE UNIQUE INDEX "BiomarkerReference_key_key" ON "BiomarkerReference"("key");

-- CreateIndex
CREATE INDEX "Exercise_muscleGroup_idx" ON "Exercise"("muscleGroup");

-- CreateIndex
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateItem_templateId_idx" ON "WorkoutTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_idx" ON "WorkoutSession"("userId");

-- CreateIndex
CREATE INDEX "WorkoutSession_startedAt_idx" ON "WorkoutSession"("startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_sessionId_idx" ON "WorkoutSessionExercise"("sessionId");

-- CreateIndex
CREATE INDEX "ExerciseSet_sessionExerciseId_idx" ON "ExerciseSet"("sessionExerciseId");

-- CreateIndex
CREATE INDEX "CoachChatSession_userId_createdAt_idx" ON "CoachChatSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachChatMessage_sessionId_createdAt_idx" ON "CoachChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "BodyAssessment_userId_assessmentDate_idx" ON "BodyAssessment"("userId", "assessmentDate");

-- CreateIndex
CREATE INDEX "BodyAssessment_userId_createdAt_idx" ON "BodyAssessment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BodyAssessmentGoal_userId_isActive_idx" ON "BodyAssessmentGoal"("userId", "isActive");

-- CreateIndex
CREATE INDEX "BodyIndicatorReference_indicator_sex_idx" ON "BodyIndicatorReference"("indicator", "sex");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHealthLog" ADD CONSTRAINT "DailyHealthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthStreak" ADD CONSTRAINT "HealthStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrationSetting" ADD CONSTRAINT "HydrationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealLogId_fkey" FOREIGN KEY ("mealLogId") REFERENCES "MealLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGoal" ADD CONSTRAINT "HealthGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightLog" ADD CONSTRAINT "InsightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntakeLog" ADD CONSTRAINT "MedicationIntakeLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntakeLog" ADD CONSTRAINT "MedicationIntakeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "LabExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateItem" ADD CONSTRAINT "WorkoutTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateItem" ADD CONSTRAINT "WorkoutTemplateItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "WorkoutSessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachChatSession" ADD CONSTRAINT "CoachChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachChatMessage" ADD CONSTRAINT "CoachChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyAssessment" ADD CONSTRAINT "BodyAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyAssessmentGoal" ADD CONSTRAINT "BodyAssessmentGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
