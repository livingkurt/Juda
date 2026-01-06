-- Add unit field to WorkoutSetCompletion table
-- This preserves the unit (reps, secs, mins, miles) at the time of completion
-- so historical data remains accurate even if the exercise unit changes later
ALTER TABLE "WorkoutSetCompletion"
ADD COLUMN IF NOT EXISTS "unit" text;

-- Backfill unit from Exercise table for ALL existing completions
-- This ensures all historical data has the unit preserved, even if the exercise unit changes later
UPDATE "WorkoutSetCompletion" wsc
SET
  "unit" = e."unit"
FROM
  "Exercise" e
WHERE
  wsc."exerciseId" = e."id"
  AND wsc."unit" IS NULL;