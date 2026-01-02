-- Tag all non-recurring tasks with completions with "Juda"
-- This migration:
-- 1. Creates a "Juda" tag for each user (if it doesn't exist)
-- 2. Links non-recurring tasks with completions to the "Juda" tag

DO $$
DECLARE
  v_user_record RECORD;
  v_juda_tag_id TEXT;
  v_task_record RECORD;
  v_task_tag_id TEXT;
  v_tagged_count INTEGER := 0;
  v_counter INTEGER := 0;
BEGIN
  -- Loop through each user
  FOR v_user_record IN SELECT id FROM "User" LOOP
    -- Reset counter for this user
    v_counter := 0;

    -- Create or get the "Juda" tag for this user
    SELECT id INTO v_juda_tag_id
    FROM "Tag"
    WHERE "userId" = v_user_record.id AND name = 'Juda';

    -- If tag doesn't exist, create it
    IF v_juda_tag_id IS NULL THEN
      -- Generate CUID for the tag
      v_juda_tag_id := 'c' || floor(extract(epoch from now()) * 1000)::text || substr(md5(random()::text), 1, 10);

      INSERT INTO "Tag" (id, "userId", name, color, "createdAt", "updatedAt")
      VALUES (v_juda_tag_id, v_user_record.id, 'Juda', '#6366f1', NOW(), NOW());

      RAISE NOTICE 'Created "Juda" tag for user %: %', v_user_record.id, v_juda_tag_id;
    ELSE
      RAISE NOTICE 'Using existing "Juda" tag for user %: %', v_user_record.id, v_juda_tag_id;
    END IF;

    -- Find all non-recurring tasks with completions for this user
    -- Non-recurring means: recurrence IS NULL OR recurrence->>'type' IS NULL OR recurrence->>'type' = 'none'
    FOR v_task_record IN
      SELECT DISTINCT t.id
      FROM "Task" t
      INNER JOIN "TaskCompletion" tc ON t.id = tc."taskId"
      WHERE t."userId" = v_user_record.id
        AND (t.recurrence IS NULL
             OR (t.recurrence->>'type') IS NULL
             OR (t.recurrence->>'type') = 'none')
    LOOP
      -- Check if task-tag link already exists
      IF NOT EXISTS (
        SELECT 1 FROM "TaskTag"
        WHERE "taskId" = v_task_record.id AND "tagId" = v_juda_tag_id
      ) THEN
        -- Generate CUID for TaskTag (using counter to ensure uniqueness)
        v_counter := v_counter + 1;
        v_task_tag_id := 'c' || floor(extract(epoch from now()) * 1000)::text || v_counter::text || substr(md5(random()::text), 1, 8);

        -- Link task to "Juda" tag
        INSERT INTO "TaskTag" (id, "taskId", "tagId", "createdAt")
        VALUES (v_task_tag_id, v_task_record.id, v_juda_tag_id, NOW());

        v_tagged_count := v_tagged_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migration complete: Tagged % tasks with "Juda"', v_tagged_count;
END $$;