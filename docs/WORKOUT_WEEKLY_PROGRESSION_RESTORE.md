# Workout Weekly Progression Feature - Restoration

**Date**: January 6, 2025
**Status**: ✅ Complete

## Overview

Restored the weekly progression feature for workout exercises that was lost during the Chakra UI to Material UI migration. This feature allows users to set different target values for each week of a workout program, with the ability to mark specific weeks as "deload" (easier recovery weeks) or "test" (testing/max effort weeks).

## Changes Made

### 1. WorkoutBuilder.jsx - Added Weekly Progression UI

Added a visual interface below each exercise that displays when `numberOfWeeks > 0`:

- **Weekly Progression Grid**: Shows one card per week with:
  - Week number label
  - Target value input field (numeric)
  - "Deload" toggle button (blue when active)
  - "Test" toggle button (orange when active)

- **Visual Indicators**:
  - Deload weeks: Blue background (`info.50`) with blue border
  - Test weeks: Orange background (`warning.50`) with orange border
  - Normal weeks: Default background

- **Behavior**:
  - Deload and Test are mutually exclusive (can't be both)
  - Changes are saved to the exercise's `weeklyProgression` array
  - Each progression entry contains: `{ week, targetValue, isDeload, isTest }`

### 2. How It Works

#### Setting Up Progression

1. User sets "Number of Weeks" (e.g., 5)
2. System automatically creates `weeklyProgression` array for all exercises
3. Each week gets initialized with the exercise's default `targetValue`
4. User can then customize each week's target and flags

#### Example Progression

```javascript
exercise.weeklyProgression = [
  { week: 1, targetValue: 10, isDeload: false, isTest: false },
  { week: 2, targetValue: 12, isDeload: false, isTest: false },
  { week: 3, targetValue: 14, isDeload: false, isTest: false },
  { week: 4, targetValue: 8, isDeload: true, isTest: false }, // Deload week
  { week: 5, targetValue: null, isDeload: false, isTest: true }, // Test week
];
```

#### During Workout Execution (WorkoutModal.jsx)

- System calculates current week based on task recurrence dates
- `WorkoutExerciseCard` reads the progression for current week
- Displays appropriate target value and badges (Deload/Test)
- Users can input actual values achieved during the test week

## Technical Details

### Data Flow

1. **WorkoutBuilder.jsx** (lines 232-261):
   - `updateNumberOfWeeks()` creates/updates `weeklyProgression` arrays
   - Preserves existing progression data when changing week count

2. **WorkoutBuilder.jsx** (lines 553-658):
   - Renders weekly progression UI for each exercise
   - Updates individual week data via `updateExercise()`

3. **WorkoutExerciseCard.jsx** (lines 28-31):
   - Reads current week's progression
   - Displays target value and flags during workout execution

4. **WorkoutModal.jsx** (lines 68-83):
   - Calculates current week from task dates
   - Passes to WorkoutExerciseCard for display

### UI Components Used

- **Material UI Grid**: Responsive layout (6 cols mobile, 4 cols tablet, 2.4 cols desktop)
- **Paper**: Card container with conditional styling
- **TextField**: Numeric input for target values
- **ToggleButton**: Deload/Test flags
- **Stack**: Layout management

## Testing Checklist

- [x] Set number of weeks to 5
- [x] Verify 5 week cards appear under each exercise
- [x] Change target values for different weeks
- [x] Toggle Deload flag (should turn blue)
- [x] Toggle Test flag (should turn orange)
- [x] Verify Deload and Test are mutually exclusive
- [x] Save workout and reload (data persists)
- [x] Execute workout in WorkoutModal
- [x] Verify correct week's target value displays
- [x] Verify Deload/Test badges appear correctly

## Benefits

1. **Progressive Overload**: Gradually increase difficulty week by week
2. **Deload Weeks**: Built-in recovery periods to prevent overtraining
3. **Test Weeks**: Measure progress and adjust future programs
4. **Flexibility**: Each exercise can have unique progression
5. **Visual Clarity**: Color-coded weeks make planning intuitive

## Future Enhancements

- Copy progression from one exercise to another
- Progression templates (linear, wave, etc.)
- Auto-calculate progression based on percentage increases
- Graph view of progression over weeks
- Export/import progression patterns

## Related Files

- `components/WorkoutBuilder.jsx` - Builder UI with progression editor
- `components/WorkoutModal.jsx` - Workout execution modal
- `components/WorkoutExerciseCard.jsx` - Individual exercise display
- `lib/schema.js` - Database schema (weeklyProgressions table)
- `drizzle/0023_add_number_of_weeks_and_weekly_progression.sql` - Migration

## Notes

- The feature follows the KISS principle (Keep It Simple, Stupid)
- No breaking changes to existing workouts
- Backward compatible with exercises without progression
- Linting: All code passes ESLint checks ✅
