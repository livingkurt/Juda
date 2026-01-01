-- Custom SQL migration file, put your code below! --
-- Add workoutData column to Task table
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "workoutData" jsonb;