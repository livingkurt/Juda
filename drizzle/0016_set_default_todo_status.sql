-- Set status to 'todo' for any tasks that have NULL status
-- This ensures all non-recurring tasks have a status set
UPDATE "Task"
SET "status" = 'todo'
WHERE "status" IS NULL;

-- Also ensure any tasks without a status (edge case) get set to 'todo'
-- This handles any edge cases where status might be empty string or invalid
UPDATE "Task"
SET "status" = 'todo'
WHERE "status" IS NULL OR "status" = '';
