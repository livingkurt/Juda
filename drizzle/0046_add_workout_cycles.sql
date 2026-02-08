-- Add WorkoutCycle table and migrate WorkoutSection to reference cycles instead of programs
-- This enables multi-cycle workout programs where each cycle has its own sections, days, exercises, and weekly progressions

-- 1. Create WorkoutCycle table
CREATE TABLE IF NOT EXISTS "WorkoutCycle" (
  "id" text PRIMARY KEY NOT NULL,
  "programId" text NOT NULL,
  "name" text NOT NULL DEFAULT 'Cycle 1',
  "numberOfWeeks" integer NOT NULL DEFAULT 1,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WorkoutCycle_programId_idx" ON "WorkoutCycle" ("programId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkoutCycle_programId_WorkoutProgram_id_fk'
  ) THEN
    ALTER TABLE "WorkoutCycle" ADD CONSTRAINT "WorkoutCycle_programId_WorkoutProgram_id_fk"
      FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add cycleId column to WorkoutSection (nullable initially for migration)
ALTER TABLE "WorkoutSection" ADD COLUMN IF NOT EXISTS "cycleId" text;

-- 3. Migrate existing data: create a cycle per program and link sections
DO $$
DECLARE
  program_record RECORD;
  cycle_id TEXT;
BEGIN
  FOR program_record IN
    SELECT id, "numberOfWeeks" FROM "WorkoutProgram"
  LOOP
    -- Generate a CUID-like ID for the cycle
    cycle_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25);

    -- Create a default cycle for each existing program
    INSERT INTO "WorkoutCycle" ("id", "programId", "name", "numberOfWeeks", "order", "createdAt", "updatedAt")
    VALUES (
      cycle_id,
      program_record.id,
      'Cycle 1',
      COALESCE(program_record."numberOfWeeks", 1),
      0,
      now(),
      now()
    );

    -- Point all existing sections for this program to the new cycle
    UPDATE "WorkoutSection"
    SET "cycleId" = cycle_id
    WHERE "programId" = program_record.id;
  END LOOP;
END $$;

-- 4. Make cycleId NOT NULL now that all rows have values
ALTER TABLE "WorkoutSection" ALTER COLUMN "cycleId" SET NOT NULL;

-- 5. Add foreign key and index for cycleId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkoutSection_cycleId_WorkoutCycle_id_fk'
  ) THEN
    ALTER TABLE "WorkoutSection" ADD CONSTRAINT "WorkoutSection_cycleId_WorkoutCycle_id_fk"
      FOREIGN KEY ("cycleId") REFERENCES "WorkoutCycle"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "WorkoutSection_cycleId_idx" ON "WorkoutSection" ("cycleId");

-- 6. Drop old programId column and index from WorkoutSection
DROP INDEX IF EXISTS "WorkoutSection_programId_idx";
ALTER TABLE "WorkoutSection" DROP COLUMN IF EXISTS "programId";

-- 7. Remove numberOfWeeks from WorkoutProgram (now lives on WorkoutCycle)
ALTER TABLE "WorkoutProgram" DROP COLUMN IF EXISTS "numberOfWeeks";
