-- Manual Migration for missing fields
-- Added safely with IF NOT EXISTS to prevent errors if partial state exists

-- User Fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTempPassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "batch" TEXT;

-- Team Fields
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "batch" TEXT;

-- Exam Fields
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

-- ExamSection Fields
ALTER TABLE "ExamSection" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;
ALTER TABLE "ExamSection" ADD COLUMN IF NOT EXISTS "cutoffMarks" DOUBLE PRECISION;
