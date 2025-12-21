-- Custom SQL migration file, put your code below! --

-- Link all existing data to the first user in the database
-- This migration is now a no-op - migration 0008 handles user creation and data assignment
-- Kept for migration history consistency

DO $$
DECLARE
  target_user_id text;
  null_count integer;
BEGIN
  -- Check if there are any NULL userIds
  SELECT COUNT(*) INTO null_count FROM "Section" WHERE "userId" IS NULL;
  SELECT COUNT(*) INTO null_count FROM "Task" WHERE "userId" IS NULL;
  SELECT COUNT(*) INTO null_count FROM "Tag" WHERE "userId" IS NULL;

  -- If no NULL userIds exist, this migration is already handled by 0005 or 0008
  IF null_count = 0 THEN
    RAISE NOTICE 'Migration 0006: All data already has userId assigned. Skipping.';
    RETURN;
  END IF;

  -- Get the first user in the database
  SELECT "id" INTO target_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

  -- If no user exists, skip (migration 0008 will create user)
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'Migration 0006: No user found. Migration 0008 will create user and assign data.';
    RETURN;
  END IF;

  -- Update all sections that don't have a userId
  UPDATE "Section"
  SET "userId" = target_user_id
  WHERE "userId" IS NULL;

  -- Update all tasks that don't have a userId
  UPDATE "Task"
  SET "userId" = target_user_id
  WHERE "userId" IS NULL;

  -- Update all tags that don't have a userId
  UPDATE "Tag"
  SET "userId" = target_user_id
  WHERE "userId" IS NULL;

  RAISE NOTICE 'Migration 0006: Linked remaining NULL data to user: %', target_user_id;
END $$;
