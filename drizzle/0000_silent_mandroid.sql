-- Initial schema migration
-- Uses IF NOT EXISTS to be safe for existing databases

CREATE TABLE IF NOT EXISTS "Section" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"expanded" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TaskCompletion" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sectionId" text NOT NULL,
	"time" text,
	"duration" integer DEFAULT 30 NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"expanded" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"recurrence" jsonb,
	"subtasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add constraints and indexes only if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskCompletion_taskId_date_unique') THEN
        ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_date_unique" UNIQUE("taskId","date");
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskCompletion_taskId_Task_id_fk') THEN
        ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_sectionId_Section_id_fk') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_sectionId_Section_id_fk" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "TaskCompletion_taskId_idx" ON "TaskCompletion" USING btree ("taskId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "TaskCompletion_date_idx" ON "TaskCompletion" USING btree ("date");
