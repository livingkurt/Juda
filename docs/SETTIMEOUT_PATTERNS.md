# setTimeout Patterns - Valid vs Invalid

## Overview

Not all `setTimeout` calls in `useEffect` are problematic. This document clarifies when `setTimeout` is valid (intentional feature) vs when it's masking architectural issues.

## Decision Tree

```
Is setTimeout in useEffect?
├─ YES → Ask: What's the purpose?
│   ├─ Syncing props with state → ❌ INVALID (use key or make controlled)
│   ├─ Debouncing user input → ✅ VALID (core feature)
│   ├─ Debouncing API calls → ✅ VALID (core feature)
│   ├─ UI delay for UX → ✅ VALID (intentional delay)
│   ├─ Auto-dismiss notifications → ✅ VALID (but needs cleanup!)
│   └─ Avoiding linter warning → ❌ INVALID (fix the real issue)
└─ NO → Not relevant to this doc
```

## Valid Patterns

### 1. Debouncing User Input

**Purpose:** Delay state updates to reduce expensive operations (API calls, re-renders)

```javascript
// ✅ VALID - Classic debouncing
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedValue(inputValue);
  }, 300);

  return () => clearTimeout(timer);
}, [inputValue]);
```

**Example:** `TaskSearchInput.jsx` - Delays search to avoid hitting API on every keystroke

### 2. Debouncing Auto-Save

**Purpose:** Batch rapid changes into a single save operation

```javascript
// ✅ VALID - Debounced save with cleanup
useEffect(() => {
  if (!shouldSave) return;

  const timer = setTimeout(() => {
    saveData(data);
  }, 500);

  return () => clearTimeout(timer);
}, [data, shouldSave, saveData]);
```

**Example:** `WorkoutModal.jsx` - Batches workout completion saves

### 3. Intentional UI Delay

**Purpose:** UX improvement - give user time to see feedback before auto-closing

```javascript
// ✅ VALID - UX delay
useEffect(() => {
  if (shouldAutoClose && hasChanged) {
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 200);
    return () => clearTimeout(timer);
  }
}, [shouldAutoClose, hasChanged]);
```

**Example:** `TaskItem.jsx` - Delays outcome menu close so user sees the change

### 4. Auto-Dismiss Notifications

**Purpose:** Automatically remove notifications after a duration

```javascript
// ✅ VALID - But needs proper cleanup!
useEffect(() => {
  const timeoutsRef = useRef({});

  const handleNotification = data => {
    addNotification(data);

    const timeoutId = setTimeout(() => {
      removeNotification(data.id);
      delete timeoutsRef.current[data.id];
    }, data.duration);

    timeoutsRef.current[data.id] = timeoutId;
  };

  const unsubscribe = subscribe(handleNotification);

  return () => {
    unsubscribe();
    // CRITICAL: Clean up all timeouts
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};
  };
}, []);
```

**Example:** `ToastContainer.jsx` - Auto-removes toasts after duration

## Invalid Patterns

### 1. Masking setState in Effect

**Purpose:** Trying to avoid linter warning without fixing the real issue

```javascript
// ❌ INVALID - Just masking the problem
useEffect(() => {
  const timer = setTimeout(() => {
    setInternalValue(externalValue); // Still syncing props!
  }, 0);
  return () => clearTimeout(timer);
}, [externalValue]);
```

**Fix:** Remove effect entirely, use key or make fully controlled

```javascript
// ✅ FIXED - Uncontrolled with key reset
const [value, setValue] = useState(initialValue);
// No effect needed!

// Parent:
<Component key={resetKey} value={initialValue} />;
```

### 2. Syncing Async Data

**Purpose:** Trying to sync local state with externally loaded data

```javascript
// ❌ INVALID - setTimeout doesn't help here
useEffect(() => {
  setTimeout(() => {
    setLocalData(externalData);
  }, 0);
}, [externalData]);
```

**Fix:** Use key to force remount when data changes

```javascript
// ✅ FIXED - Key forces fresh state
const dataKey = `${id}-${externalData?.timestamp}`;
const [localData, setLocalData] = useState(externalData);

<Component key={dataKey} data={localData} />;
```

## Common Mistakes

### Missing Cleanup in Auto-Dismiss

```javascript
// ❌ BAD - Timeout not cleaned up
useEffect(() => {
  const handleToast = data => {
    addToast(data);
    setTimeout(() => removeToast(data.id), 3000); // Memory leak!
  };

  const unsubscribe = subscribe(handleToast);
  return unsubscribe;
}, []);
```

**Problems:**

1. If component unmounts, timeout still fires
2. "setState on unmounted component" warnings
3. Memory leaks

**Fix:**

```javascript
// ✅ GOOD - Proper cleanup
useEffect(() => {
  const timeoutsRef = useRef({});

  const handleToast = data => {
    addToast(data);
    const timeoutId = setTimeout(() => {
      removeToast(data.id);
      delete timeoutsRef.current[data.id];
    }, 3000);
    timeoutsRef.current[data.id] = timeoutId;
  };

  const unsubscribe = subscribe(handleToast);

  return () => {
    unsubscribe();
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};
  };
}, []);
```

## Checklist

When you see `setTimeout` in `useEffect`, ask:

- [ ] **Is this intentional?** (debouncing, UX delay, auto-dismiss)
- [ ] **Does it have cleanup?** (return statement clears timeout)
- [ ] **Is it masking a sync issue?** (trying to sync props with state)
- [ ] **Could the architecture be simpler?** (controlled vs uncontrolled)

## Summary

| Pattern          | Valid? | Cleanup Needed? | Example             |
| ---------------- | ------ | --------------- | ------------------- |
| Debouncing input | ✅ Yes | ✅ Yes          | Search input        |
| Debouncing saves | ✅ Yes | ✅ Yes          | Auto-save           |
| UX delay         | ✅ Yes | ✅ Yes          | Menu close delay    |
| Auto-dismiss     | ✅ Yes | ✅ **Critical** | Toast notifications |
| Syncing props    | ❌ No  | N/A             | Use key instead     |
| Avoiding linter  | ❌ No  | N/A             | Fix architecture    |

## Key Takeaway

**setTimeout is valid when it's the feature, not a workaround.**

If you're using `setTimeout` to avoid a linter warning, you're treating the symptom, not the disease. Fix the underlying architectural issue instead.
