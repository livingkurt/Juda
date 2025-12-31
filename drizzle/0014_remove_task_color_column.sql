-- Remove color column from Task table
-- Task colors are now derived from tags, so this column is no longer needed
ALTER TABLE "Task" DROP COLUMN IF EXISTS "color";
