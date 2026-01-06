# WorkoutBuilder Performance Optimization

**Date**: January 6, 2025
**Status**: ✅ Complete

## Problem

The WorkoutBuilder modal was causing the page to freeze/appear crashed when opening. The issue was a combination of:

1. **Infinite loop potential** - Multiple instances of WorkoutBuilder rendering simultaneously
2. **Slow initial render** - Large nested component tree with many controlled inputs
3. **Unnecessary re-renders** - Functions recreated on every render causing child components to re-render

## Root Causes

### 1. Dual Rendering Issue

- WorkoutBuilder was rendered in **two places**:
  - `app/page.jsx` line 453: Using `dialogState.editingWorkoutTask`
  - `TaskDialog.jsx` line 1051: Using local props (`isOpen`, `onClose`, `taskId`)
- Both instances could render simultaneously, causing conflicts

### 2. Query Running When Closed

- RTK Query was fetching data even when modal was closed
- `skip: !taskId` wasn't enough - needed `skip: !taskId || !isOpen`

### 3. Performance Issues

- No memoization of callbacks
- Functions recreated on every render
- Child components re-rendering unnecessarily
- No loading state feedback

## Solutions Applied

### 1. Unified Component Interface

Made WorkoutBuilder support both prop-controlled and state-controlled modes:

```javascript
export default function WorkoutBuilder({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  taskId: propsTaskId,
  onSaveComplete: propsOnSaveComplete,
} = {}) {
  // Support both modes
  const taskId = propsTaskId || dialogState.editingWorkoutTask?.id;
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : Boolean(dialogState.editingWorkoutTask);

  // Query only runs when open
  const { data: existingProgram } = useGetWorkoutProgramQuery(taskId, {
    skip: !taskId || !isOpen,
  });
}
```

### 2. Early Return Pattern

```javascript
// Don't render anything if not open
if (!isOpen) {
  return null;
}
```

This prevents the entire component tree from rendering when the modal is closed.

### 3. Memoization with useCallback

Wrapped all callback functions to prevent recreation:

```javascript
// Before - recreated on every render
const addSection = () => {
  setSections([...sections, newSection]);
};

// After - stable reference
const addSection = useCallback(() => {
  setSections(prev => [...prev, newSection]);
}, []);
```

**Optimized functions:**

- `toggleExerciseProgression`
- `addSection`
- `updateSection`
- `deleteSection`
- `toggleSection`
- `toggleDay`
- All other update functions

### 4. Functional State Updates

Changed from direct state access to functional updates:

```javascript
// Before - depends on current state
setSections([...sections, newSection]);

// After - uses previous state
setSections(prev => [...prev, newSection]);
```

This prevents stale closures and improves performance.

### 5. Memoized Child Components

```javascript
const WeekdaySelector = memo(function WeekdaySelector({ selectedDays, onChange }) {
  const handleChange = useCallback(
    (event, newDays) => {
      if (newDays !== null && newDays.length > 0) {
        onChange(newDays);
      }
    },
    [onChange]
  );

  return <ToggleButtonGroup>...</ToggleButtonGroup>;
});
```

### 6. Loading State Feedback

Added visual feedback while data loads:

```javascript
{programLoading ? (
  <Box sx={{ display: "flex", justifyContent: "center", minHeight: 400 }}>
    <Typography>Loading workout program...</Typography>
  </Box>
) : (
  // Main content
)}
```

### 7. Collapsible Weekly Progression

Made weekly progression opt-in rather than always rendered:

```javascript
<Button onClick={() => toggleExerciseProgression(exercise.id)}>
  Weekly Progression ({numberOfWeeks} weeks)
</Button>
<Collapse in={expandedExercises[exercise.id]}>
  {/* Week cards only render when expanded */}
</Collapse>
```

## Performance Improvements

### Before

- ❌ Page appeared frozen/crashed on modal open
- ❌ 2-3 second delay with no feedback
- ❌ Multiple re-renders on every state change
- ❌ All week cards rendered immediately

### After

- ✅ Modal opens smoothly
- ✅ Loading indicator shows immediately
- ✅ Minimal re-renders (only affected components)
- ✅ Week cards render on-demand
- ✅ Responsive UI even with large workouts

## Technical Details

### State Management Pattern

```javascript
// Centralized state reset
const resetState = () => {
  loadedProgramIdRef.current = null;
  setName("");
  setNumberOfWeeks(0);
  setSections([]);
  setExpandedSections({});
  setExpandedDays({});
  setExpandedExercises({});
};

// Used in both close handlers
const handleClose = () => {
  if (propsOnClose) {
    propsOnClose();
  } else {
    dialogState.setEditingWorkoutTask(null);
  }
  resetState();
};
```

### Ref-Based Load Tracking

```javascript
const loadedProgramIdRef = useRef(null);

useEffect(() => {
  if (!existingProgram || !isOpen) return;

  // Only load if this is a different program
  if (existingProgram.taskId === loadedProgramIdRef.current) return;

  loadedProgramIdRef.current = existingProgram.taskId;
  // Load data...
}, [existingProgram, isOpen]);
```

Prevents infinite loops by tracking which program has been loaded.

## Testing Checklist

- [x] Modal opens without freezing
- [x] Loading state displays correctly
- [x] Data loads and populates fields
- [x] Weekly progression is collapsible
- [x] Expanding progression shows week cards
- [x] All CRUD operations work (add/edit/delete sections/days/exercises)
- [x] State resets properly on close
- [x] Works from both TaskDialog and page.jsx contexts
- [x] No console errors or warnings (except nested callback warning)
- [x] Smooth performance even with large workouts

## Files Modified

- `components/WorkoutBuilder.jsx` - Main performance optimizations
- Added `useCallback`, `memo`, loading states, collapsible UI

## Related Documentation

- `docs/WORKOUT_WEEKLY_PROGRESSION_RESTORE.md` - Weekly progression feature
- `docs/WORKOUT_PROGRESSION_VISUAL_GUIDE.md` - Visual guide
- `docs/REACT_HOOKS_BEST_PRACTICES.md` - React optimization patterns

## Notes

- The nested callback warning (line 290) is acceptable for this complex component
- Further optimization could include virtualizing the sections list if workouts become extremely large
- Consider lazy loading exercise cards if performance degrades with 50+ exercises
