-- Add selectedOptions JSONB field to TaskCompletion table
-- This stores an array of selected values for selection-type tasks
-- We keep the existing 'note' field for backward compatibility and single-selection tasks
ALTER TABLE "TaskCompletion"
ADD COLUMN IF NOT EXISTS "selectedOptions" jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single selections from 'note' field to 'selectedOptions' array
-- Only for tasks that have completionType = 'selection'
UPDATE "TaskCompletion" tc
SET "selectedOptions" = jsonb_build_array(tc.note)
FROM "Task" t
WHERE tc."taskId" = t.id
  AND t."completionType" = 'selection'
  AND tc.note IS NOT NULL
  AND tc.note != ''
  AND (tc."selectedOptions" IS NULL OR tc."selectedOptions" = '[]'::jsonb);
