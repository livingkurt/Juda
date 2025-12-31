# Subtask Completion Feature Parity Fix

## Summary

Fixed subtasks to have the same completion features as parent tasks, including:
- No automatic time assignment when completed individually
- Full outcome support (completed, not completed) for recurring subtasks
- Independent completion status (doesn't cascade to siblings)

## Changes Made

### 1. Removed Auto-Time Assignment for Subtasks (`app/page.jsx`)

**Location**: `handleToggleSubtaskCompletion` function (lines 771-795)

**Before**: Subtasks would automatically get assigned the current time when checked:
```javascript
// Old behavior - set time when completing
const currentTime = minutesToTime(now.getHours() * 60 + now.getMinutes());
if (!isRecurringSubtask && !subtask.time && !isCompletedOnTargetDate) {
  await updateTask(subtaskId, {
    time: currentTime,
  });
}
```

**After**: Subtasks preserve their existing time or stay untimed:
```javascript
// New behavior - DON'T set time
// Removed time-setting logic for non-recurring subtasks
// Subtasks should preserve their existing time or stay untimed
```

### 2. Added Outcome Support for Subtasks (`app/page.jsx`)

**Location**: `handleOutcomeChange` function (lines 804-863)

**Before**: Outcome changes always cascaded to all subtasks, even when changing a single subtask

**After**: Added subtask detection to prevent cascading:
```javascript
// Check if this is a subtask (has a parentId)
const isSubtask = task?.parentId != null;

// Only cascade to subtasks if this is a PARENT task (not a subtask itself)
if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
  await Promise.all(
    task.subtasks.map(subtask => createCompletion(subtask.id, dateObj.toISOString(), { outcome }))
  );
}
```

### 3. Enabled Outcome Menu for Subtasks (`components/TaskItem.jsx`)

**Location**: Lines 178-192 and 803-807

**Before**: Subtasks only showed outcome menu if they themselves had recurrence set
**After**: Subtasks now check if their parent is recurring and show menu accordingly

```javascript
// Check if parent is recurring
const parentIsRecurring = task.parentRecurrence && task.parentRecurrence.type !== "none";
const effectivelyRecurring = isRecurring || (isSubtask && parentIsRecurring);

const shouldShowMenu =
  (isToday || isSubtask || isBacklog) &&
  onOutcomeChange &&
  effectivelyRecurring &&  // Now uses effectivelyRecurring instead of just isRecurring
  (taskIsOverdue || outcome !== null);
```

**Passing Parent Recurrence**: When rendering subtasks, parent's recurrence is passed:
```javascript
task={{
  ...subtask,
  parentRecurrence: task.recurrence,  // Pass parent's recurrence to subtask
}}
```

## Behavior Matrix

### Subtask Completion Behavior

| Action | Before | After |
|--------|--------|-------|
| Check subtask from backlog | Sets time to now | Preserves existing time or stays untimed |
| Check recurring subtask | Sets time to now | Preserves existing time or stays untimed |
| Set subtask outcome (recurring) | Not available | Full support (completed/not completed) |
| Change parent outcome | Cascades to all subtasks | Still cascades to all subtasks ✓ |
| Change subtask outcome | Would cascade to siblings | Only affects that subtask ✓ |

### Time Assignment Rules (After Fix)

| Task Type | Completion Method | Time Behavior |
|-----------|------------------|---------------|
| Parent task (non-recurring, no time) | Check | Sets to current time |
| Parent task (recurring, no time) | Check | Stays untimed |
| Subtask (any type, no time) | Check | Stays untimed ✓ |
| Subtask (any type, has time) | Check | Preserves existing time ✓ |

### Outcome Support (After Fix)

| Task Type | Recurring | Outcome Options |
|-----------|-----------|-----------------|
| Parent task | Yes | Completed, Not Completed ✓ |
| Parent task | No | Simple toggle |
| Subtask | Yes | Completed, Not Completed ✓ |
| Subtask | No | Simple toggle |

## Testing Checklist

- [x] Subtask without time stays untimed when checked
- [x] Subtask with time preserves time when checked
- [x] Subtask of recurring parent shows outcome menu (even if subtask itself has no recurrence)
- [x] Subtask with own recurrence shows outcome menu
- [x] Subtask outcome change doesn't affect siblings
- [x] Parent outcome change still cascades to all subtasks
- [x] Backlog subtasks get startDate but not time when checked
- [x] No linting errors introduced

## Technical Details

### Key Functions Modified

1. **`handleToggleSubtaskCompletion`** (app/page.jsx)
   - Removed time assignment logic
   - Simplified to only handle completion records
   - Preserves existing time or leaves untimed

2. **`handleOutcomeChange`** (app/page.jsx)
   - Added `isSubtask` check using `task?.parentId != null`
   - Conditional cascading: only cascades if parent task
   - Subtasks can now change outcome independently

3. **`TaskItem` component** (components/TaskItem.jsx)
   - Added `parentRecurrence` check for subtasks
   - Subtasks now inherit parent's recurring behavior for menu display
   - Pass parent's recurrence when rendering subtasks
   - Uses `effectivelyRecurring` instead of just `isRecurring`

### Database Schema

No schema changes required. Uses existing fields:
- `parentId` - identifies subtasks
- `time` - optional time field (now preserved for subtasks)
- `recurrence` - determines if outcome menu shows
- `taskCompletions` table - stores outcome records

## User-Facing Changes

### What Users Will Notice

1. **Subtasks stay untimed**: Checking a subtask no longer forces it to have a time
2. **More control**: Recurring subtasks can be marked as "not completed" individually
3. **Independent status**: Changing one subtask doesn't affect its siblings
4. **Consistent behavior**: Subtasks now work just like parent tasks

### What Stays the Same

1. **Parent cascading**: Changing a parent task's outcome still updates all its subtasks
2. **Backlog behavior**: Subtasks from backlog still get moved to today when checked
3. **Visual indicators**: Completion checkmarks and strikethrough still work
4. **Recurring logic**: Recurring subtasks still show on their scheduled days

## Related Files

- `app/page.jsx` - Main logic for task/subtask completion
- `components/TaskItem.jsx` - UI component for tasks and subtasks
- `hooks/useCompletions.js` - Completion state management (unchanged)
- `app/api/completions/route.js` - API endpoints (unchanged)

## Notes

- This fix maintains backward compatibility
- No database migration needed
- Existing subtask completions remain valid
- The change is purely behavioral, not structural

