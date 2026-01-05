-- Simplify actual value tracking by using a single generic field
-- Replace actualReps and actualTime with a single actualValue field
-- Add the new actualValue field
ALTER TABLE "WorkoutSetCompletion"
ADD COLUMN IF NOT EXISTS "actualValue" integer;

-- Migrate existing data: copy actualReps to actualValue if it exists
UPDATE "WorkoutSetCompletion"
SET
  "actualValue" = "actualReps"
WHERE
  "actualReps" IS NOT NULL
  AND "actualValue" IS NULL;

-- Migrate existing data: copy actualTime to actualValue if it exists and actualReps doesn't
UPDATE "WorkoutSetCompletion"
SET
  "actualValue" = "actualTime"
WHERE
  "actualTime" IS NOT NULL
  AND "actualValue" IS NULL;

-- Drop the old columns (they're now redundant)
ALTER TABLE "WorkoutSetCompletion"
DROP COLUMN IF EXISTS "actualReps";

ALTER TABLE "WorkoutSetCompletion"
DROP COLUMN IF EXISTS "actualTime";