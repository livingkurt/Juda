-- Add NoteFolder table for organizing notes
CREATE TABLE IF NOT EXISTS "NoteFolder" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text DEFAULT 'folder',
  "color" text DEFAULT '#6b7280',
  "order" integer DEFAULT 0 NOT NULL,
  "parentId" text REFERENCES "NoteFolder"("id") ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Add SmartFolder table for tag-based dynamic folders
CREATE TABLE IF NOT EXISTS "SmartFolder" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text DEFAULT 'zap',
  "color" text DEFAULT '#8b5cf6',
  "order" integer DEFAULT 0 NOT NULL,
  "filters" jsonb DEFAULT '{"tags":[],"operator":"any"}'::jsonb NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Add new columns to Task table for notes functionality
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "folderId" text REFERENCES "NoteFolder"("id") ON DELETE SET NULL;

-- Update completionType to allow 'note' value (already has default 'checkbox')
-- No ALTER needed since it's just text, but document the valid values: 'checkbox' | 'text' | 'note'

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "NoteFolder_userId_idx" ON "NoteFolder"("userId");
CREATE INDEX IF NOT EXISTS "SmartFolder_userId_idx" ON "SmartFolder"("userId");
