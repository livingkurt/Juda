-- Custom SQL migration file, put your code below! --

-- Step 1: Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "passwordHash" text NOT NULL,
  "name" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Step 2: Create RefreshToken table
CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");

-- Step 3: Create UserPreference table
CREATE TABLE IF NOT EXISTS "UserPreference" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "preferences" jsonb NOT NULL DEFAULT '{}',
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Step 4: Add userId columns to existing tables (nullable first)
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "userId" text;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "userId" text;
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "userId" text;

-- Step 5: Create a default user for existing data ONLY if there's existing data
-- Note: This user will have a dummy email/password. Users should register with their own accounts.
-- If there's no existing data, skip creating the default user (migration 0008 will create the real user)
DO $$
DECLARE
  default_user_id text;
  has_existing_data boolean := false;
BEGIN
  -- Check if there's any existing data
  SELECT EXISTS(SELECT 1 FROM "Section" LIMIT 1) INTO has_existing_data;

  -- If no existing data, skip creating default user
  IF NOT has_existing_data THEN
    RAISE NOTICE 'No existing data found. Skipping default user creation.';
    RETURN;
  END IF;

  -- Create default user for existing data
  default_user_id := 'default_user_' || substr(md5(random()::text), 1, 20);
  INSERT INTO "User" ("id", "email", "passwordHash", "name", "createdAt", "updatedAt")
  VALUES (
    default_user_id,
    'migrated@example.com',
    '$2a$12$dummy.hash.for.migration.only',
    'Migrated User',
    now(),
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING "id" INTO default_user_id;

  -- If user was created (or already exists), get its ID
  IF default_user_id IS NULL THEN
    SELECT "id" INTO default_user_id FROM "User" WHERE "email" = 'migrated@example.com' LIMIT 1;
  END IF;

  -- Assign all existing data to the default user
  UPDATE "Section" SET "userId" = default_user_id WHERE "userId" IS NULL;
  UPDATE "Task" SET "userId" = default_user_id WHERE "userId" IS NULL;
  UPDATE "Tag" SET "userId" = default_user_id WHERE "userId" IS NULL;

  RAISE NOTICE 'Created default user and assigned existing data to: %', default_user_id;
END $$;

-- Step 7: Add foreign key constraints
-- Note: We defer making columns NOT NULL until migration 0008 ensures all data has userId
ALTER TABLE "Section"
  ADD CONSTRAINT IF NOT EXISTS "Section_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT IF NOT EXISTS "Task_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "Tag"
  ADD CONSTRAINT IF NOT EXISTS "Tag_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Step 8: Create indexes for userId columns
CREATE INDEX IF NOT EXISTS "Section_userId_idx" ON "Section"("userId");
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Tag_userId_idx" ON "Tag"("userId");
