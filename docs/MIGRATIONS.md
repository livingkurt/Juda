# Database Migrations Guide

This project uses **Drizzle ORM** with automatic migrations on deployment.

## Quick Reference

```bash
# Generate a new migration (non-interactive)
npm run db:generate my_migration_name

# Apply migrations locally
npm run db:migrate

# Open database browser
npm run db:studio
```

## How It Works

### Automatic Deployment Flow

1. **Local Development**: You make schema changes in `lib/schema.js`
2. **Generate Migration**: Run `npm run db:generate migration_name`
3. **Test Locally**: Run `npm run db:migrate` to apply and test
4. **Commit & Push**: Git commit the migration files
5. **Auto-Deploy**: Vercel runs `drizzle-kit migrate` during build (see `package.json` build script)

### Build Script

```json
"build": "drizzle-kit migrate && next build"
```

This ensures migrations run **before** the app builds, making deployment automatic and safe.

## Creating Migrations

### Standard Workflow

When you need to change the database schema:

1. **Edit the schema** in `lib/schema.js`:

```javascript
export const tasks = pgTable("Task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateCuid()),
  title: text("title").notNull(),
  // Add your new field here
  priority: integer("priority").notNull().default(0),
  // ...
});
```

2. **Generate migration** (non-interactive):

```bash
npm run db:generate add_priority_field
```

This creates:

- `drizzle/000X_add_priority_field.sql` - The SQL migration
- `drizzle/meta/000X_snapshot.json` - Schema snapshot for tracking

3. **Review the generated SQL**:

```bash
cat drizzle/000X_add_priority_field.sql
```

Make sure it does what you expect!

4. **Test locally**:

```bash
npm run db:migrate
```

5. **Verify it works**:

```bash
npm run dev
# Test your app with the new schema
```

6. **Commit and deploy**:

```bash
git add drizzle/
git commit -m "Add priority field to tasks"
git push
```

The migration will run automatically on Vercel!

## Migration Script Details

The `scripts/generate-migration.js` script uses the `--custom` flag to avoid interactive prompts:

```javascript
execSync(`npx drizzle-kit generate --name=${migrationName} --custom`, {
  stdio: "inherit",
  env: process.env,
});
```

### Why `--custom`?

- **Non-interactive**: Works in CI/CD environments
- **No prompts**: Won't hang waiting for user input
- **Automation-friendly**: Perfect for scripts and automated workflows

## Important Rules

### ✅ DO

- **Always generate migrations** for schema changes
- **Test migrations locally** before pushing
- **Review generated SQL** to ensure correctness
- **Add defaults to new NOT NULL columns** on tables with data
- **Commit migration files** to git
- **Use descriptive migration names** (e.g., `add_user_email_field`)

### ❌ DON'T

- **Never use `drizzle-kit push` in production** - it can delete data!
- **Never manually edit snapshot files** - they're auto-generated
- **Never skip migrations** - they ensure production safety
- **Never delete old migrations** - they're part of your history
- **Never run migrations manually in production** - the build script handles it

## Troubleshooting

### Migration fails during Vercel build

**Check the build logs** for the specific error:

1. Go to Vercel dashboard → Deployments → Click failed deployment
2. Look for the migration error in the build logs
3. Fix the SQL in the migration file
4. Commit and push the fix

### "Column already exists" error

This usually means the migration already ran. Drizzle tracks applied migrations in the `__drizzle_migrations` table, so it should skip already-applied migrations automatically.

If you see this error:

1. Check if the migration is in `__drizzle_migrations` table
2. If not, the migration might have partially failed
3. Fix the SQL to use `IF NOT EXISTS` clauses

### Need to rollback a migration

Create a **new migration** that reverses the change:

```bash
# Don't delete the old migration!
# Instead, create a new one that undoes it
npm run db:generate revert_priority_field
```

Then manually edit the SQL to drop the column/table/etc.

### Local database out of sync

```bash
# Apply all pending migrations
npm run db:migrate

# If that doesn't work, you can push the schema directly (dev only!)
npm run db:push
```

**Warning**: `db:push` forces the database to match your schema and can delete data. Only use it in development!

## Advanced: Custom Migrations

Sometimes you need complex data transformations. Use the `--custom` flag (which our script does automatically):

1. **Generate empty migration**:

```bash
npm run db:generate complex_data_migration
```

2. **Edit the SQL file** to add your custom logic:

```sql
-- drizzle/000X_complex_data_migration.sql

-- Your custom SQL here
DO $$
DECLARE
    -- variables
BEGIN
    -- complex logic
END $$;
```

3. **Test thoroughly** before deploying!

## Migration File Structure

```
drizzle/
├── 0000_silent_mandroid.sql          # Initial schema
├── 0001_add_parent_id.sql            # Add parentId column
├── 0002_migrate_subtasks_to_tasks.sql # Data migration
└── meta/
    ├── _journal.json                  # Migration tracking
    ├── 0000_snapshot.json             # Schema after migration 0000
    ├── 0001_snapshot.json             # Schema after migration 0001
    └── 0002_snapshot.json             # Schema after migration 0002
```

### Journal File

The `_journal.json` tracks all migrations:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1766335918946,
      "tag": "0000_silent_mandroid",
      "breakpoints": true
    }
  ]
}
```

### Snapshot Files

Snapshot files contain the complete schema state after each migration. Drizzle uses these to:

- Calculate diffs for new migrations
- Validate schema consistency
- Track schema evolution over time

## Production Database

### Neon PostgreSQL

This project uses Neon PostgreSQL. The connection string is in `DATABASE_URL` environment variable.

### Migration Tracking

Drizzle creates a `__drizzle_migrations` table to track which migrations have been applied:

```sql
SELECT * FROM __drizzle_migrations;
```

This ensures:

- Migrations only run once
- Safe to deploy multiple times
- Automatic rollback on failure

## Best Practices

1. **One logical change per migration**: Don't mix unrelated changes
2. **Test with production-like data**: Use `npm run db:dump` to get production data for local testing
3. **Make migrations reversible**: Think about how to undo the change
4. **Use transactions**: Wrap complex migrations in `BEGIN/COMMIT`
5. **Add indexes carefully**: Large tables may lock during index creation
6. **Document complex migrations**: Add comments explaining why

## Example: Adding a Field with Existing Data

```javascript
// lib/schema.js
export const tasks = pgTable("Task", {
  // ... existing fields ...
  priority: integer("priority").notNull().default(0), // ← Add with default
});
```

```bash
npm run db:generate add_task_priority
```

Generated SQL:

```sql
ALTER TABLE "Task" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;
```

This is safe because:

- ✅ Has a default value (0)
- ✅ Existing rows get the default automatically
- ✅ No data loss

## Summary

- **Generate**: `npm run db:generate migration_name`
- **Test**: `npm run db:migrate`
- **Deploy**: `git push` (migrations run automatically)
- **Never**: Use `drizzle-kit push` in production

Your migrations are now fully automated and production-safe! 🎉
