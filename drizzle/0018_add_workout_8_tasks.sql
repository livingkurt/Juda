-- Migration: Add Workout 8 tasks (Warmup, Workout, Cool Down)
-- Creates three recurring workout tasks for the 5-week program (11/10/25 - 12/15/25)

-- Note: This migration assumes you have a user and section already created
-- You'll need to replace 'YOUR_USER_ID' and 'YOUR_SECTION_ID' with actual values

DO $$
DECLARE
  v_user_id TEXT;
  v_section_id TEXT;
  v_warmup_task_id TEXT;
  v_workout_task_id TEXT;
  v_cooldown_task_id TEXT;
BEGIN
  -- Get the first real user (skip migrated placeholder users)
  SELECT id INTO v_user_id FROM "User"
  WHERE email NOT LIKE '%migrated%' AND email NOT LIKE '%example.com%'
  ORDER BY "createdAt" DESC
  LIMIT 1;

  -- Get the first section (or replace with your specific section ID)
  SELECT id INTO v_section_id FROM "Section" WHERE "userId" = v_user_id LIMIT 1;

  IF v_user_id IS NULL OR v_section_id IS NULL THEN
    RAISE NOTICE 'User or Section not found. Skipping workout task creation. Run this migration again after creating a user and section.';
    RETURN;
  END IF;

  -- Generate CUIDs for the tasks
  v_warmup_task_id := 'c' || floor(extract(epoch from now()) * 1000)::text || substr(md5(random()::text), 1, 10);
  v_workout_task_id := 'c' || (floor(extract(epoch from now()) * 1000) + 1)::text || substr(md5(random()::text), 1, 10);
  v_cooldown_task_id := 'c' || (floor(extract(epoch from now()) * 1000) + 2)::text || substr(md5(random()::text), 1, 10);

  -- Insert Warmup Task
  INSERT INTO "Task" (
    id, "userId", title, "sectionId", "time", duration, recurrence, "order",
    status, "completionType", "workoutData", "createdAt", "updatedAt"
  ) VALUES (
    v_warmup_task_id,
    v_user_id,
    'Workout 8: Warmup',
    v_section_id,
    '06:00',
    30,
    jsonb_build_object(
      'type', 'weekly',
      'days', jsonb_build_array(1, 2, 3, 4, 5),
      'startDate', '2025-11-10T00:00:00.000Z'
    ),
    0,
    'todo',
    'workout',
    jsonb_build_object(
      'name', 'Workout 8: Warmup (11/10/25 - 12/15/25)',
      'startDate', '2025-11-10T00:00:00.000Z',
      'weeks', 5,
      'currentWeek', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 'warmup-section',
          'name', 'Warmup',
          'type', 'warmup',
          'days', jsonb_build_array(
            -- Monday - Leg
            jsonb_build_object(
              'id', 'mon-warmup',
              'name', 'Monday - Leg',
              'dayOfWeek', 1,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'w1', 'name', 'Backward Treadmill', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 2), jsonb_build_object('week', 2, 'targetValue', 2), jsonb_build_object('week', 3, 'targetValue', 2),
                  jsonb_build_object('week', 4, 'targetValue', 2, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 2, 'isTest', true)
                )),
                jsonb_build_object('id', 'w2', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 10), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 10, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 10, 'isTest', true)
                )),
                jsonb_build_object('id', 'w3', 'name', 'Hip Circles (both directions)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 10), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 10, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 10, 'isTest', true)
                )),
                jsonb_build_object('id', 'w4', 'name', 'Ankle circles (both directions)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 10), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 10, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 10, 'isTest', true)
                )),
                jsonb_build_object('id', 'w5', 'name', 'Walking Lunges', 'type', 'reps', 'sets', 1, 'targetValue', 5, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 5), jsonb_build_object('week', 2, 'targetValue', 5), jsonb_build_object('week', 3, 'targetValue', 5),
                  jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 5, 'isTest', true)
                )),
                jsonb_build_object('id', 'w6', 'name', 'Glute Bridges', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 10), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 10, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 10, 'isTest', true)
                )),
                jsonb_build_object('id', 'w7', 'name', 'Body Weight Squats', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 10), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 10, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', 10, 'isTest', true)
                ))
              )
            ),
            -- Tuesday - Running
            jsonb_build_object(
              'id', 'tue-warmup',
              'name', 'Tuesday - Running',
              'dayOfWeek', 2,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'w8', 'name', 'Backward Treadmill', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'w9', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w10', 'name', 'Leg Swings (Forward/Backward)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w11', 'name', 'Leg Swings (Side to Side)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w12', 'name', 'Walking Lunges', 'type', 'reps', 'sets', 1, 'targetValue', 15, 'unit', 'reps'),
                jsonb_build_object('id', 'w13', 'name', 'High Knees', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w14', 'name', 'Butt Kicks', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w15', 'name', 'Calf Raises', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps')
              )
            ),
            -- Wednesday - Push
            jsonb_build_object(
              'id', 'wed-warmup',
              'name', 'Wednesday - Push',
              'dayOfWeek', 3,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'w16', 'name', 'Backward Treadmill', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'w17', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w18', 'name', 'Band Behind Push at a 45 degree angle', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w19', 'name', 'Band Behind Push out to the side', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w20', 'name', 'Band in Front Pull up over your head', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w21', 'name', 'Band in Front Pull down by your hips', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w22', 'name', 'Band in Front Pull out to the side', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w23', 'name', 'Band on Side External rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w24', 'name', 'Band on Side Internal rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w25', 'name', 'Band in Front External rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w26', 'name', 'Band Leaning Lateral Raises', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w27', 'name', 'Shoulder Dislocates', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w28', 'name', 'Hand walking from forward to backward', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w29', 'name', 'Hands at 45 degrees fingers forward', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w30', 'name', 'Hands at 45 degrees fingers backward', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w31', 'name', 'Back of hand fingers facing towards you stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w32', 'name', 'Push ups', 'type', 'reps', 'sets', 1, 'targetValue', 5, 'unit', 'reps')
              )
            ),
            -- Thursday - Running
            jsonb_build_object(
              'id', 'thu-warmup',
              'name', 'Thursday - Running',
              'dayOfWeek', 4,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'w33', 'name', 'Backward Treadmill', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'w34', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w35', 'name', 'Leg Swings (Forward/Backward)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w36', 'name', 'Leg Swings (Side to Side)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w37', 'name', 'Walking Lunges', 'type', 'reps', 'sets', 1, 'targetValue', 15, 'unit', 'reps'),
                jsonb_build_object('id', 'w38', 'name', 'High Knees', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w39', 'name', 'Butt Kicks', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'w40', 'name', 'Calf Raises', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps')
              )
            ),
            -- Friday - Pull
            jsonb_build_object(
              'id', 'fri-warmup',
              'name', 'Friday - Pull',
              'dayOfWeek', 5,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'w41', 'name', 'Backward Treadmill', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'w42', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w43', 'name', 'Torso rotations (both directions)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w44', 'name', 'Band on Side External rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w45', 'name', 'Band on Side Internal rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w46', 'name', 'Band in Front External rotation both arms', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w47', 'name', 'Shoulder Dislocates', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w48', 'name', 'Wrist Circles (both directions)', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w49', 'name', 'Grip Opens and Closes', 'type', 'reps', 'sets', 1, 'targetValue', 10, 'unit', 'reps'),
                jsonb_build_object('id', 'w50', 'name', 'Scapular Pulls', 'type', 'reps', 'sets', 1, 'targetValue', 5, 'unit', 'reps')
              )
            )
          )
        )
      )
    ),
    NOW(),
    NOW()
  );

  -- Insert Main Workout Task
  INSERT INTO "Task" (
    id, "userId", title, "sectionId", "time", duration, recurrence, "order",
    status, "completionType", "workoutData", "createdAt", "updatedAt"
  ) VALUES (
    v_workout_task_id,
    v_user_id,
    'Workout 8: Main Workout',
    v_section_id,
    '07:00',
    60,
    jsonb_build_object(
      'type', 'weekly',
      'days', jsonb_build_array(1, 2, 3, 4, 5),
      'startDate', '2025-11-10T00:00:00.000Z'
    ),
    1,
    'todo',
    'workout',
    jsonb_build_object(
      'name', 'Workout 8: Main Workout (11/10/25 - 12/15/25)',
      'startDate', '2025-11-10T00:00:00.000Z',
      'weeks', 5,
      'currentWeek', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 'workout-section',
          'name', 'Workout',
          'type', 'workout',
          'days', jsonb_build_array(
            -- Monday - Leg
            jsonb_build_object(
              'id', 'mon-workout',
              'name', 'Monday - Leg',
              'dayOfWeek', 1,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'e1', 'name', 'Single Leg Box Squat (Elevated Heel)', 'type', 'reps', 'sets', 3, 'targetValue', 13, 'unit', 'reps', 'goal', 'Single Leg Squat', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 13), jsonb_build_object('week', 2, 'targetValue', 14), jsonb_build_object('week', 3, 'targetValue', 15),
                  jsonb_build_object('week', 4, 'targetValue', 12, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e2', 'name', 'Weighted Tibialus Raise (20 lbs)', 'type', 'reps', 'sets', 3, 'targetValue', 13, 'unit', 'reps', 'goal', 'Knee Health', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 13), jsonb_build_object('week', 2, 'targetValue', 14), jsonb_build_object('week', 3, 'targetValue', 15),
                  jsonb_build_object('week', 4, 'targetValue', 12, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e3', 'name', 'ATG Split Squat', 'type', 'reps', 'sets', 3, 'targetValue', 20, 'unit', 'reps', 'goal', 'Knee Health', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 20), jsonb_build_object('week', 2, 'targetValue', 21), jsonb_build_object('week', 3, 'targetValue', 22),
                  jsonb_build_object('week', 4, 'targetValue', 18, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e4', 'name', 'Bulgarian Split Squats', 'type', 'reps', 'sets', 3, 'targetValue', 17, 'unit', 'reps', 'goal', 'Single Leg Squat', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 17), jsonb_build_object('week', 2, 'targetValue', 18), jsonb_build_object('week', 3, 'targetValue', 19),
                  jsonb_build_object('week', 4, 'targetValue', 15, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e5', 'name', 'Step Ups', 'type', 'reps', 'sets', 3, 'targetValue', 20, 'unit', 'reps', 'goal', 'Knee Health', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 20), jsonb_build_object('week', 2, 'targetValue', 21), jsonb_build_object('week', 3, 'targetValue', 22),
                  jsonb_build_object('week', 4, 'targetValue', 18, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                ))
              )
            ),
            -- Tuesday - Running
            jsonb_build_object(
              'id', 'tue-workout',
              'name', 'Tuesday - Running',
              'dayOfWeek', 2,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'e6', 'name', 'Run', 'type', 'distance', 'sets', 1, 'targetValue', 2, 'unit', 'miles', 'goal', 'Better Cardio', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 2), jsonb_build_object('week', 2, 'targetValue', 2), jsonb_build_object('week', 3, 'targetValue', 2),
                  jsonb_build_object('week', 4, 'targetValue', 1.5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                ))
              )
            ),
            -- Wednesday - Push
            jsonb_build_object(
              'id', 'wed-workout',
              'name', 'Wednesday - Push',
              'dayOfWeek', 3,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'e7', 'name', 'Assisted Tuck Planche (One toe touch)', 'type', 'time', 'sets', 3, 'targetValue', 6, 'unit', 'secs', 'goal', 'Planche Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 6), jsonb_build_object('week', 2, 'targetValue', 7), jsonb_build_object('week', 3, 'targetValue', 8),
                  jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e8', 'name', 'Hollow Body Holds', 'type', 'time', 'sets', 3, 'targetValue', 30, 'unit', 'secs', 'goal', 'Handstand Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 30), jsonb_build_object('week', 2, 'targetValue', 32), jsonb_build_object('week', 3, 'targetValue', 35),
                  jsonb_build_object('week', 4, 'targetValue', 25, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e9', 'name', 'Pseudo Planche Push-up', 'type', 'reps', 'sets', 3, 'targetValue', 6, 'unit', 'reps', 'goal', 'Planche Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 6), jsonb_build_object('week', 2, 'targetValue', 7), jsonb_build_object('week', 3, 'targetValue', 8),
                  jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e10', 'name', 'Planche Lean Holds', 'type', 'time', 'sets', 3, 'targetValue', 10, 'unit', 'secs', 'goal', 'Planche Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 10), jsonb_build_object('week', 2, 'targetValue', 11), jsonb_build_object('week', 3, 'targetValue', 13),
                  jsonb_build_object('week', 4, 'targetValue', 8, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e11', 'name', 'Pike Push ups', 'type', 'reps', 'sets', 3, 'targetValue', 5, 'unit', 'reps', 'goal', 'Handstand Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 5), jsonb_build_object('week', 2, 'targetValue', 6), jsonb_build_object('week', 3, 'targetValue', 7),
                  jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                ))
              )
            ),
            -- Thursday - Running
            jsonb_build_object(
              'id', 'thu-workout',
              'name', 'Thursday - Running',
              'dayOfWeek', 4,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'e12', 'name', 'Run', 'type', 'distance', 'sets', 1, 'targetValue', 2, 'unit', 'miles', 'goal', 'Better Cardio', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 2), jsonb_build_object('week', 2, 'targetValue', 2), jsonb_build_object('week', 3, 'targetValue', 2),
                  jsonb_build_object('week', 4, 'targetValue', 1.5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                ))
              )
            ),
            -- Friday - Pull
            jsonb_build_object(
              'id', 'fri-workout',
              'name', 'Friday - Pull',
              'dayOfWeek', 5,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'e13', 'name', 'Pull Ups (Wider Hands) (With 100 lbs Band)', 'type', 'reps', 'sets', 3, 'targetValue', 5, 'unit', 'reps', 'goal', 'Muscle Ups', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 5), jsonb_build_object('week', 2, 'targetValue', 6), jsonb_build_object('week', 3, 'targetValue', 6),
                  jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e14', 'name', 'Hanging Knee Raises', 'type', 'reps', 'sets', 3, 'targetValue', 8, 'unit', 'reps', 'goal', 'Handstand Push-up', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 8), jsonb_build_object('week', 2, 'targetValue', 9), jsonb_build_object('week', 3, 'targetValue', 10),
                  jsonb_build_object('week', 4, 'targetValue', 7, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e15', 'name', 'Negative Pull Ups (7 - 8 secs rep)', 'type', 'reps', 'sets', 3, 'targetValue', 4, 'unit', 'reps', 'goal', 'Muscle Ups', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 4), jsonb_build_object('week', 2, 'targetValue', 5), jsonb_build_object('week', 3, 'targetValue', 5),
                  jsonb_build_object('week', 4, 'targetValue', 3, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e16', 'name', 'Horizontal Rows (Feet Up)', 'type', 'reps', 'sets', 3, 'targetValue', 6, 'unit', 'reps', 'goal', 'Muscle Ups', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 6), jsonb_build_object('week', 2, 'targetValue', 7), jsonb_build_object('week', 3, 'targetValue', 8),
                  jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                )),
                jsonb_build_object('id', 'e17', 'name', 'Scapular Pulls', 'type', 'reps', 'sets', 3, 'targetValue', 5, 'unit', 'reps', 'goal', 'Muscle Ups', 'weeklyProgression', jsonb_build_array(
                  jsonb_build_object('week', 1, 'targetValue', 5), jsonb_build_object('week', 2, 'targetValue', 6), jsonb_build_object('week', 3, 'targetValue', 7),
                  jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true), jsonb_build_object('week', 5, 'targetValue', null, 'isTest', true)
                ))
              )
            )
          )
        )
      )
    ),
    NOW(),
    NOW()
  );

  -- Insert Cool Down Task
  INSERT INTO "Task" (
    id, "userId", title, "sectionId", "time", duration, recurrence, "order",
    status, "completionType", "workoutData", "createdAt", "updatedAt"
  ) VALUES (
    v_cooldown_task_id,
    v_user_id,
    'Workout 8: Cool Down',
    v_section_id,
    '08:00',
    30,
    jsonb_build_object(
      'type', 'weekly',
      'days', jsonb_build_array(1, 2, 3, 4, 5),
      'startDate', '2025-11-10T00:00:00.000Z'
    ),
    2,
    'todo',
    'workout',
    jsonb_build_object(
      'name', 'Workout 8: Cool Down (11/10/25 - 12/15/25)',
      'startDate', '2025-11-10T00:00:00.000Z',
      'weeks', 5,
      'currentWeek', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 'cooldown-section',
          'name', 'Cool Down',
          'type', 'cooldown',
          'days', jsonb_build_array(
            -- Monday - Leg
            jsonb_build_object(
              'id', 'mon-cooldown',
              'name', 'Monday - Leg',
              'dayOfWeek', 1,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'c1', 'name', 'Slant Calf Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c2', 'name', 'Elephant Walk', 'type', 'reps', 'sets', 1, 'targetValue', 20, 'unit', 'reps'),
                jsonb_build_object('id', 'c3', 'name', 'Runners Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c4', 'name', 'Pancake Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c5', 'name', 'Floor Leg Twist', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c6', 'name', 'Hamstring Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c7', 'name', 'Couch Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c8', 'name', 'Deep Squat Hold', 'type', 'time', 'sets', 1, 'targetValue', 10, 'unit', 'mins')
              )
            ),
            -- Tuesday - Running
            jsonb_build_object(
              'id', 'tue-cooldown',
              'name', 'Tuesday - Running',
              'dayOfWeek', 2,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'c9', 'name', 'Walk', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'c10', 'name', 'Slant Calf Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c11', 'name', 'Hamstring Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c12', 'name', 'Runners Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c13', 'name', 'IT Band Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c14', 'name', 'Foam Roll Calves', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c15', 'name', 'Foam Roll Quads', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c16', 'name', 'Foam Roll IT Band', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c17', 'name', 'Couch Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c18', 'name', 'Deep Squat Hold', 'type', 'time', 'sets', 1, 'targetValue', 10, 'unit', 'mins')
              )
            ),
            -- Wednesday - Push
            jsonb_build_object(
              'id', 'wed-cooldown',
              'name', 'Wednesday - Push',
              'dayOfWeek', 3,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'c19', 'name', 'Thoracic Hold', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c20', 'name', 'Corner Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c21', 'name', 'Floor Leg Twist', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c22', 'name', 'Runners Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c23', 'name', 'Pancake Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c24', 'name', 'Tricep Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c25', 'name', 'Hamstring Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c26', 'name', 'Couch Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c27', 'name', 'Deep Squat Hold', 'type', 'time', 'sets', 1, 'targetValue', 10, 'unit', 'mins')
              )
            ),
            -- Thursday - Running
            jsonb_build_object(
              'id', 'thu-cooldown',
              'name', 'Thursday - Running',
              'dayOfWeek', 4,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'c28', 'name', 'Walk', 'type', 'time', 'sets', 1, 'targetValue', 2, 'unit', 'mins'),
                jsonb_build_object('id', 'c29', 'name', 'Slant Calf Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c30', 'name', 'Hamstring Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c31', 'name', 'Runners Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c32', 'name', 'IT Band Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c33', 'name', 'Foam Roll Calves', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c34', 'name', 'Foam Roll Quads', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c35', 'name', 'Foam Roll IT Band', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c36', 'name', 'Couch Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c37', 'name', 'Deep Squat Hold', 'type', 'time', 'sets', 1, 'targetValue', 10, 'unit', 'mins')
              )
            ),
            -- Friday - Pull
            jsonb_build_object(
              'id', 'fri-cooldown',
              'name', 'Friday - Pull',
              'dayOfWeek', 5,
              'exercises', jsonb_build_array(
                jsonb_build_object('id', 'c38', 'name', 'Thoracic Hold', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c39', 'name', 'Butcher Block Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c40', 'name', 'Corner Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c41', 'name', 'Bicep Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c42', 'name', 'Runners Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c43', 'name', 'Pancake Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c44', 'name', 'Floor Leg Twist', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c45', 'name', 'Hamstring Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c46', 'name', 'Couch Stretch', 'type', 'time', 'sets', 1, 'targetValue', 30, 'unit', 'secs'),
                jsonb_build_object('id', 'c47', 'name', 'Deep Squat Hold', 'type', 'time', 'sets', 1, 'targetValue', 10, 'unit', 'mins')
              )
            )
          )
        )
      )
    ),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Successfully created 3 workout tasks for user %', v_user_id;
  RAISE NOTICE 'Warmup Task ID: %', v_warmup_task_id;
  RAISE NOTICE 'Workout Task ID: %', v_workout_task_id;
  RAISE NOTICE 'Cool Down Task ID: %', v_cooldown_task_id;

END $$;
