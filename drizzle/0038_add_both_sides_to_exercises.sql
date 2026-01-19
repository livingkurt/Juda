-- Add bothSides field to Exercise table
-- This allows exercises to be marked as requiring both sides (e.g., left and right)
ALTER TABLE "Exercise"
ADD COLUMN IF NOT EXISTS "bothSides" BOOLEAN NOT NULL DEFAULT FALSE;