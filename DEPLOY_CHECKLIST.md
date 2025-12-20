# Deployment Checklist - Timezone Fix & Architecture Cleanup

## Changes Made (December 20, 2025)

### 1. Fixed Timezone Bug in Task Completion ✅
**Problem:** Checkboxes worked locally but not in production (Vercel)

**Root Cause:** Date normalization used local timezone methods which differed between client and server

**Solution:** Switched to UTC dates using `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`

**Files Changed:**
- `hooks/useCompletions.js` - All date operations now use UTC methods
- `app/api/completions/route.js` - POST and DELETE handlers use UTC normalization

### 2. Removed Task.completed Field ✅
**Problem:** The `completed` boolean field on Task model was conceptually wrong

**Reasoning:**
- Tasks are templates (especially recurring tasks)
- TaskCompletion records track specific completion instances
- Having `completed` on Task doesn't make sense for "do this every day" tasks

**Solution:** Removed the field entirely from Task model

**Files Changed:**
- `prisma/schema.prisma` - Removed `completed` field from Task
- `app/api/tasks/route.js` - Removed `completed` from accepted fields
- `components/TaskDialog.jsx` - Removed `completed` from form
- Created migration: `20251220111053_remove_task_completed_field`

**Note:** BacklogItem keeps `completed` since those are one-time items

## Pre-Deployment Steps

### Local Testing
- [x] Database migration applied successfully
- [x] Prisma client regenerated
- [ ] Test checkbox toggle on tasks
- [ ] Test checkbox persists after refresh
- [ ] Test recurring tasks show correct completion status
- [ ] Test backlog items still work

### Code Review
- [x] All linter errors fixed
- [x] UTC methods used consistently throughout
- [x] Documentation updated

## Deployment to Vercel

### Step 1: Deploy Code
```bash
git add .
git commit -m "Fix timezone bug and remove Task.completed field"
git push origin main
```

### Step 2: Run Migration in Production
After Vercel deployment completes, run:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="your-production-db-url"

# Apply migration
npx prisma migrate deploy
```

Or via Vercel dashboard environment variables and build command.

### Step 3: Verify Production
- [ ] Test checkbox toggle works correctly
- [ ] Test checkbox stays checked after refresh
- [ ] Test in different browsers
- [ ] Check Vercel logs for any errors
- [ ] Verify database has no `completed` column on Task table

## Rollback Plan

If issues occur:

1. **Revert code changes:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore completed column (if needed):**
   ```sql
   ALTER TABLE "Task" ADD COLUMN "completed" BOOLEAN DEFAULT false;
   UPDATE "Task" SET "completed" = false;
   ```

## Architecture Notes

### How Task Completion Works Now

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
- Checkbox state inconsistencies
- Completion records not being created
- Tasks showing as completed when they shouldn't be
- Errors in Vercel logs related to TaskCompletion

## Success Criteria

✅ Checkboxes work correctly in production
✅ Checkbox state persists after page refresh
✅ No errors in Vercel logs
✅ Task completion history displays correctly
✅ Recurring tasks show correct completion status per day

