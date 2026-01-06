-- Add rollover fields to Task table
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sourceTaskId" text REFERENCES "Task"("id") ON DELETE SET NULL;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "rolledFromDate" timestamp;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isRollover" boolean DEFAULT false;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS "Task_sourceTaskId_idx" ON "Task"("sourceTaskId");
