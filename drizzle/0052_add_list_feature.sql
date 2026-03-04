-- Add List feature tables (template-based checklist system)

CREATE TABLE IF NOT EXISTS "ListItem" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ListItemTag" (
  "id" text PRIMARY KEY NOT NULL,
  "listItemId" text NOT NULL REFERENCES "ListItem"("id") ON DELETE CASCADE,
  "tagId" text NOT NULL REFERENCES "Tag"("id") ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ListItemTag_listItemId_tagId_unique" UNIQUE("listItemId", "tagId")
);

CREATE TABLE IF NOT EXISTS "ListTemplate" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "icon" text,
  "order" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ListTemplateItem" (
  "id" text PRIMARY KEY NOT NULL,
  "templateId" text NOT NULL REFERENCES "ListTemplate"("id") ON DELETE CASCADE,
  "listItemId" text NOT NULL REFERENCES "ListItem"("id") ON DELETE CASCADE,
  "order" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ListTemplateItem_templateId_listItemId_unique" UNIQUE("templateId", "listItemId")
);

CREATE TABLE IF NOT EXISTS "ListInstance" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "templateId" text REFERENCES "ListTemplate"("id") ON DELETE SET NULL,
  "taskId" text REFERENCES "Task"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "date" timestamp,
  "time" text,
  "status" text DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ListInstanceItem" (
  "id" text PRIMARY KEY NOT NULL,
  "instanceId" text NOT NULL REFERENCES "ListInstance"("id") ON DELETE CASCADE,
  "listItemId" text REFERENCES "ListItem"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "checked" boolean DEFAULT false NOT NULL,
  "checkedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ListItem_userId_idx" ON "ListItem" ("userId");
CREATE INDEX IF NOT EXISTS "ListItemTag_listItemId_idx" ON "ListItemTag" ("listItemId");
CREATE INDEX IF NOT EXISTS "ListItemTag_tagId_idx" ON "ListItemTag" ("tagId");
CREATE INDEX IF NOT EXISTS "ListTemplate_userId_idx" ON "ListTemplate" ("userId");
CREATE INDEX IF NOT EXISTS "ListTemplateItem_templateId_idx" ON "ListTemplateItem" ("templateId");
CREATE INDEX IF NOT EXISTS "ListTemplateItem_listItemId_idx" ON "ListTemplateItem" ("listItemId");
CREATE INDEX IF NOT EXISTS "ListInstance_userId_idx" ON "ListInstance" ("userId");
CREATE INDEX IF NOT EXISTS "ListInstance_templateId_idx" ON "ListInstance" ("templateId");
CREATE INDEX IF NOT EXISTS "ListInstance_taskId_idx" ON "ListInstance" ("taskId");
CREATE INDEX IF NOT EXISTS "ListInstanceItem_instanceId_idx" ON "ListInstanceItem" ("instanceId");
