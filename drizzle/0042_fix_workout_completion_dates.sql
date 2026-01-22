-- Fix WorkoutSetCompletion dates to be normalized to midnight UTC
-- This ensures they match API query expectations (API queries for dates at 00:00:00 UTC)
-- The restored data had dates with times (e.g., 23:00:00), which don't match API queries
UPDATE "WorkoutSetCompletion"
SET
  "date" = DATE_TRUNC ('day', "date")
WHERE
  DATE_TRUNC ('day', "date") != "date";