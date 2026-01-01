-- Migration: Convert dayOfWeek to daysOfWeek array in workout data
-- This updates all existing workout tasks to use the new multi-day format
-- Old format: day.dayOfWeek = 1 (single day)
-- New format: day.daysOfWeek = [1] (array of days)

DO $$
DECLARE
  task_record RECORD;
  updated_workout_data JSONB;
  section_data JSONB;
  day_data JSONB;
  updated_sections JSONB := '[]'::JSONB;
  updated_days JSONB;
BEGIN
  -- Loop through all tasks with workoutData
  FOR task_record IN
    SELECT id, "workoutData"
    FROM "Task"
    WHERE "workoutData" IS NOT NULL
      AND "completionType" = 'workout'
  LOOP
    updated_sections := '[]'::JSONB;

    -- Loop through each section
    FOR section_data IN
      SELECT * FROM jsonb_array_elements(task_record."workoutData"->'sections')
    LOOP
      updated_days := '[]'::JSONB;

      -- Loop through each day in the section
      FOR day_data IN
        SELECT * FROM jsonb_array_elements(section_data->'days')
      LOOP
        -- Check if day has old dayOfWeek field (not daysOfWeek)
        IF day_data ? 'dayOfWeek' AND NOT (day_data ? 'daysOfWeek') THEN
          -- Convert dayOfWeek to daysOfWeek array
          day_data := day_data - 'dayOfWeek' || jsonb_build_object(
            'daysOfWeek', jsonb_build_array(day_data->'dayOfWeek')
          );
        END IF;

        updated_days := updated_days || jsonb_build_array(day_data);
      END LOOP;

      -- Update section with new days
      section_data := section_data || jsonb_build_object('days', updated_days);
      updated_sections := updated_sections || jsonb_build_array(section_data);
    END LOOP;

    -- Update the task's workoutData
    updated_workout_data := task_record."workoutData" || jsonb_build_object('sections', updated_sections);

    UPDATE "Task"
    SET "workoutData" = updated_workout_data,
        "updatedAt" = NOW()
    WHERE id = task_record.id;

    RAISE NOTICE 'Updated task % with new daysOfWeek format', task_record.id;
  END LOOP;

  RAISE NOTICE 'Migration complete: Converted all dayOfWeek to daysOfWeek arrays';
END $$;
