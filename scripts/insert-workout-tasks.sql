-- Run the task insertion from migration 0018
-- This extracts just the DO block from the migration

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user_id TEXT;
  v_section_id TEXT;
  v_warmup_task_id TEXT;
  v_workout_task_id TEXT;
  v_cooldown_task_id TEXT;
BEGIN
  -- Get the first user
  SELECT id INTO v_user_id FROM "User" LIMIT 1;

  -- Get the first section
  SELECT id INTO v_section_id FROM "Section" WHERE "userId" = v_user_id LIMIT 1;

  IF v_user_id IS NULL OR v_section_id IS NULL THEN
    RAISE NOTICE 'User or Section not found. Skipping workout task creation.';
    RETURN;
  END IF;

  -- Generate CUIDs for the tasks
  v_warmup_task_id := 'c' || floor(extract(epoch from now()) * 1000)::text || substr(md5(random()::text), 1, 10);
  v_workout_task_id := 'c' || (floor(extract(epoch from now()) * 1000) + 1)::text || substr(md5(random()::text), 1, 10);
  v_cooldown_task_id := 'c' || (floor(extract(epoch from now()) * 1000) + 2)::text || substr(md5(random()::text), 1, 10);

  RAISE NOTICE 'Creating tasks for user: % in section: %', v_user_id, v_section_id;
  RAISE NOTICE 'Warmup ID: %', v_warmup_task_id;
  RAISE NOTICE 'Workout ID: %', v_workout_task_id;
  RAISE NOTICE 'Cooldown ID: %', v_cooldown_task_id;

END $$;

