-- Remove 'name' field from existing workoutData JSONB objects
-- The task title is now used as the workout name instead

UPDATE "Task"
SET "workoutData" = "workoutData" - 'name'
WHERE "workoutData" IS NOT NULL
  AND "workoutData" ? 'name';
