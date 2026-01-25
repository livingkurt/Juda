-- Add selectionData JSONB field to Task table
-- This stores preconfigured dropdown options for selection-type tasks
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "selectionData" jsonb;