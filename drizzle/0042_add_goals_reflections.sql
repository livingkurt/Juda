-- Add goalData JSONB field to Task table
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "goalData" jsonb;

-- Add reflectionData JSONB field to Task table
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "reflectionData" jsonb;

-- Add goalYear field to Task table (for filtering goals by year)
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "goalYear" integer;

-- Add goalMonths field to Task table (array of months 1-12 a goal spans)
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "goalMonths" jsonb;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "Task_goalYear_idx" ON "Task" ("goalYear")
WHERE
  "completionType" = 'goal';

CREATE INDEX IF NOT EXISTS "Task_completionType_idx" ON "Task" ("completionType");