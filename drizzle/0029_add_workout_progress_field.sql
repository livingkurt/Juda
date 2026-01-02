-- Add progress field to WorkoutProgram table to track current workout completion
-- Progress is stored as a float between 0.0 (0%) and 1.0 (100%)
-- This represents the overall completion percentage of the current workout session
ALTER TABLE "WorkoutProgram"
ADD COLUMN "progress" real DEFAULT 0.0;