# Database Migrations Guide

This project uses **Drizzle ORM** with migrations that work like **Rails migrations** - fully automated, no manual file creation required.

## Quick Start

```bash
# Generate a new migration (creates ALL files automatically)
npm run db:generate my_migration_name

# Apply migrations locally
npm run db:migrate

# Open database browser
npm run db:studio
```

## The Golden Rule

**One command creates everything:**

```bash
npm run db:generate add_priority_field
```

This automatically creates:

- ✅ `drizzle/000X_add_priority_field.sql` - Empty SQL file (you fill this in)
- ✅ `drizzle/meta/000X_snapshot.json` - Schema snapshot
- ✅ Updates `drizzle/meta/_journal.json` - Migration tracking

**You only write the SQL. Everything else is automatic.**

## How It Works

### Under the Hood

The `scripts/generate-migration.js` script uses Drizzle's `--custom` flag:

```javascript
execSync(`npx drizzle-kit generate --name=${migrationName} --custom`, {
  stdio: "inherit",
  env: process.env,
});
```

This:

- Bypasses all interactive prompts
- Generates the SQL file, snapshot, and journal entry automatically
- Works in CI/CD environments
- Never hangs waiting for user input

### Deployment Flow

```
Local Development          →    Git Push    →    Vercel Build
─────────────────────────────────────────────────────────────
1. npm run db:generate     →    git push    →    drizzle-kit migrate
2. Write SQL                                     (runs automatically)
3. npm run db:migrate                            next build
4. git add & commit                              Deploy! ✅
```

The build script in `package.json`:

```json
"build": "drizzle-kit migrate && next build"
```

## Standard Workflow

### Step 1: Generate the migration

```bash
npm run db:generate add_user_email
```

### Step 2: Write your SQL

Edit the generated file (e.g., `drizzle/0003_add_user_email.sql`):

```sql
-- Add email column to User table
ALTER TABLE "User" ADD COLUMN "email" text;
CREATE INDEX "User_email_idx" ON "User" ("email");
```

### Step 3: Test locally

```bash
npm run db:migrate
```

### Step 4: Commit and deploy

```bash
git add .
git commit -m "Add email field to users"
git push
```

**That's it!** Vercel automatically runs the migration during build.

## Commands Reference

| Command                              | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `npm run db:generate migration_name` | Creates migration file + snapshot + journal entry |
| `npm run db:migrate`                 | Applies pending migrations                        |
| `npm run db:studio`                  | Opens Drizzle Studio (database browser)           |
| `npm run db:push`                    | ⚠️ Forces schema sync - **DEV ONLY, NEVER PROD**  |

## Important Rules

### ✅ ALWAYS Do

- **Use `npm run db:generate name`** for every migration
- **Write SQL with safety checks** (`IF NOT EXISTS`, `IF EXISTS`)
- **Add defaults to NOT NULL columns** on tables with existing data
- **Test locally** with `npm run db:migrate` before pushing
- **Commit ALL files** in `drizzle/` directory

### ❌ NEVER Do

- **Never manually create SQL files** - Use `npm run db:generate`
- **Never manually edit `_journal.json`** - Auto-managed
- **Never manually create snapshots** - Auto-generated
- **Never use `db:push` in production** - It can delete data!
- **Never delete old migrations** - They're history

## Examples

### Adding a Simple Column

```bash
# 1. Generate
npm run db:generate add_task_priority

# 2. Edit drizzle/0003_add_task_priority.sql
```

```sql
ALTER TABLE "Task" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;
```

```bash
# 3. Test
npm run db:migrate

# 4. Deploy
git add . && git commit -m "Add priority" && git push
```

### Adding a Column with Foreign Key

```bash
npm run db:generate add_category_to_tasks
```

```sql
-- Add categoryId column with foreign key
ALTER TABLE "Task" ADD COLUMN "categoryId" text;

ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_Category_id_fk"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL;

CREATE INDEX "Task_categoryId_idx" ON "Task" ("categoryId");
```

### Complex Data Migration

```bash
npm run db:generate migrate_subtasks_to_tasks
```

