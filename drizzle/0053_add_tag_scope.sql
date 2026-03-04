-- Add scope column to Tag table for isolating list tags from task tags
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'task' NOT NULL;
CREATE INDEX IF NOT EXISTS "Tag_scope_idx" ON "Tag" ("scope");

-- Add tagIds jsonb column to ListTemplate for template-level tags
ALTER TABLE "ListTemplate" ADD COLUMN IF NOT EXISTS "tagIds" jsonb DEFAULT '[]';
