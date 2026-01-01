-- Migration: Add Night Stretches Workout Task
-- This creates a separate daily recurring workout for night stretches

DO $$
DECLARE
  v_user_id TEXT;
  v_section_id TEXT;
  v_task_id TEXT := 'cm5' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 22);
BEGIN
  -- Get the user (prefer lavacquek@icloud.com, fallback to first user)
  SELECT id INTO v_user_id
  FROM "User"
  WHERE email = 'lavacquek@icloud.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM "User" LIMIT 1;
  END IF;

  -- Get the first section for this user
  SELECT id INTO v_section_id
  FROM "Section"
  WHERE "userId" = v_user_id
  ORDER BY "order" ASC
  LIMIT 1;

  -- Only proceed if we have both user and section
  IF v_user_id IS NULL OR v_section_id IS NULL THEN
    RAISE NOTICE 'User or Section not found. Skipping Night Stretches workout creation.';
    RETURN;
  END IF;

  -- Insert the Night Stretches workout task
  INSERT INTO "Task" (
    id, "userId", title, "sectionId", "time", duration, recurrence, "order",
    status, "completionType", "workoutData", "createdAt", "updatedAt"
  ) VALUES (
    v_task_id,
    v_user_id,
    'Night Stretches',
    v_section_id,
    '21:00', -- 9 PM
    30,      -- 30 minutes duration
    jsonb_build_object(
      'type', 'daily',
      'startDate', '2025-11-10T00:00:00.000Z'
    ),
    0,
    'todo',
    'workout',
    jsonb_build_object(
      'name', 'Night Stretches (11/10/25 - 12/15/25)',
      'startDate', '2025-11-10T00:00:00.000Z',
      'weeks', 5,
      'currentWeek', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 'stretches_' || substring(md5(random()::text) from 1 for 8),
          'name', 'Stretches',
          'type', 'main',
          'days', jsonb_build_array(
            -- Monday (day 1)
            jsonb_build_object(
              'id', 'monday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 1,
              'name', 'Monday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Tuesday (day 2)
            jsonb_build_object(
              'id', 'tuesday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 2,
              'name', 'Tuesday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Wednesday (day 3)
            jsonb_build_object(
              'id', 'wednesday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 3,
              'name', 'Wednesday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Thursday (day 4)
            jsonb_build_object(
              'id', 'thursday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 4,
              'name', 'Thursday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Friday (day 5)
            jsonb_build_object(
              'id', 'friday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 5,
              'name', 'Friday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Saturday (day 6)
            jsonb_build_object(
              'id', 'saturday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 6,
              'name', 'Saturday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            ),
            -- Sunday (day 0)
            jsonb_build_object(
              'id', 'sunday_' || substring(md5(random()::text) from 1 for 8),
              'dayOfWeek', 0,
              'name', 'Sunday',
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Apart Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Legs Together Forward Bend', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Frog Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Runners Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Butterfly Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Pancake Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Floor Leg Twist', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Couch Stretch', 'sets', 1, 'reps', 2, 'type', 'time'),
                jsonb_build_object('id', 'ex_' || substring(md5(random()::text) from 1 for 8), 'name', 'Deep Squat Hold', 'sets', 1, 'reps', 10, 'type', 'time')
              )
            )
          )
        )
      )
    ),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Night Stretches workout created successfully with ID: %', v_task_id;
END $$;
