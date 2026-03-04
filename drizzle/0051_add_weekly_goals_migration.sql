-- Migration: Create weekly goals from historical "One thing I want to focus on next week" reflection answers
-- and update existing reflection tasks to use the new goal-oriented question type.

-- Step 1: Create weekly goals from historical reflection answers
-- Each weekly goal is a Task with completionType='goal', goalData containing weekStartDate,
-- and parentId linking to the most appropriate monthly goal.

DO $$
DECLARE
  v_user_id text;
  v_goals_tag_id text;
  v_reflection_task_id text;
BEGIN
  -- Get the user ID (single-user app)
  SELECT id INTO v_user_id FROM "User" LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found, skipping migration';
    RETURN;
  END IF;

  -- Get or create GOALS tag
  SELECT id INTO v_goals_tag_id FROM "Tag" WHERE "userId" = v_user_id AND UPPER(name) = 'GOALS' LIMIT 1;

  -- Get the weekly reflection task ID for source tracking
  SELECT t.id INTO v_reflection_task_id
  FROM "Task" t
  WHERE t."userId" = v_user_id
    AND t."completionType" = 'reflection'
    AND t.title ILIKE '%weekly%'
  LIMIT 1;

  -- Jan 2 reflection → week of Jan 5 (next Monday after Jan 2)
  -- "Being home" → parent: cmkuw74fbljmweupx5t (Integrate repetitive brainless activity - Jan, under Do more non computer activities)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_01_05_being_home',
    'Being home',
    'goal', 2026, '[1]'::jsonb,
    'cmkuw74fbljmweupx5t',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-01-05", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Jan 9 reflection → week of Jan 12
  -- "Focus on getting the injection mold manufacturer figured out..." → parent: cmktk12daipzlqnrxazg (Get injection molding figured out - Jan)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_01_12_injection_mold',
    'Focus on getting the injection mold manufacturer figured out and start fiddling around with music production stuff a little bit',
    'goal', 2026, '[1]'::jsonb,
    'cmktk12daipzlqnrxazg',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-01-12", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Jan 16 reflection → week of Jan 19
  -- "To consume less and create more" → parent: cmkuw74fbljmweupx5t (Integrate repetitive brainless activity - Jan, under Do more non computer activities)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_01_19_consume_less',
    'To consume less and create more',
    'goal', 2026, '[1]'::jsonb,
    'cmkuw74fbljmweupx5t',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-01-19", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Jan 23 reflection → week of Jan 26
  -- "Waking up more consistently at 8:45 - 9 AM..." → parent: cmkuw5kry5uwvhmwsdo (Start calisthenics routine again - Jan)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_01_26_waking_up',
    'Waking up more consistently at 8:45 - 9 AM, and getting started working out by 9:15 - 9:30 AM',
    'goal', 2026, '[1]'::jsonb,
    'cmkuw5kry5uwvhmwsdo',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-01-26", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Jan 30 reflection → week of Feb 2
  -- "Getting my Spanish studying much better" → parent: cmkuw8elauqtp6q6ozal (Look into how to practice Spanish - Jan)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_02_02_spanish_studying',
    'Getting my Spanish studying much better',
    'goal', 2026, '[2]'::jsonb,
    'cmkuw8elauqtp6q6ozal',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-02-02", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Feb 6 reflection → week of Feb 9
  -- "I want to focus on getting my Spanish studying better" → parent: cml75obm18sq9tcsap5 (Get Spanish Review system set up - Feb)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_02_09_spanish_better',
    'I want to focus on getting my Spanish studying better',
    'goal', 2026, '[2]'::jsonb,
    'cml75obm18sq9tcsap5',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-02-09", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Feb 13 reflection → week of Feb 16
  -- "Getting open claw fully set up..." → parent: cml75lsd07i76d78o50v (Improve Filament box Design - Feb, under Make Glow LEDs easier)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_02_16_open_claw',
    'Getting open claw fully set up so it can manage my life for me',
    'goal', 2026, '[2]'::jsonb,
    'cml75lsd07i76d78o50v',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-02-16", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Feb 20 reflection → week of Feb 23
  -- "Being more present with Destanye" → parent: cml75lp5059xpfk48xis (Integrate repetitive brainless activity - Feb, under Do more non computer activities)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_02_23_present_destanye',
    'Being more present with Destanye',
    'goal', 2026, '[2]'::jsonb,
    'cml75lp5059xpfk48xis',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-02-23", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Feb 27 reflection → week of Mar 2
  -- "Continue being present with Destanye" → parent: cml75lp5059xpfk48xis (Integrate repetitive brainless activity - Feb, under Do more non computer activities)
  INSERT INTO "Task" (id, title, "completionType", "goalYear", "goalMonths", "parentId", status, "order", "userId", "goalData", "createdAt", "updatedAt")
  VALUES (
    'wg_2026_03_02_continue_present',
    'Continue being present with Destanye',
    'goal', 2026, '[3]'::jsonb,
    'cml75lp5059xpfk48xis',
    'todo', 0, v_user_id,
    '{"weekStartDate": "2026-03-02", "migratedFromReflection": true}'::jsonb,
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Tag all weekly goals with the GOALS tag
  IF v_goals_tag_id IS NOT NULL THEN
    INSERT INTO "TaskTag" (id, "taskId", "tagId", "createdAt")
    SELECT 'tt_' || t.id || '_goals', t.id, v_goals_tag_id, NOW()
    FROM "Task" t
    WHERE t.id LIKE 'wg_2026_%'
    ON CONFLICT ("taskId", "tagId") DO NOTHING;
  END IF;

  -- Step 2: Update existing weekly reflection tasks to use the new goal-oriented question
  -- Handle both proper JSONB objects and double-encoded JSON strings
  DECLARE
    v_task RECORD;
    v_rd jsonb;
    v_updated_questions jsonb;
  BEGIN
    FOR v_task IN
      SELECT id, "reflectionData"
      FROM "Task"
      WHERE "completionType" = 'reflection'
        AND "userId" = v_user_id
        AND "reflectionData" IS NOT NULL
        AND "reflectionData"::text LIKE '%One thing I want to focus on next week%'
    LOOP
      -- Handle double-encoded JSON strings: if the value is a JSON string, unwrap it
      IF jsonb_typeof(v_task."reflectionData") = 'string' THEN
        v_rd := (v_task."reflectionData" #>> '{}')::jsonb;
      ELSE
        v_rd := v_task."reflectionData";
      END IF;

      -- Update the focus question with goal creation fields
      SELECT jsonb_agg(
        CASE
          WHEN q->>'question' = 'One thing I want to focus on next week'
          THEN q || '{"allowGoalCreation": true, "goalCreationType": "next_week"}'::jsonb
          ELSE q
        END
      ) INTO v_updated_questions
      FROM jsonb_array_elements(v_rd->'questions') AS q;

      -- Write back as proper JSONB object
      UPDATE "Task"
      SET "reflectionData" = jsonb_set(v_rd, '{questions}', v_updated_questions)
      WHERE id = v_task.id;
    END LOOP;
  END;

  RAISE NOTICE 'Weekly goals migration completed successfully';
END $$;
