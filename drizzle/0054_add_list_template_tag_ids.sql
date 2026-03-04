-- Add tagIds column to ListTemplate table
ALTER TABLE "ListTemplate" ADD COLUMN IF NOT EXISTS "tagIds" jsonb DEFAULT '[]'::jsonb;