```sql
-- Migrate JSON subtasks to separate Task records
DO $$
DECLARE
    parent_task RECORD;
    subtask_json jsonb;
BEGIN
    FOR parent_task IN
        SELECT id, "sectionId", subtasks
        FROM "Task"
        WHERE subtasks IS NOT NULL
        AND jsonb_array_length(subtasks) > 0
    LOOP
        FOR subtask_json IN
            SELECT * FROM jsonb_array_elements(parent_task.subtasks)
        LOOP
            INSERT INTO "Task" (id, title, "sectionId", "parentId")
            VALUES (
                'c' || floor(extract(epoch from now()) * 1000)::text,
                subtask_json->>'title',
                parent_task."sectionId",
                parent_task.id
            );
        END LOOP;
    END LOOP;
END $$;

-- Drop old column
ALTER TABLE "Task" DROP COLUMN IF EXISTS "subtasks";
```

### Renaming a Column

```bash
npm run db:generate rename_task_name_to_title
```

```sql
ALTER TABLE "Task" RENAME COLUMN "name" TO "title";
```

### Dropping a Column

```bash
npm run db:generate remove_deprecated_field
```

```sql
ALTER TABLE "Task" DROP COLUMN IF EXISTS "deprecated_field";
```

## Migration File Structure

```
drizzle/
├── 0000_silent_mandroid.sql          # Initial schema
├── 0001_add_parent_id.sql            # Adds parentId column
├── 0002_migrate_subtasks_to_tasks.sql # Data migration
└── meta/
    ├── _journal.json                  # Migration tracking (auto-managed)
    ├── 0000_snapshot.json             # Schema after 0000 (auto-generated)
    ├── 0001_snapshot.json             # Schema after 0001 (auto-generated)
    └── 0002_snapshot.json             # Schema after 0002 (auto-generated)
```

### Journal File

The `_journal.json` is **automatically managed** by Drizzle:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    { "idx": 0, "tag": "0000_silent_mandroid", ... },
    { "idx": 1, "tag": "0001_add_parent_id", ... },
    { "idx": 2, "tag": "0002_migrate_subtasks_to_tasks", ... }
  ]
}
```

**Never edit this file manually!**

### Snapshot Files

Snapshot files are **automatically generated** by `npm run db:generate`. They track the schema state after each migration. Drizzle uses them for:

- Calculating diffs for new migrations
- Validating schema consistency
- Tracking schema evolution

**Never create or edit these manually!**

## Troubleshooting

### "Column already exists" error

The migration already ran. This is normal - Drizzle skips already-applied migrations.

**Solution:** Use `IF NOT EXISTS` in your SQL:

```sql
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0;
```

### Migration fails on Vercel

1. Check Vercel build logs for the specific error
2. Fix the SQL in the migration file
3. Commit and push the fix
4. Build will retry automatically

### Need to rollback a migration

**Don't delete the old migration!** Create a new one that reverses it:

```bash
npm run db:generate revert_priority_field
```

```sql
ALTER TABLE "Task" DROP COLUMN IF EXISTS "priority";
```

### Local database out of sync

```bash
# Apply all pending migrations
npm run db:migrate
```

If that doesn't work (dev only!):

```bash
# Force sync - DANGEROUS, can delete data
npm run db:push
```

### "relation does not exist" error

Table hasn't been created yet. Make sure migrations run in order.

## Best Practices

1. **One logical change per migration** - Don't mix unrelated changes
2. **Use descriptive names** - `add_user_email` not `migration1`
3. **Add safety checks** - `IF NOT EXISTS`, `IF EXISTS`
4. **Add defaults for NOT NULL** - On tables with existing data
5. **Test locally first** - Always run `npm run db:migrate`
6. **Document complex migrations** - Add SQL comments

## Production Database

### Neon PostgreSQL

Connection string in `DATABASE_URL` environment variable.

### Migration Tracking

Drizzle creates a `__drizzle_migrations` table:

```sql
SELECT * FROM drizzle.__drizzle_migrations;
```

This ensures:

- Migrations only run once
- Safe to deploy multiple times
- Order is preserved

## Summary

| Step | Command                    | What Happens                     |
| ---- | -------------------------- | -------------------------------- |
| 1    | `npm run db:generate name` | Creates SQL + snapshot + journal |
| 2    | Edit the SQL file          | Write your migration             |
| 3    | `npm run db:migrate`       | Test locally                     |
| 4    | `git push`                 | Auto-migrates on Vercel          |

**It's that simple!** 🎉
