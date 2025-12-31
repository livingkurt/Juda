-- Remove deprecated 'skipped' column from TaskCompletion table
-- This column is no longer needed as we use 'outcome' field instead
ALTER TABLE "TaskCompletion"
DROP COLUMN IF EXISTS "skipped";