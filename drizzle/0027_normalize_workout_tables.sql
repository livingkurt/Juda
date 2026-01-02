-- Normalize workoutData JSONB into relational tables
-- This migration creates 5 new tables: WorkoutProgram, WorkoutSection, WorkoutDay, Exercise, WeeklyProgression
-- AND migrates all existing workoutData from Task.workoutData into the new normalized structure

-- WorkoutProgram - Top level workout container, 1:1 with Task
CREATE TABLE IF NOT EXISTS "WorkoutProgram" (
  "id" text PRIMARY KEY NOT NULL,
  "taskId" text NOT NULL UNIQUE,
  "name" text,
  "numberOfWeeks" integer NOT NULL DEFAULT 1,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WorkoutProgram_taskId_idx" ON "WorkoutProgram" ("taskId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkoutProgram_taskId_Task_id_fk'
  ) THEN
    ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_taskId_Task_id_fk"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- WorkoutSection - Groups exercises (Warmup, Main, Cooldown, etc.)
CREATE TABLE IF NOT EXISTS "WorkoutSection" (
  "id" text PRIMARY KEY NOT NULL,
  "programId" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WorkoutSection_programId_idx" ON "WorkoutSection" ("programId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkoutSection_programId_WorkoutProgram_id_fk'
  ) THEN
    ALTER TABLE "WorkoutSection" ADD CONSTRAINT "WorkoutSection_programId_WorkoutProgram_id_fk"
      FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- WorkoutDay - Days within a section (Monday - Leg, etc.)
CREATE TABLE IF NOT EXISTS "WorkoutDay" (
  "id" text PRIMARY KEY NOT NULL,
  "sectionId" text NOT NULL,
  "name" text NOT NULL,
  "daysOfWeek" jsonb NOT NULL DEFAULT '[1]',
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WorkoutDay_sectionId_idx" ON "WorkoutDay" ("sectionId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkoutDay_sectionId_WorkoutSection_id_fk'
  ) THEN
    ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_sectionId_WorkoutSection_id_fk"
      FOREIGN KEY ("sectionId") REFERENCES "WorkoutSection"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Exercise - Individual exercises within a day
