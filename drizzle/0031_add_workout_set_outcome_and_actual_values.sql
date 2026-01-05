-- Add outcome field and actual value fields to WorkoutSetCompletion table
-- This allows three-state completion (unchecked, completed, not_completed) and tracking actual performance
-- Add outcome field (null = unchecked, 'completed', 'not_completed')
ALTER TABLE "WorkoutSetCompletion"
ADD COLUMN IF NOT EXISTS "outcome" text;

-- Add actual reps field for reps-based exercises
ALTER TABLE "WorkoutSetCompletion"
ADD COLUMN IF NOT EXISTS "actualReps" integer;

-- Add actual time field for time-based exercises (stored in seconds)
ALTER TABLE "WorkoutSetCompletion"
ADD COLUMN IF NOT EXISTS "actualTime" integer;

-- Migrate existing data: if completed=true, set outcome='completed'
-- This ensures backward compatibility with existing workout completions
UPDATE "WorkoutSetCompletion"
SET
  "outcome" = 'completed'
WHERE
  "completed" = true
  AND "outcome" IS NULL;