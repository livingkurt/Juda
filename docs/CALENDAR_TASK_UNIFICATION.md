# Calendar Task Component Unification

**Date**: January 4, 2026
**Status**: ✅ Complete

## Summary

Unified all calendar task components into a single `CalendarTask` component that handles all rendering scenarios across different calendar views. This eliminates code duplication and ensures consistent behavior and styling.

## Problem

Previously, we had 4 separate task components for calendar views:

1. **TimedTask.jsx** - Day view timed tasks (with positioning and resize)
2. **UntimedTask.jsx** - Day view all-day tasks (simple layout)
3. **TimedWeekTask.jsx** - Week view timed tasks (smaller, with positioning)
4. **UntimedWeekTask.jsx** - Week view all-day tasks (smaller, simple layout)

This led to:

- Code duplication across components
- Inconsistent styling and behavior
- More maintenance overhead when making changes
- Harder to ensure feature parity across views

## Solution

Created a single unified `CalendarTask` component that:

1. **Accepts a `variant` prop** to determine rendering mode:
   - `"timed"` - Day view timed tasks
   - `"untimed"` - Day view all-day tasks
   - `"timed-week"` - Week view timed tasks
   - `"untimed-week"` - Week view all-day tasks

2. **Handles all scenarios** with conditional logic:
   - Absolute positioning for timed tasks
   - Simple layout for untimed tasks
   - Resize handles for timed tasks
   - Appropriate font sizes for week vs day views
   - Internal drag support for time adjustment

3. **Maintains all features** from the original components:
  - Drag & drop with @dnd-kit
   - Context menu with TaskContextMenu
   - Tag management with TagMenuSelector
   - Completion states (completed, not_completed)
   - Recurring task support
   - Workout task support
   - Visual feedback (striped pattern for not_completed)

## Implementation Details

### Component Props

```javascript
CalendarTask({
  task, // Task object
  createDraggableId, // Function to create draggable ID
  date, // Date for this task instance
  variant, // "timed" | "untimed" | "timed-week" | "untimed-week"
  getTaskStyle, // [Optional] Positioning style (timed only)
  internalDrag, // [Optional] Internal drag state (timed only)
  handleInternalDragStart, // [Optional] Drag handler (timed only)
});
```

### Variant Behavior

| Variant        | Layout   | Positioning | Resize Handle | Font Size | Use Case          |
| -------------- | -------- | ----------- | ------------- | --------- | ----------------- |
| `timed`        | Absolute | Yes         | Yes (3px)     | sm        | Day view timed    |
| `untimed`      | Relative | No          | No            | sm        | Day view all-day  |
| `timed-week`   | Absolute | Yes         | Yes (2px)     | xs        | Week view timed   |
| `untimed-week` | Relative | No          | No            | xs        | Week view all-day |

### Updated Components

1. **CalendarDayView.jsx**
   - Timed tasks: `variant="timed"`
   - Untimed tasks: `variant="untimed"`

2. **TimedColumn.jsx** (Week view)
   - Timed tasks: `variant="timed-week"`

3. **DayHeaderColumn.jsx** (Week view)
   - Untimed tasks: `variant="untimed-week"`

### Deleted Components

- ❌ `TimedTask.jsx`
- ❌ `UntimedTask.jsx`
- ❌ `TimedWeekTask.jsx`
- ❌ `UntimedWeekTask.jsx`

## Benefits

1. **Single Source of Truth**: All calendar task rendering logic in one place
2. **Consistent Behavior**: Same features and styling across all views
3. **Easier Maintenance**: Changes only need to be made once
4. **Better Testing**: Only one component to test
5. **Reduced Bundle Size**: Less duplicated code
6. **Type Safety**: Single component signature to maintain

## Testing

- ✅ Linting passes with no errors
- ✅ Build completes successfully
- ✅ All calendar views render correctly
- ✅ Drag & drop works across all views
- ✅ Context menus work in all scenarios
- ✅ Resize handles work for timed tasks
- ✅ Internal drag (time adjustment) works

## Future Improvements

Potential enhancements to consider:

1. Add TypeScript for better type safety
2. Extract variant-specific logic into separate utility functions
3. Add unit tests for each variant
4. Consider using CSS modules for variant-specific styles
5. Add Storybook stories for each variant

## Migration Notes

If you need to add new features to calendar tasks:

1. **Add to CalendarTask.jsx** - Don't create new components
2. **Use variant prop** - Check `variant` to conditionally apply features
3. **Test all variants** - Ensure changes work across all calendar views
4. **Update this doc** - Document any new variants or behaviors

## Related Files

- `components/CalendarTask.jsx` - The unified component
- `components/CalendarDayView.jsx` - Day view usage
- `components/CalendarWeekView.jsx` - Week view (uses TimedColumn and DayHeaderColumn)
- `components/TimedColumn.jsx` - Week view timed tasks
- `components/DayHeaderColumn.jsx` - Week view untimed tasks
- `components/TaskContextMenu.jsx` - Shared context menu
- `components/TagMenuSelector.jsx` - Shared tag selector

## Conclusion

This refactoring significantly improves code maintainability while preserving all existing functionality. The unified component makes it easier to ensure consistent behavior across all calendar views and reduces the cognitive load when making changes.