CREATE TABLE IF NOT EXISTS "Exercise" (
  "id" text PRIMARY KEY NOT NULL,
  "dayId" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "sets" integer NOT NULL DEFAULT 3,
  "targetValue" integer,
  "unit" text NOT NULL,
  "goal" text,
  "notes" text,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Exercise_dayId_idx" ON "Exercise" ("dayId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Exercise_dayId_WorkoutDay_id_fk'
  ) THEN
    ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_dayId_WorkoutDay_id_fk"
      FOREIGN KEY ("dayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- WeeklyProgression - Week-specific targets for exercises
CREATE TABLE IF NOT EXISTS "WeeklyProgression" (
  "id" text PRIMARY KEY NOT NULL,
  "exerciseId" text NOT NULL,
  "week" integer NOT NULL,
  "targetValue" integer,
  "isDeload" boolean NOT NULL DEFAULT false,
  "isTest" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyProgression_exerciseId_week_idx" ON "WeeklyProgression" ("exerciseId", "week");
CREATE INDEX IF NOT EXISTS "WeeklyProgression_exerciseId_idx" ON "WeeklyProgression" ("exerciseId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyProgression_exerciseId_Exercise_id_fk'
  ) THEN
    ALTER TABLE "WeeklyProgression" ADD CONSTRAINT "WeeklyProgression_exerciseId_Exercise_id_fk"
      FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- DATA MIGRATION: Convert workoutData JSONB to normalized tables
-- ============================================

DO $$
DECLARE
  task_record RECORD;
  workout_data JSONB;
  program_id TEXT;
  section_id TEXT;
  section_data JSONB;
  section_idx INTEGER;
  day_id TEXT;
  day_data JSONB;
  day_idx INTEGER;
  exercise_id TEXT;
  exercise_data JSONB;
  exercise_idx INTEGER;
  progression_data JSONB;
  progression_idx INTEGER;
  days_of_week_array JSONB;
  section_order INTEGER := 0;
  day_order INTEGER := 0;
  exercise_order INTEGER := 0;
BEGIN
  -- Loop through all tasks with workoutData
  FOR task_record IN
    SELECT id, "workoutData"
    FROM "Task"
    WHERE "workoutData" IS NOT NULL
  LOOP
    workout_data := task_record."workoutData";

    -- Skip if no sections (invalid data)
    IF workout_data->'sections' IS NULL OR jsonb_array_length(workout_data->'sections') = 0 THEN
      CONTINUE;
    END IF;

    -- Check if already migrated
    IF EXISTS (SELECT 1 FROM "WorkoutProgram" WHERE "taskId" = task_record.id) THEN
      CONTINUE;
    END IF;

    -- 1. Create WorkoutProgram
    INSERT INTO "WorkoutProgram" ("id", "taskId", "name", "numberOfWeeks", "createdAt", "updatedAt")
    VALUES (
      'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25),
      task_record.id,
      (workout_data->>'name')::text,
      COALESCE((workout_data->>'numberOfWeeks')::integer, 1),
      now(),
      now()
    )
    RETURNING "id" INTO program_id;

    -- 2. Loop through sections
    section_order := 0;
    FOR section_idx IN 0..jsonb_array_length(workout_data->'sections') - 1 LOOP
      section_data := workout_data->'sections'->section_idx;

      -- Use original ID if available, otherwise generate one
      section_id := COALESCE((section_data->>'id')::text, 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25));

      -- 3. Create WorkoutSection (preserve original ID)
      INSERT INTO "WorkoutSection" ("id", "programId", "name", "type", "order", "createdAt")
      VALUES (
        section_id,
        program_id,
        (section_data->>'name')::text,
        COALESCE((section_data->>'type')::text, 'workout'),
        section_order,
        now()
      );

      section_order := section_order + 1;

      -- 4. Loop through days in section
      IF section_data->'days' IS NOT NULL AND jsonb_array_length(section_data->'days') > 0 THEN
        day_order := 0;
        FOR day_idx IN 0..jsonb_array_length(section_data->'days') - 1 LOOP
          day_data := section_data->'days'->day_idx;

          -- Use original ID if available, otherwise generate one
          day_id := COALESCE((day_data->>'id')::text, 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25));

          -- Handle both old dayOfWeek (single) and new daysOfWeek (array)
          days_of_week_array := day_data->'daysOfWeek';
          IF days_of_week_array IS NULL THEN
            IF day_data->>'dayOfWeek' IS NOT NULL THEN
              days_of_week_array := jsonb_build_array((day_data->>'dayOfWeek')::integer);
            ELSE
              days_of_week_array := '[1]'::jsonb; -- Default to Monday
            END IF;
          END IF;
          IF jsonb_array_length(days_of_week_array) = 0 THEN
            days_of_week_array := '[1]'::jsonb;
          END IF;

          -- 5. Create WorkoutDay (preserve original ID)
          INSERT INTO "WorkoutDay" ("id", "sectionId", "name", "daysOfWeek", "order", "createdAt")
          VALUES (
            day_id,
            section_id,
            (day_data->>'name')::text,
            days_of_week_array,
            day_order,
            now()
          );

          day_order := day_order + 1;

          -- 6. Loop through exercises in day
          IF day_data->'exercises' IS NOT NULL AND jsonb_array_length(day_data->'exercises') > 0 THEN
            exercise_order := 0;
            FOR exercise_idx IN 0..jsonb_array_length(day_data->'exercises') - 1 LOOP
              exercise_data := day_data->'exercises'->exercise_idx;

              -- Use original ID if available, otherwise generate one
              exercise_id := COALESCE((exercise_data->>'id')::text, 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25));

              -- 7. Create Exercise (preserve original ID)
              INSERT INTO "Exercise" ("id", "dayId", "name", "type", "sets", "targetValue", "unit", "goal", "notes", "order", "createdAt")
              VALUES (
                exercise_id,
                day_id,
                (exercise_data->>'name')::text,
                COALESCE((exercise_data->>'type')::text, 'reps'),
                COALESCE((exercise_data->>'sets')::integer, 3),
                CASE
                  WHEN exercise_data->>'targetValue' IS NULL THEN NULL
                  ELSE ROUND((exercise_data->>'targetValue')::numeric)::integer
                END,
                COALESCE((exercise_data->>'unit')::text, 'reps'),
                (exercise_data->>'goal')::text,
                (exercise_data->>'notes')::text,
                exercise_order,
                now()
              );

              exercise_order := exercise_order + 1;

              -- 8. Loop through weekly progressions
              IF exercise_data->'weeklyProgression' IS NOT NULL AND jsonb_array_length(exercise_data->'weeklyProgression') > 0 THEN
                FOR progression_idx IN 0..jsonb_array_length(exercise_data->'weeklyProgression') - 1 LOOP
                  progression_data := exercise_data->'weeklyProgression'->progression_idx;

                  -- 9. Create WeeklyProgression
                  INSERT INTO "WeeklyProgression" ("id", "exerciseId", "week", "targetValue", "isDeload", "isTest", "createdAt")
                  VALUES (
                    'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 25),
                    exercise_id,
                    (progression_data->>'week')::integer,
                    CASE
                      WHEN progression_data->>'targetValue' IS NULL THEN NULL
                      ELSE ROUND((progression_data->>'targetValue')::numeric)::integer
                    END,
                    COALESCE((progression_data->>'isDeload')::boolean, false),
                    COALESCE((progression_data->>'isTest')::boolean, false),
                    now()
                  )
                  ON CONFLICT ("exerciseId", "week") DO NOTHING;
                END LOOP;
              END IF;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;
