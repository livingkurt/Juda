-- Migration: Add numberOfWeeks and restore weekly progression data
-- Sets numberOfWeeks to 5 for all workout tasks and populates weekly progression
-- for exercises based on the original Workout 8 data

DO $$
DECLARE
  v_task RECORD;
  v_workout_data JSONB;
  v_sections JSONB;
  v_section JSONB;
  v_day JSONB;
  v_exercise JSONB;
  v_updated_sections JSONB := '[]'::jsonb;
  v_updated_section JSONB;
  v_updated_days JSONB;
  v_updated_day JSONB;
  v_updated_exercises JSONB;
  v_updated_exercise JSONB;
  v_weekly_progression JSONB;
  v_exercise_id TEXT;
  v_has_progression BOOLEAN;
BEGIN
  -- Loop through all workout tasks
  FOR v_task IN
    SELECT id, "workoutData"
    FROM "Task"
    WHERE "completionType" = 'workout' AND "workoutData" IS NOT NULL
  LOOP
    v_workout_data := v_task."workoutData";
    v_sections := v_workout_data->'sections';
    v_updated_sections := '[]'::jsonb;

    -- Process each section
    FOR v_section IN SELECT * FROM jsonb_array_elements(v_sections)
    LOOP
      v_updated_section := v_section;
      v_updated_days := '[]'::jsonb;

      -- Process each day
      FOR v_day IN SELECT * FROM jsonb_array_elements(v_section->'days')
      LOOP
        v_updated_day := v_day;
        v_updated_exercises := '[]'::jsonb;

        -- Process each exercise
        FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_day->'exercises')
        LOOP
          v_exercise_id := v_exercise->>'id';
          v_updated_exercise := v_exercise;
          v_has_progression := (v_exercise->'weeklyProgression') IS NOT NULL
                              AND jsonb_array_length(v_exercise->'weeklyProgression') > 0;

          -- Only update if exercise doesn't have weekly progression or has incomplete progression
          IF NOT v_has_progression OR jsonb_array_length(v_exercise->'weeklyProgression') < 5 THEN
            -- Build weekly progression based on exercise ID and type
            -- This matches the original Workout 8 data structure

            -- Warmup exercises (w1-w7) - Monday Leg
            IF v_exercise_id IN ('w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7') THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', (v_exercise->>'targetValue')::integer, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', (v_exercise->>'targetValue')::integer, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', (v_exercise->>'targetValue')::integer, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', (v_exercise->>'targetValue')::integer, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', (v_exercise->>'targetValue')::integer, 'isDeload', false, 'isTest', true)
              );
            -- Main workout exercises (e1-e5) - Monday Leg
            ELSIF v_exercise_id = 'e1' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 13, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 14, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 15, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 12, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e2' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 13, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 14, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 15, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 12, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e3' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 20, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 21, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 22, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 18, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e4' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 17, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 18, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 19, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 15, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e5' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 20, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 21, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 22, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 18, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            -- Running exercises (e6, e12)
            ELSIF v_exercise_id IN ('e6', 'e12') THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 2, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 2, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 2, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 1.5, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            -- Push exercises (e7-e11) - Wednesday Push
            ELSIF v_exercise_id = 'e7' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 7, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 8, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e8' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 30, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 32, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 35, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 25, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e9' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 7, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 8, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e10' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 10, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 11, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 13, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 8, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e11' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 5, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 7, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            -- Pull exercises (e13-e17) - Friday Pull
            ELSIF v_exercise_id = 'e13' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 5, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e14' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 8, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 9, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 10, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 7, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e15' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 4, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 5, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 5, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 3, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e16' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 7, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 8, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 5, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSIF v_exercise_id = 'e17' THEN
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', 5, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', 6, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', 7, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', 4, 'isDeload', true, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', null, 'isDeload', false, 'isTest', true)
              );
            ELSE
              -- For exercises without specific progression, use default (same value for all weeks)
              v_weekly_progression := jsonb_build_array(
                jsonb_build_object('week', 1, 'targetValue', (v_exercise->>'targetValue')::numeric, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 2, 'targetValue', (v_exercise->>'targetValue')::numeric, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 3, 'targetValue', (v_exercise->>'targetValue')::numeric, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 4, 'targetValue', (v_exercise->>'targetValue')::numeric, 'isDeload', false, 'isTest', false),
                jsonb_build_object('week', 5, 'targetValue', (v_exercise->>'targetValue')::numeric, 'isDeload', false, 'isTest', false)
              );
            END IF;

            v_updated_exercise := v_exercise || jsonb_build_object('weeklyProgression', v_weekly_progression);
          END IF;

          v_updated_exercises := v_updated_exercises || jsonb_build_array(v_updated_exercise);
        END LOOP;

        v_updated_day := v_day || jsonb_build_object('exercises', v_updated_exercises);
        v_updated_days := v_updated_days || jsonb_build_array(v_updated_day);
      END LOOP;

      v_updated_section := v_section || jsonb_build_object('days', v_updated_days);
      v_updated_sections := v_updated_sections || jsonb_build_array(v_updated_section);
    END LOOP;

    -- Update workoutData with numberOfWeeks and updated sections
    v_workout_data := v_workout_data || jsonb_build_object('numberOfWeeks', 5);
    v_workout_data := v_workout_data || jsonb_build_object('sections', v_updated_sections);

    -- Update the task
    UPDATE "Task"
    SET "workoutData" = v_workout_data,
        "updatedAt" = NOW()
    WHERE id = v_task.id;

    RAISE NOTICE 'Updated workout task % with numberOfWeeks and weekly progression', v_task.id;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully';
END $$;

