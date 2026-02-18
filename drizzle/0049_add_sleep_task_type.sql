-- Custom SQL migration file, put your code below! --

-- Drop the SleepEntry table (we're moving sleep data into the task completion system)
DROP TABLE IF EXISTS "SleepEntry";

-- Add sleepData JSONB field to the Task table
ALTER TABLE "Task" ADD COLUMN "sleepData" jsonb;