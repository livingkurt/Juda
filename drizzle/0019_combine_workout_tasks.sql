-- Migration: Combine Workout 8 tasks into a single task
-- Deletes the three separate tasks (Warmup, Main Workout, Cool Down)
-- Creates one combined task with all three sections

DO $$
DECLARE
  v_user_id TEXT;
  v_section_id TEXT;
  v_warmup_data JSONB;
  v_workout_data JSONB;
  v_cooldown_data JSONB;
  v_combined_sections JSONB;
  v_new_task_id TEXT;
BEGIN
  -- Get the user who owns the workout tasks
  SELECT DISTINCT "userId" INTO v_user_id
  FROM "Task"
  WHERE title LIKE 'Workout 8:%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No Workout 8 tasks found. Skipping migration.';
    RETURN;
  END IF;

  -- Get the section ID from one of the tasks
  SELECT "sectionId" INTO v_section_id
  FROM "Task"
  WHERE title LIKE 'Workout 8:%' AND "userId" = v_user_id
  LIMIT 1;

  -- Extract workout data from each task
  SELECT "workoutData"->'sections'->0 INTO v_warmup_data
  FROM "Task"
  WHERE title = 'Workout 8: Warmup' AND "userId" = v_user_id;

  SELECT "workoutData"->'sections'->0 INTO v_workout_data
  FROM "Task"
  WHERE title = 'Workout 8: Main Workout' AND "userId" = v_user_id;

  SELECT "workoutData"->'sections'->0 INTO v_cooldown_data
  FROM "Task"
  WHERE title = 'Workout 8: Cool Down' AND "userId" = v_user_id;

  -- Combine all sections into one array
  v_combined_sections := jsonb_build_array(v_warmup_data, v_workout_data, v_cooldown_data);

  -- Generate CUID for new task
  v_new_task_id := 'c' || floor(extract(epoch from now()) * 1000)::text || substr(md5(random()::text), 1, 10);

  -- Delete the old three tasks
  DELETE FROM "Task"
  WHERE title IN ('Workout 8: Warmup', 'Workout 8: Main Workout', 'Workout 8: Cool Down')
    AND "userId" = v_user_id;

  -- Create the new combined task
  INSERT INTO "Task" (
    id, "userId", title, "sectionId", "time", duration, recurrence, "order",
    status, "completionType", "workoutData", "createdAt", "updatedAt"
  ) VALUES (
    v_new_task_id,
    v_user_id,
    'Workout 8',
    v_section_id,
    '06:00',
    90, -- Total duration: 30 + 45 + 15 minutes
    jsonb_build_object(
      'type', 'weekly',
      'days', jsonb_build_array(1, 2, 3, 4, 5),
      'startDate', '2025-11-10T00:00:00.000Z'
    ),
    0,
    'todo',
    'workout',
    jsonb_build_object(
      'name', 'Workout 8 (11/10/25 - 12/15/25)',
      'startDate', '2025-11-10T00:00:00.000Z',
      'weeks', 5,
      'currentWeek', 1,
      'sections', v_combined_sections
    ),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Successfully combined Workout 8 tasks into one task with ID: %', v_new_task_id;
END $$;
