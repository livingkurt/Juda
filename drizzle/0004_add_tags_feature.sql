-- Add Tag and TaskTag tables for tagging system

-- Create Tag table
CREATE TABLE IF NOT EXISTS "Tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create TaskTag junction table
CREATE TABLE IF NOT EXISTS "TaskTag" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"tagId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskTag_taskId_Task_id_fk') THEN
        ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskTag_tagId_Tag_id_fk') THEN
        ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_Tag_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint

-- Add unique constraint for task-tag pairs
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskTag_taskId_tagId_unique') THEN
        ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_tagId_unique" UNIQUE("taskId","tagId");
    END IF;
END $$;
--> statement-breakpoint

-- Add indexes
CREATE INDEX IF NOT EXISTS "TaskTag_taskId_idx" ON "TaskTag"("taskId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "TaskTag_tagId_idx" ON "TaskTag"("tagId");
--> statement-breakpoint
