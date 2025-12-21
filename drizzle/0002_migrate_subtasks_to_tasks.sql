-- Migrate existing JSON subtasks to proper Task records with parentId
-- This preserves all subtask data while converting to the new parent-child architecture

DO $$
DECLARE
    parent_task RECORD;
    subtask_json jsonb;
    new_task_id text;
    subtask_order integer;
BEGIN
    -- Loop through all tasks that have subtasks in the JSON field
    FOR parent_task IN
        SELECT id, "sectionId", subtasks, "createdAt"
        FROM "Task"
        WHERE subtasks IS NOT NULL
        AND jsonb_array_length(subtasks) > 0
    LOOP
        subtask_order := 0;

        -- Loop through each subtask in the JSON array
        FOR subtask_json IN
            SELECT * FROM jsonb_array_elements(parent_task.subtasks)
        LOOP
            -- Generate a new ID for the subtask (or use existing if it has one)
            IF subtask_json->>'id' IS NOT NULL THEN
                new_task_id := subtask_json->>'id';
            ELSE
                -- Generate a CUID-like ID
                new_task_id := 'c' || floor(extract(epoch from now()) * 1000)::text ||
                               substr(md5(random()::text), 1, 10);
            END IF;

            -- Insert the subtask as a new Task record
            INSERT INTO "Task" (
                id,
                title,
                "sectionId",
                "parentId",
                time,
                duration,
                color,
                expanded,
                "order",
                recurrence,
                "createdAt",
                "updatedAt"
            ) VALUES (
                new_task_id,
                subtask_json->>'title',
                parent_task."sectionId", -- Same section as parent
                parent_task.id, -- Set parentId to link to parent
                NULLIF(subtask_json->>'time', ''), -- time if exists
                COALESCE((subtask_json->>'duration')::integer, 30), -- duration or default 30
                COALESCE(subtask_json->>'color', '#3b82f6'), -- color or default blue
                false, -- expanded default false
                COALESCE((subtask_json->>'order')::integer, subtask_order), -- order
                NULL, -- recurrence (subtasks don't have recurrence initially)
                parent_task."createdAt",
                now()
            )
            ON CONFLICT (id) DO NOTHING; -- Skip if ID already exists

            subtask_order := subtask_order + 1;
        END LOOP;

        -- Clear the subtasks JSON field for this parent task
        UPDATE "Task"
        SET subtasks = '[]'::jsonb
        WHERE id = parent_task.id;

        RAISE NOTICE 'Migrated % subtasks for parent task %', subtask_order, parent_task.id;
    END LOOP;

    RAISE NOTICE 'Subtask migration completed successfully!';
END $$;

-- Drop the subtasks column after migration
ALTER TABLE "Task" DROP COLUMN IF EXISTS "subtasks";

