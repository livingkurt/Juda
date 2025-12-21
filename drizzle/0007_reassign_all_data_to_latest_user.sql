-- Custom SQL migration file, put your code below! --

-- Reassign ALL existing data to the most recently created user
-- This migration is now a no-op - migration 0008 handles user creation and data assignment
-- Kept for migration history consistency

DO $$
DECLARE
  latest_user_id text;
  default_user_id text;
  reassigned_count integer;
BEGIN
  -- Get the most recently created user
  SELECT "id" INTO latest_user_id
  FROM "User"
  ORDER BY "createdAt" DESC
  LIMIT 1;

  -- Get the default user (created in migration 0005, if it exists)
  SELECT "id" INTO default_user_id
  FROM "User"
  WHERE "email" = 'migrated@example.com'
  LIMIT 1;

  -- If no user exists, skip (migration 0008 will create user)
  IF latest_user_id IS NULL THEN
    RAISE NOTICE 'Migration 0007: No user found. Migration 0008 will create user and assign data.';
    RETURN;
  END IF;

  -- If no default user exists, nothing to reassign
  IF default_user_id IS NULL THEN
    RAISE NOTICE 'Migration 0007: No default user found. Nothing to reassign.';
    RETURN;
  END IF;

  -- If the latest user is the default user, skip (nothing to reassign)
  IF latest_user_id = default_user_id THEN
    RAISE NOTICE 'Migration 0007: Latest user is the default user. Migration 0008 will handle reassignment.';
    RETURN;
  END IF;

  -- Reassign all sections from default user to latest user
  UPDATE "Section"
  SET "userId" = latest_user_id
  WHERE "userId" = default_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  IF reassigned_count > 0 THEN
    RAISE NOTICE 'Migration 0007: Reassigned % sections to user: %', reassigned_count, latest_user_id;
  END IF;

  -- Reassign all tasks from default user to latest user
  UPDATE "Task"
  SET "userId" = latest_user_id
  WHERE "userId" = default_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  IF reassigned_count > 0 THEN
    RAISE NOTICE 'Migration 0007: Reassigned % tasks to user: %', reassigned_count, latest_user_id;
  END IF;

  -- Reassign all tags from default user to latest user
  UPDATE "Tag"
  SET "userId" = latest_user_id
  WHERE "userId" = default_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  IF reassigned_count > 0 THEN
    RAISE NOTICE 'Migration 0007: Reassigned % tags to user: %', reassigned_count, latest_user_id;
  END IF;
END $$;

