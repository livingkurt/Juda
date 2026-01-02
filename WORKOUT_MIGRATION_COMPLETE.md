# Workout Schema Normalization - COMPLETE ✅

## Summary

Successfully normalized the `workoutData` JSONB field into relational tables and migrated all existing workout data.

## What Was Done

### 1. Schema Changes

- Created 5 new tables:
  - `WorkoutProgram` - Top-level workout container (1:1 with Task)
  - `WorkoutSection` - Groups exercises (Warmup, Main, Cooldown, etc.)
  - `WorkoutDay` - Days within sections
  - `Exercise` - Individual exercises
  - `WeeklyProgression` - Week-specific targets

### 2. Migrations

- **Migration 0027**: Created tables and attempted data migration
- **Migration 0028**: Fixed `targetValue` column type from `integer` to `numeric` to support decimal values (e.g., 1.5 miles) and successfully migrated all data

### 3. Data Migration Results

```
📋 Tasks with workoutData: 2
💪 WorkoutPrograms created: 2
📂 WorkoutSections created: 4
📅 WorkoutDays created: 14
🏃 Exercises created: 105
```

### 4. Code Changes

- Created `/api/workout-programs` route (GET, POST, DELETE)
- Created `useWorkoutProgram` hook
- Updated `WorkoutBuilder.jsx` to fetch/save via API
- Updated `WorkoutModal.jsx` to load workout from API
- Updated `TaskDialog.jsx` to check workout program status
- Updated `app/page.jsx` to save progress to `TaskCompletion.note`
- Removed `workoutData` handling from `/api/tasks`

## Key Features

### Preserved Compatibility

- **Original IDs preserved**: Section, Day, and Exercise IDs from the JSONB are kept for `TaskCompletion.note` compatibility
- **Progress storage**: Workout progress continues to be stored in `TaskCompletion.note` as JSONB

### Decimal Support

- `targetValue` fields support decimal values for distance exercises (e.g., 1.5 miles)
- Changed from `integer` to `numeric` in database, represented as `text` in Drizzle schema

### Migration Safety

- Migration checks for already-migrated tasks (idempotent)
- Handles both old `dayOfWeek` (single) and new `daysOfWeek` (array) formats
- Uses `ON CONFLICT` for weekly progressions to prevent duplicates

## Testing

1. **Verify data in database**:

   ```bash
   npm run db:studio
   ```

2. **Check migration status**:

   ```bash
   DATABASE_URL="your_db_url" node scripts/check-workout-migration.js
   ```

3. **Test in UI**:
   - Open a workout task
   - Click "Configure Workout" - should load existing workout structure
   - Click "Start" on a workout task - should open WorkoutModal with exercises
   - Make changes and save - should persist to normalized tables

## Files Modified

### Schema & Migrations

- `lib/schema.js` - Added 5 new tables and relations
- `drizzle/0027_normalize_workout_tables.sql` - Table creation + data migration
- `drizzle/0028_fix_workout_decimal_values.sql` - Fixed decimal support + re-ran migration

### API Routes

- `app/api/workout-programs/route.js` - NEW: Workout program CRUD
- `app/api/tasks/route.js` - Removed workoutData handling

### Hooks

- `hooks/useWorkoutProgram.js` - NEW: Workout program API hook

### Components

- `components/WorkoutBuilder.jsx` - Now uses API instead of local state
- `components/WorkoutModal.jsx` - Fetches workout from API
- `components/TaskDialog.jsx` - Uses workout program status check
- `app/page.jsx` - Updated progress saving

### Scripts

- `scripts/check-workout-migration.js` - NEW: Verify migration status
- `scripts/migrate-workout-data.js` - OLD: No longer needed (migration is in SQL)

## Next Steps (Optional)

After thorough testing in production:

1. **Remove workoutData column** from Task table:

   ```sql
   ALTER TABLE "Task" DROP COLUMN "workoutData";
   ```

2. **Delete old script**:

   ```bash
   rm scripts/migrate-workout-data.js
   ```

3. **Update documentation**:
   - Update `docs/WORKOUT_FEATURE_IMPLEMENTATION.md`
   - Add schema documentation for new tables

## Troubleshooting

### If WorkoutBuilder is empty:

1. Check browser console for errors
2. Verify API is returning data: `/api/workout-programs?taskId=YOUR_TASK_ID`
3. Check database has WorkoutProgram records: `SELECT * FROM "WorkoutProgram";`

### If migration didn't run:

1. Run manually: `npm run db:migrate`
2. Check migration status: `SELECT * FROM "__drizzle_migrations";`
3. If needed, manually run the SQL: `psql -f drizzle/0028_fix_workout_decimal_values.sql`

## Success Criteria ✅

- [x] All existing workout data migrated to normalized tables
- [x] WorkoutBuilder loads existing workouts
- [x] WorkoutBuilder saves to new tables
- [x] WorkoutModal displays workouts correctly
- [x] Progress tracking still works
- [x] Decimal values supported for distance exercises
- [x] Original IDs preserved for compatibility
- [x] No data loss during migration
