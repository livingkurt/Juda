-- Add list task system and canonical list item library

-- 1. Extend Task with list metadata
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "taskKind" text NOT NULL DEFAULT 'default';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "listTemplateId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_listTemplateId_Task_id_fk'
  ) THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_listTemplateId_Task_id_fk"
      FOREIGN KEY ("listTemplateId") REFERENCES "Task"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Task_taskKind_idx" ON "Task" ("taskKind");
CREATE INDEX IF NOT EXISTS "Task_listTemplateId_idx" ON "Task" ("listTemplateId");

-- 2. Create canonical list item library table
CREATE TABLE IF NOT EXISTS "ListItem" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "name" text NOT NULL,
  "normalizedName" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ListItem_userId_User_id_fk'
  ) THEN
    ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_userId_User_id_fk"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ListItem_userId_normalizedName_unique'
  ) THEN
    ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_userId_normalizedName_unique"
      UNIQUE ("userId", "normalizedName");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ListItem_userId_idx" ON "ListItem" ("userId");
CREATE INDEX IF NOT EXISTS "ListItem_normalizedName_idx" ON "ListItem" ("normalizedName");

-- 3. Link list items to tasks (templates and instances)
CREATE TABLE IF NOT EXISTS "TaskListItem" (
  "id" text PRIMARY KEY NOT NULL,
  "taskId" text NOT NULL,
  "listItemId" text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_taskId_Task_id_fk'
  ) THEN
    ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_taskId_Task_id_fk"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_listItemId_ListItem_id_fk'
  ) THEN
    ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_listItemId_ListItem_id_fk"
      FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_taskId_listItemId_unique'
  ) THEN
    ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_taskId_listItemId_unique"
      UNIQUE ("taskId", "listItemId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TaskListItem_taskId_idx" ON "TaskListItem" ("taskId");
CREATE INDEX IF NOT EXISTS "TaskListItem_listItemId_idx" ON "TaskListItem" ("listItemId");