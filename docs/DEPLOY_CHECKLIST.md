# Drizzle ORM Migration Workflow

## How Migrations Work

Drizzle uses a **migration-based** approach (like Prisma) that is safe for production:

1. **`drizzle-kit generate`** - Creates SQL migration files from schema changes
2. **`drizzle-kit migrate`** - Applies only NEW migrations (tracked in `__drizzle_migrations` table)

**NEVER use `drizzle-kit push` for production** - it can delete data!

## Making Schema Changes

### Step 1: Edit the Schema

Modify `lib/schema.js`:

```javascript
// Example: Add a new field
export const tasks = pgTable("Task", {
  // ... existing fields
  priority: integer("priority").default(0), // ← New field
});
```

### Step 2: Generate a Migration

```bash
npm run db:generate
```

This creates a new SQL file in `drizzle/` (e.g., `0001_add_priority.sql`).

### Step 3: Test Locally

```bash
npm run db:migrate
```

Verify the migration works on your local database.

### Step 4: Commit & Deploy

```bash
git add .
git commit -m "Add priority field to tasks"
git push
```

The build process runs `drizzle-kit migrate` automatically - it only applies NEW migrations!

## Key Commands

| Command               | Purpose                       | When to Use                            |
| --------------------- | ----------------------------- | -------------------------------------- |
| `npm run db:generate` | Create migration file         | After editing schema                   |
| `npm run db:migrate`  | Apply pending migrations      | Automatic in build, or manual testing  |
| `npm run db:push`     | Force sync schema (DANGEROUS) | **Development ONLY, never production** |
| `npm run db:studio`   | Open database GUI             | Debugging/viewing data                 |

## Why This Is Safe

- **`drizzle-kit migrate`** only applies migrations not yet in `__drizzle_migrations` table
- Migrations use `IF NOT EXISTS` to be idempotent
- No interactive prompts - works in CI/CD
- Never deletes tables/columns unless you explicitly write that migration

## Rollback Plan

If a migration causes issues:

1. Create a new migration that undoes the change
2. Or restore from backup using `npm run db:restore-dev`

## Architecture Notes

### Database ORM

- **Drizzle ORM** - Type-safe database access with automatic schema syncing
- **Schema Location** - `lib/schema.js` defines all tables and relations
- **Database Client** - `lib/db.js` exports configured Drizzle instance

### How Task Completion Works

1. **Task** = Template defining what, when, recurrence pattern
2. **TaskCompletion** = Record of completion (taskId + date)
3. **isCompletedOnDate()** = Queries TaskCompletion records
4. **todaysTasks** = Adds virtual `completed` field for UI convenience

### Date Handling Rules

- **Always use UTC methods:** `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- **Never use local methods:** `getFullYear()`, `getMonth()`, `getDate()`
- **Why:** Dates from database/API are in UTC format. Using local methods on UTC dates gives wrong results in different timezones.

## Post-Deployment Monitoring

Watch for:

- Database connection issues
- Migration failures in build logs
- API errors in Vercel logs
- Task CRUD operation failures

## Success Criteria

✅ All migrations applied successfully during build
✅ No data loss
✅ All CRUD operations work correctly
✅ Build completes without interactive prompts
