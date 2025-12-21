-- Custom SQL migration file, put your code below! --

-- Create your user account and assign all existing data to it
-- Replace the values below with your actual user details

DO $$
DECLARE
  target_user_id text;
  default_user_id text;
  reassigned_count integer;
  -- USER DETAILS - Replace these with your actual user details
  user_email text := 'lavacquek@icloud.com';  -- Replace with your email
  user_password_hash text := '2b$12$h1gUx34sKiL397ibKguEWOXkAiw6i82NoN8l8eCCLf6ys7iCCp7gW';  -- Replace with your password hash from local DB
  user_name text := 'Kurt';  -- Replace with your name (or NULL)
  user_id text := 'cmjgblahiu171tr93yzl';  -- Replace with your user ID from local DB (or leave as is to auto-generate)
BEGIN
  -- Check if user already exists
  SELECT "id" INTO target_user_id FROM "User" WHERE "email" = user_email LIMIT 1;

  -- If user doesn't exist, create it
  IF target_user_id IS NULL THEN
    -- Generate ID if not provided
    IF user_id = 'your-user-id' THEN
      user_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 20);
    END IF;

    -- Create the user
    INSERT INTO "User" ("id", "email", "passwordHash", "name", "createdAt", "updatedAt")
    VALUES (user_id, user_email, user_password_hash, user_name, now(), now())
    RETURNING "id" INTO target_user_id;

    RAISE NOTICE 'Created new user: % (email: %)', target_user_id, user_email;
  ELSE
    RAISE NOTICE 'User already exists: % (email: %)', target_user_id, user_email;
  END IF;

  -- Get the default user (created in migration 0005)
  SELECT "id" INTO default_user_id
  FROM "User"
  WHERE "email" = 'migrated@example.com'
  LIMIT 1;

  -- Reassign all sections to your user
  UPDATE "Section"
  SET "userId" = target_user_id
  WHERE "userId" = default_user_id OR "userId" IS NULL OR "userId" != target_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  RAISE NOTICE 'Reassigned % sections to user: %', reassigned_count, target_user_id;

  -- Reassign all tasks to your user
  UPDATE "Task"
  SET "userId" = target_user_id
  WHERE "userId" = default_user_id OR "userId" IS NULL OR "userId" != target_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  RAISE NOTICE 'Reassigned % tasks to user: %', reassigned_count, target_user_id;

  -- Reassign all tags to your user
  UPDATE "Tag"
  SET "userId" = target_user_id
  WHERE "userId" = default_user_id OR "userId" IS NULL OR "userId" != target_user_id;

  GET DIAGNOSTICS reassigned_count = ROW_COUNT;
  RAISE NOTICE 'Reassigned % tags to user: %', reassigned_count, target_user_id;

  RAISE NOTICE 'Successfully assigned all data to user: % (email: %)', target_user_id, user_email;
END $$;

-- Now that all data is assigned, ensure foreign key constraints and NOT NULL are set
-- Add foreign key constraints if they don't exist (they should already exist from migration 0005, but ensure they're there)
DO $$
BEGIN
  -- Add constraints if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Section_userId_User_id_fk'
  ) THEN
    ALTER TABLE "Section"
      ADD CONSTRAINT "Section_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_userId_User_id_fk'
  ) THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tag_userId_User_id_fk'
  ) THEN
    ALTER TABLE "Tag"
      ADD CONSTRAINT "Tag_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Make columns NOT NULL (now that all data has userId)
ALTER TABLE "Section" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;
