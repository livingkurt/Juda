"use client";

import { useState, useEffect, memo } from "react";
import { TextField } from "@mui/material";

/**
 * Input that debounces onChange to reduce re-renders
 * Useful for search inputs and other fields that trigger expensive operations
 *
 * Note: This component is uncontrolled - it manages its own state internally.
 * The value prop is only used for initial state. If you need to reset the value
 * from the parent, use a key prop to force remount:
 *
 * <DebouncedInput key={resetKey} value={initialValue} onChange={handleChange} />
 */
export const DebouncedInput = memo(function DebouncedInput({
  value: initialValue = "",
  onChange,
  debounceMs = 300,
  ...props
}) {
  // Uncontrolled - only use initialValue for initial state
  const [internalValue, setInternalValue] = useState(initialValue);

  // Debounce the onChange callback
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, debounceMs, onChange]);

  return <TextField value={internalValue} onChange={e => setInternalValue(e.target.value)} {...props} />;
});
