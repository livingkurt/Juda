-- Add section filters (tags + task types)
ALTER TABLE "Section"
ADD COLUMN IF NOT EXISTS "filterTagIds" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "Section"
ADD COLUMN IF NOT EXISTS "filterCompletionTypes" jsonb NOT NULL DEFAULT '[]'::jsonb;