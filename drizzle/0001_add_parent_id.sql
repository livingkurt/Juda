-- Add parentId column to Task table for subtask relationships
-- This allows tasks to have parent-child relationships

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentId" text;

-- Add foreign key constraint for self-referencing relationship
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_parentId_Task_id_fk') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_Task_id_fk"
        FOREIGN KEY ("parentId") REFERENCES "public"."Task"("id")
        ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Add index on parentId for better query performance
CREATE INDEX IF NOT EXISTS "Task_parentId_idx" ON "Task"("parentId");

-- Drop the old subtasks JSON column (we'll migrate data first if needed)
-- Commented out for now - will handle data migration separately
-- ALTER TABLE "Task" DROP COLUMN IF EXISTS "subtasks";

