# setState in useEffect Fix - January 2026

## Overview

Fixed all instances of the `setState` in `useEffect` anti-pattern across the codebase to comply with React 19's stricter linting rules and improve performance.

## Problem Statement

React 19's ESLint plugin now flags synchronous `setState` calls within `useEffect` as errors:

```
Error: Calling setState synchronously within an effect can trigger cascading renders
```

This pattern causes:

- **Cascading renders** that hurt performance
- **Confusing data flow** (controlled/uncontrolled hybrids)
- **Maintenance issues** (unclear source of truth)

## Files Fixed

### 1. `components/DebouncedInput.jsx`

**Issue:** Component tried to sync internal state with external prop continuously.

**Fix:** Made component fully uncontrolled - uses `value` prop only for initial state.

```javascript
// Before
useEffect(() => {
  if (externalValue !== undefined) {
    const timeoutId = setTimeout(() => {
      setInternalValue(externalValue);
    }, 0);
    return () => clearTimeout(timeoutId);
  }
}, [externalValue]);

// After
const [internalValue, setInternalValue] = useState(initialValue);
// No effect needed!
```

**Usage:** If parent needs to reset the value, use a `key` prop:

```javascript
<DebouncedInput key={resetKey} value={initialValue} onChange={handleChange} />
```

### 2. `components/TaskItem.jsx` - Title Editing

**Issue:** Title state synced with task prop continuously.

**Fix:** Sync only when user starts editing (intentional action).

```javascript
// Before
useEffect(() => {
  setEditedTitle(task.title);
}, [task.title]);

// After
const handleTitleClick = () => {
  setEditedTitle(task.title); // Sync on edit start
  setIsEditingTitle(true);
};
```

### 3. `components/TaskItem.jsx` - Note Input

**Issue:** Note input needed to sync with async completion data.

**Fix:** Use a `key` prop to force remount when external data changes.

```javascript
// Before
useEffect(() => {
  if (isTextTask && viewDate) {
    setNoteInput(existingCompletion?.note || "");
  }
}, [isTextTask, existingCompletion?.note, viewDate]);

// After
const savedNote = existingCompletion?.note || "";
const noteInputKey = `${task.id}-${viewDate?.toISOString()}-${savedNote}`;
const [noteInput, setNoteInput] = useState(savedNote);

<Input key={noteInputKey} value={noteInput} onChange={...} />
```

### 4. `hooks/useResizeHandlers.js`

**Issue:** Maintained local state copies of preference widths with sync effects.

**Fix:** Removed local state entirely - work directly with preference values.

```javascript
// Before
const [localBacklogWidth, setLocalBacklogWidth] = useState(initialBacklogWidth);

useEffect(() => {
  setLocalBacklogWidth(initialBacklogWidth);
}, [initialBacklogWidth]);

// After
// No local state - update preferences directly during drag
const handleMouseMove = e => {
  const newWidth = calculateWidth(e);
  setBacklogWidth(newWidth);
};

return { backlogWidth: initialBacklogWidth };
```

**Updated usage in `app/page.jsx`:**

```javascript
// Before
w={resizeHandlers.isResizing ? resizeHandlers.localBacklogWidth : backlogWidth}

// After
w={resizeHandlers.backlogWidth}
```

## Patterns NOT Changed

These patterns were reviewed and deemed acceptable:

### Modal Initialization (`WorkoutBuilder.jsx`, `WorkoutModal.jsx`)

```javascript
useEffect(() => {
  if (isOpen && externalData) {
    setLocalData(externalData);
  } else if (!isOpen) {
    setLocalData(null);
  }
}, [isOpen, externalData]);
```

**Why acceptable:** One-time initialization when modal opens, not continuous syncing.

### External System Sync (`NotesView.jsx`)

```javascript
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);
```

**Why acceptable:** Syncing React state with external system (browser API).

## Testing

- ✅ All linting errors resolved: `npm run lint` passes
- ✅ Production build succeeds: `npm run build` passes
- ✅ No runtime errors introduced
- ✅ All existing functionality preserved

## Key Takeaways

1. **Default to uncontrolled components** - Use props only for initial state
2. **Use `key` prop to reset state** - Forces remount with fresh state
3. **Avoid local state copies** - Work directly with the source of truth
4. **setState in callbacks is fine** - Event handlers, subscriptions are okay
5. **One-time initialization is acceptable** - But verify it's truly one-time

## Documentation

Created comprehensive guide: `docs/REACT_HOOKS_BEST_PRACTICES.md`

This document includes:

- Problem explanation
- Common problematic patterns
- Solutions for each pattern
- Decision tree for evaluating patterns
- Real examples from this codebase
- References to React documentation

## Future Prevention

When adding new components:

1. **Ask:** Does this need to sync state with props?
   - If yes, consider making it fully controlled instead

2. **Ask:** Is this loading async data?
   - If yes, use a `key` prop to force remount

3. **Ask:** Can I avoid local state entirely?
   - Often yes - work directly with the source of truth

4. **Run linter frequently** - Catch issues early
   ```bash
   npm run lint
   ```

## Related Issues

- React 19 stricter linting rules
- Performance optimization (fewer re-renders)
- Code maintainability improvements

## References

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- ESLint rule: `react-hooks/set-state-in-effect`
