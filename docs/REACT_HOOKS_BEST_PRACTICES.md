# React Hooks Best Practices - setState in useEffect

## The Problem

React 19's linter now flags `setState` calls directly within `useEffect` as an error:

```javascript
// ❌ BAD - Triggers linter error
useEffect(() => {
  setInternalValue(externalValue);
}, [externalValue]);
```

**Why is this bad?**

1. **Cascading renders** - Causes unnecessary re-renders that hurt performance
2. **Architectural smell** - Usually indicates a controlled/uncontrolled hybrid pattern
3. **Confusing data flow** - Makes it unclear what the source of truth is

## Common Problematic Patterns

### Pattern 1: Syncing State with Props

```javascript
// ❌ BAD
const [internalValue, setInternalValue] = useState(externalValue);

useEffect(() => {
  setInternalValue(externalValue);
}, [externalValue]);
```

**Why it happens:** Component tries to be both controlled and uncontrolled.

**Solutions:**

#### Solution A: Make it Uncontrolled (Recommended for most cases)

Use the prop only for initial state. If parent needs to reset, use a `key` prop:

```javascript
// ✅ GOOD - Uncontrolled component
const [internalValue, setInternalValue] = useState(initialValue);

// No effect needed!

// Parent usage:
<MyComponent key={resetKey} value={initialValue} onChange={handleChange} />;
```

#### Solution B: Make it Fully Controlled

Remove internal state entirely and work directly with props:

```javascript
// ✅ GOOD - Fully controlled
function MyComponent({ value, onChange }) {
  return <input value={value} onChange={onChange} />;
}
```

### Pattern 2: Syncing with Async External Data

```javascript
// ❌ BAD
const [noteInput, setNoteInput] = useState("");

useEffect(() => {
  if (externalData) {
    setNoteInput(externalData.note);
  }
}, [externalData]);
```

**Why it happens:** Data loads asynchronously and needs to populate the input.

**Solution:** Use a key that changes when external data changes:

```javascript
// ✅ GOOD - Force remount when data changes
const savedNote = externalData?.note || "";
const noteInputKey = `${id}-${date}-${savedNote}`;
const [noteInput, setNoteInput] = useState(savedNote);

return <Input key={noteInputKey} value={noteInput} onChange={...} />;
```

### Pattern 3: Syncing Local State with Preference/Redux State

```javascript
// ❌ BAD
const [localWidth, setLocalWidth] = useState(preferenceWidth);

useEffect(() => {
  setLocalWidth(preferenceWidth);
}, [preferenceWidth]);
```

**Why it happens:** Trying to have a "working copy" during drag operations.

**Solution:** Remove local state and work directly with the preference state:

```javascript
// ✅ GOOD - No local state needed
function useResizeHandlers({ width, setWidth }) {
  const handleMouseMove = e => {
    const newWidth = calculateWidth(e);
    setWidth(newWidth); // Update preference directly
  };

  return { width }; // Return preference value directly
}
```

## Acceptable Patterns

### Pattern 1: Initialization on Mount/Modal Open

```javascript
// ✅ ACCEPTABLE - One-time initialization
useEffect(() => {
  if (isOpen && externalData) {
    setLocalData(externalData);
  } else if (!isOpen) {
    setLocalData(null);
  }
}, [isOpen, externalData]);
```

**Why it's okay:** Responds to modal state change, not continuously syncing.

### Pattern 2: Syncing with External Systems

```javascript
// ✅ ACCEPTABLE - Syncing with browser APIs
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);
```

**Why it's okay:** Syncing React state with external system (window resize).

### Pattern 3: Subscribing to External State

```javascript
// ✅ ACCEPTABLE - Subscribing to external updates
useEffect(() => {
  const unsubscribe = externalStore.subscribe(newValue => {
    setState(newValue);
  });
  return unsubscribe;
}, []);
```

**Why it's okay:** setState is in a callback, not synchronous in effect body.

## Decision Tree

When you see `setState` in a `useEffect`, ask:

1. **Is this syncing props with state?**
   - Yes → Remove effect, use key or make fully controlled

2. **Is this loading async data?**
   - Yes → Use key to force remount when data changes

3. **Is this a one-time initialization?**
   - Yes → Probably okay, but verify it only runs on mount/open

4. **Is this syncing with an external system?**
   - Yes → Probably okay if using callbacks or event listeners

## Real Examples from Juda Codebase

### Fixed: DebouncedInput

**Before:**

```javascript
const [internalValue, setInternalValue] = useState(externalValue || "");

useEffect(() => {
  if (externalValue !== undefined) {
    const timeoutId = setTimeout(() => {
      setInternalValue(externalValue);
    }, 0);
    return () => clearTimeout(timeoutId);
  }
}, [externalValue]);
```

**After:**

```javascript
// Uncontrolled - only use initialValue for initial state
const [internalValue, setInternalValue] = useState(initialValue);

// No effect needed!

// Parent uses key to reset:
<DebouncedInput key={resetKey} value={initialValue} onChange={handleChange} />;
```

### Fixed: TaskItem Title Editing

**Before:**

```javascript
const [editedTitle, setEditedTitle] = useState(task.title);

useEffect(() => {
  setEditedTitle(task.title);
}, [task.title]);
```

**After:**

```javascript
const [editedTitle, setEditedTitle] = useState(task.title);

const handleTitleClick = () => {
  // Sync with current task title when starting edit
  setEditedTitle(task.title);
  setIsEditingTitle(true);
};
```

### Fixed: TaskItem Note Input

**Before:**

```javascript
const [noteInput, setNoteInput] = useState("");

useEffect(() => {
  if (isTextTask && viewDate) {
    setNoteInput(existingCompletion?.note || "");
  }
}, [isTextTask, existingCompletion?.note, viewDate]);
```

**After:**

```javascript
const savedNote = existingCompletion?.note || "";
const noteInputKey = `${task.id}-${viewDate?.toISOString()}-${savedNote}`;
const [noteInput, setNoteInput] = useState(savedNote);

return <Input key={noteInputKey} value={noteInput} onChange={...} />;
```

### Fixed: useResizeHandlers

**Before:**

```javascript
const [localBacklogWidth, setLocalBacklogWidth] = useState(initialBacklogWidth);

useEffect(() => {
  setLocalBacklogWidth(initialBacklogWidth);
}, [initialBacklogWidth]);

// Use localBacklogWidth during drag
```

**After:**

```javascript
// No local state - work directly with preference values
const handleMouseMove = e => {
  const newWidth = calculateWidth(e);
  setBacklogWidth(newWidth); // Update preference directly
};

return { backlogWidth: initialBacklogWidth }; // Return preference value
```

## Summary

- **Default to uncontrolled components** - Use props only for initial state
- **Use `key` prop to reset** - Forces remount with fresh state
- **Avoid local state copies** - Work directly with the source of truth
- **setState in callbacks is okay** - Event handlers, subscriptions, etc.
- **One-time initialization is okay** - But verify it's truly one-time

## References

- [React Docs: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React Docs: useRef](https://react.dev/reference/react/useRef)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
