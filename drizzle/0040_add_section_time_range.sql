-- Add time range fields to Section table
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "startTime" text;
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "endTime" text;
