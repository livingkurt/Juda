# Workout Progress Storage - Fixed ✅

## Problem

1. **Invalid time value error**: When clicking checkboxes in the workout modal, the app was trying to create a `TaskCompletion` record immediately, which caused an "Invalid time value" error
2. **Premature completion marking**: Tasks were being marked as complete even when progress was not 100%
3. **No persistence**: Workout progress was lost on page refresh

## Solution

### Database Changes

#### 1. Added `WorkoutSetCompletion` Table

Created a new relational table to track individual set completions:

```sql
CREATE TABLE "WorkoutSetCompletion" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "exerciseId" text NOT NULL REFERENCES "Exercise"("id") ON DELETE CASCADE,
  "setNumber" integer NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "value" text,
  "time" text,
  "distance" real,
  "pace" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT unique (taskId, date, exerciseId, setNumber)
);
```

**Migrations:**

- `drizzle/0029_add_workout_progress_field.sql` - Added `progress` real field to `WorkoutProgram` (for future use)
- `drizzle/0030_add_workout_set_completions_table.sql` - Created `WorkoutSetCompletion` table

#### 2. Schema Updates

- Added `real` type import to `lib/schema.js`
- Added `workoutSetCompletions` table definition
- Added `progress` field to `workoutPrograms` table (real/float, 0.0 to 1.0)

### API Changes

#### New API Route: `/api/workout-set-completions`

- **GET**: Fetch all set completions for a task on a specific date
- **POST**: Save/update a single set completion
- **DELETE**: Clear all set completions for a task on a specific date

### Component Changes

#### `components/WorkoutModal.jsx`

**Before:**

- Progress was kept only in memory
- Lost on page refresh
- Tried to save to `TaskCompletion.note` immediately

**After:**

- Loads set completions from database on mount
- Auto-saves each checkbox change to `WorkoutSetCompletion` table (debounced 500ms)
- Progress persists across page refreshes
- Only creates `TaskCompletion` when workout reaches 100%

**Key Changes:**

1. Removed `onSaveProgress` prop (no longer needed)
2. Added `useEffect` to load completions from API on modal open
3. Updated auto-save logic to save to `/api/workout-set-completions`

#### `app/page.jsx`

**Before:**

- `handleSaveWorkoutProgress` tried to create/update `TaskCompletion` records
- This caused the "Invalid time value" error

**After:**

- Removed `handleSaveWorkoutProgress` function entirely
- Removed `onSaveProgress` prop from `WorkoutModal`
- `onCompleteTask` now only creates `TaskCompletion` when called (at 100%)

## How It Works Now

### During Workout (0-99% complete)

1. User clicks checkbox in workout modal
2. State updates in `WorkoutModal` component
3. After 500ms debounce, set completion is saved to `WorkoutSetCompletion` table
4. **No `TaskCompletion` record is created**
5. User can refresh page and progress is restored from database

### At 100% Complete

1. `WorkoutModal` detects all sets are complete
2. Calls `onCompleteTask(taskId, date)`
3. Creates `TaskCompletion` record with `outcome: "completed"`
4. Task is marked as complete in the UI

### Data Flow

```
User clicks checkbox
  ↓
WorkoutModal state updates
  ↓
500ms debounce
  ↓
POST /api/workout-set-completions
  ↓
Saved to WorkoutSetCompletion table
  ↓
Progress persists across refreshes

When 100% complete:
  ↓
onCompleteTask() called
  ↓
TaskCompletion created with outcome="completed"
```

## Benefits

1. **✅ No more "Invalid time value" error** - We don't create TaskCompletion until workout is done
2. **✅ Accurate completion tracking** - Tasks only marked complete at 100%
3. **✅ Progress persistence** - Checkbox state saved to database, survives page refresh
4. **✅ Proper data modeling** - Relational table instead of JSONB for queryability
5. **✅ Auto-save** - No manual save button needed, saves automatically as you work

## Testing

To test:

1. Open a workout task
2. Check some boxes
3. Refresh the page
4. Reopen the workout - checkboxes should still be checked
5. Complete all sets - task should be marked as complete
6. Check database - `WorkoutSetCompletion` records should exist during workout, `TaskCompletion` created at end

## Files Changed

- `lib/schema.js` - Added `workoutSetCompletions` table, added `real` import
- `drizzle/0029_add_workout_progress_field.sql` - Added progress field
- `drizzle/0030_add_workout_set_completions_table.sql` - Created set completions table
- `app/api/workout-set-completions/route.js` - New API route for set completions
- `components/WorkoutModal.jsx` - Load/save set completions, removed onSaveProgress
- `app/page.jsx` - Removed handleSaveWorkoutProgress, removed onSaveProgress prop
