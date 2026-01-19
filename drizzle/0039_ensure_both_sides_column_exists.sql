-- Ensure bothSides column exists in Exercise table
-- This migration is idempotent and safe to run multiple times
ALTER TABLE "Exercise"
ADD COLUMN IF NOT EXISTS "bothSides" BOOLEAN NOT NULL DEFAULT FALSE;
