# Workout Multi-Day Feature Implementation

## Problem

When creating workouts with the same exercises across multiple days (e.g., Night Stretches with identical exercises Mon-Sun), the old system required:

- Creating 7 separate day objects
- Manually duplicating the same exercises for each day
- Updating each day individually if exercises changed

This was tedious, error-prone, and resulted in massive migration files with repeated data.

## Solution

Changed the workout day structure from single-day to multi-day selection:

### Old Format

```javascript
{
  id: "day_123",
  name: "Monday",
  dayOfWeek: 1,  // Single day only
  exercises: [...]
}
```

### New Format

```javascript
{
  id: "day_123",
  name: "Daily Stretches",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],  // Array of days (Sun-Sat)
  exercises: [...]
}
```

## Changes Made

### 1. WeekdaySelector Component (`components/WeekdaySelector.jsx`) - **NEW**

Created a reusable component for selecting days of the week, used in both TaskDialog and WorkoutBuilder:

**Features:**

- Click to toggle days on/off
- Selected days show in blue (solid)
- Unselected days show in gray (outline)
- Prevents deselecting all days (configurable via `allowEmpty` prop)
- Configurable size (`xs`, `sm`, `md`)
- Configurable shape (circular or square)

**Props:**

```javascript
<WeekdaySelector
  selectedDays={[0, 1, 2, 3, 4, 5, 6]} // Array of day values (0=Sun, 6=Sat)
  onChange={newDays => setDays(newDays)}
  allowEmpty={false} // Prevent deselecting all days
  size="sm" // Button size
  circular={true} // Use circular buttons
  spacing={1} // Spacing between buttons
/>
```

### 2. WorkoutBuilder UI (`components/WorkoutBuilder.jsx`)

**Before:** Single dropdown to select one day of the week

**After:** Multi-select WeekdaySelector showing all 7 days:

```
Days: [Sun] [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]
```

**Key Functions:**

- `addDay()` - Creates new day with `daysOfWeek: [1]` (Monday by default)
- `updateDaysOfWeek()` - Updates the daysOfWeek array for a day
- Backward compatible: Converts old `dayOfWeek` to `daysOfWeek` array on load

### 3. TaskDialog (`components/TaskDialog.jsx`)

**Refactored** to use the new WeekdaySelector component instead of inline button mapping. This ensures consistent behavior and styling across the app.

### 4. WorkoutModal Display (`components/WorkoutModal.jsx`)

**Added Helper:**

```javascript
const isDayForCurrentDayOfWeek = day => {
  // Support both old dayOfWeek (single) and new daysOfWeek (array)
  if (day.daysOfWeek) {
    return day.daysOfWeek.includes(currentDayOfWeek);
  }
  if (day.dayOfWeek !== undefined) {
    return day.dayOfWeek === currentDayOfWeek;
  }
  return false;
};
```

This ensures:

- New format works correctly
- Old format still works (backward compatible)
- Finds the right day's exercises to display

### 5. Database Migration (`drizzle/0021_convert_dayofweek_to_daysofweek.sql`)

Automatically converts all existing workout tasks:

- Loops through all tasks with `workoutData`
- Finds days with old `dayOfWeek` field
- Converts to `daysOfWeek: [dayOfWeek]`
- Removes old `dayOfWeek` field
- Updates task and sets `updatedAt`

**Migration Output:**

```
✓ Updated task c1767290472157235c955f62 with new daysOfWeek format
✓ Updated task cm5ed463c43cbc0a46cdf1dc4 with new daysOfWeek format
✓ Migration complete: Converted all dayOfWeek to daysOfWeek arrays
```

## Benefits

### 1. Convenience

- Define exercises once, apply to multiple days
- No more copy-pasting the same exercises 7 times
- Easy to add/remove days from a section

### 2. Flexibility

- Still supports day-specific variations (e.g., "Monday - Leg Day")
- Can have some sections apply to all days, others to specific days
- Mix and match as needed

### 3. Maintainability

- Update exercises in one place
- Smaller migration files
- Less data duplication in database

## Example Use Cases

### Case 1: Daily Stretches (Same Every Day)

```javascript
{
  name: "Morning Stretches",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],  // All 7 days
  exercises: [
    { name: "Hamstring Stretch", sets: 1, reps: 2 },
    { name: "Quad Stretch", sets: 1, reps: 2 }
  ]
}
```

### Case 2: Weekday Workout (Mon-Fri Only)

```javascript
{
  name: "Morning Workout",
  daysOfWeek: [1, 2, 3, 4, 5],  // Mon-Fri
  exercises: [
    { name: "Push-ups", sets: 3, reps: 10 },
    { name: "Squats", sets: 3, reps: 15 }
  ]
}
```

### Case 3: Split Routine (Different Each Day)

```javascript
// Workout section with 3 different days
{
  name: "Workout",
  type: "workout",
  days: [
    {
      name: "Leg Day",
      daysOfWeek: [1, 4],  // Monday & Thursday
      exercises: [...]
    },
    {
      name: "Push Day",
      daysOfWeek: [2, 5],  // Tuesday & Friday
      exercises: [...]
    },
    {
      name: "Pull Day",
      daysOfWeek: [3],  // Wednesday only
      exercises: [...]
    }
  ]
}
```

## Backward Compatibility

The system is fully backward compatible:

- Old workouts with `dayOfWeek` still work
- Migration converts them automatically
- UI handles both formats gracefully
- No data loss or breaking changes

## Testing

Migration successfully ran on local database:

- ✅ 2 existing workout tasks converted
- ✅ No errors during migration
- ✅ UI displays multi-day selector correctly
- ✅ WorkoutModal finds correct day for current date

## Future Improvements

Potential enhancements:

1. **Quick Select Buttons**: "All Days", "Weekdays", "Weekends"
2. **Copy Day**: Duplicate a day's exercises to create variations
3. **Bulk Edit**: Change exercises across multiple days at once
4. **Templates**: Save common day configurations for reuse

## Files Changed

- `components/WeekdaySelector.jsx` - **NEW** Reusable weekday selector component
- `components/WorkoutBuilder.jsx` - Multi-day selector UI (uses WeekdaySelector)
- `components/TaskDialog.jsx` - Refactored to use WeekdaySelector
- `components/WorkoutModal.jsx` - Display logic for daysOfWeek
- `drizzle/0021_convert_dayofweek_to_daysofweek.sql` - Migration script
- `docs/WORKOUT_MULTI_DAY_FEATURE.md` - This documentation

## Deployment

To deploy:

1. ✅ Migration already generated and tested locally
2. ✅ Code changes committed
3. Push to production - migration runs automatically via `drizzle-kit migrate` in build step
4. No manual intervention needed
