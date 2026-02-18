CREATE TABLE IF NOT EXISTS "SleepEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"sleepStart" timestamp,
	"sleepEnd" timestamp,
	"durationMinutes" integer,
	"source" text DEFAULT 'manual',
	"quality" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SleepEntry_userId_date_unique" UNIQUE("userId","date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "SleepEntry_userId_idx" ON "SleepEntry" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "SleepEntry_date_idx" ON "SleepEntry" USING btree ("date");
--> statement-breakpoint
ALTER TABLE "SleepEntry" ADD CONSTRAINT "SleepEntry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
