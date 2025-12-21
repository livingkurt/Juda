-- Clean up old subtasks JSON data and remove the column
-- All subtasks have been migrated to Task records with parentId in migration 0002
-- This migration ensures any remaining data is cleaned up and the column is removed

DO $$
BEGIN
    -- Step 1: Clear any remaining non-empty subtasks JSON arrays (safety check)
    -- Only if the column still exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Task'
        AND column_name = 'subtasks'
    ) THEN
        -- Clear any remaining non-empty subtasks JSON arrays
        UPDATE "Task"
        SET subtasks = '[]'::jsonb
        WHERE subtasks IS NOT NULL
        AND jsonb_array_length(subtasks) > 0;

        -- Step 2: Drop the subtasks column
        ALTER TABLE "Task" DROP COLUMN "subtasks";

        RAISE NOTICE 'Old subtasks column successfully removed!';
    ELSE
        RAISE NOTICE 'Subtasks column does not exist - already cleaned up in previous migration.';
    END IF;
END $$;