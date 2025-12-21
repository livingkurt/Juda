# Deployment Checklist - Drizzle ORM Migration

## Changes Made (December 21, 2025)

### Migrated from Prisma to Drizzle ORM ✅

**Problem:** Prisma migrations were causing deployment issues and required interactive prompts

**Solution:** Migrated entire codebase to Drizzle ORM for simpler, non-interactive schema management

**Files Changed:**

- `lib/schema.js` - New Drizzle schema definition
- `lib/db.js` - Drizzle database client (replaced `lib/prisma.js`)
- `drizzle.config.js` - Drizzle configuration
- All API routes updated to use Drizzle queries
- `package.json` - Updated scripts to use Drizzle commands
- `scripts/dump-production.js` - Updated to use Drizzle
- `scripts/restore-dev.js` - Updated to use Drizzle
- Documentation updated (README.md, DEPLOYMENT.md)

**Benefits:**

- No interactive migration prompts
- Simpler deployment process
- `drizzle-kit push` automatically syncs schema
- Better developer experience with Drizzle Studio

## Pre-Deployment Steps

### Local Testing

- [x] Database schema pushed successfully
- [x] All API routes tested with Drizzle
- [ ] Test task CRUD operations
- [ ] Test section CRUD operations
- [ ] Test completion tracking
- [ ] Test drag and drop functionality

### Code Review

- [x] All Prisma references removed
- [x] Drizzle queries working correctly
- [x] Documentation updated
- [x] Scripts updated

## Deployment to Vercel

### Step 1: Deploy Code

```bash
git add .
git commit -m "Migrate from Prisma to Drizzle ORM"
git push origin main
```

### Step 2: Schema Push (Automatic)

The build process automatically runs `drizzle-kit push` which will:

- Detect schema changes
- Apply them to the production database
- No manual intervention needed

### Step 3: Verify Production

- [ ] Test all CRUD operations work correctly
- [ ] Test drag and drop functionality
- [ ] Test completion tracking
- [ ] Check Vercel logs for any errors
- [ ] Verify database schema matches expected structure

## Rollback Plan

If issues occur:

1. **Revert code changes:**

   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore Prisma (if needed):**
   - Reinstall Prisma dependencies
   - Restore `prisma/` folder from git history
   - Run `npx prisma generate && npx prisma migrate deploy`

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

Example:

```javascript
// ❌ WRONG - can give wrong day in different timezones
const date = new Date("2025-12-20T00:00:00.000Z");
const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));

// ✅ CORRECT - consistent across all timezones
const date = new Date("2025-12-20T00:00:00.000Z");
const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
```

## Post-Deployment Monitoring

Watch for:

- Database connection issues
- Schema sync failures
- API errors in Vercel logs
- Task CRUD operation failures
- Completion tracking issues

## Success Criteria

✅ All CRUD operations work correctly
✅ Schema synced successfully to production
✅ No errors in Vercel logs
✅ Drag and drop functionality works
✅ Task completion tracking works correctly
