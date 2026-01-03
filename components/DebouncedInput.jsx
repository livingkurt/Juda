"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Input } from "@chakra-ui/react";

/**
 * Input that debounces onChange to reduce re-renders
 * Useful for search inputs and other fields that trigger expensive operations
 *
 * Note: This component manages its own internal state and only calls onChange
 * after the user stops typing for debounceMs milliseconds.
 */
export const DebouncedInput = memo(function DebouncedInput({
  value: externalValue,
  onChange,
  debounceMs = 300,
  ...props
}) {
  // Initialize with external value, but manage internally
  const [internalValue, setInternalValue] = useState(externalValue || "");

  // Sync internal value when external value changes (e.g., from parent reset)
  // This is necessary for controlled component behavior
  // Use setTimeout to avoid synchronous setState warning
  useEffect(() => {
    if (externalValue !== undefined) {
      const timeoutId = setTimeout(() => {
        setInternalValue(externalValue);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [externalValue]);

  // Debounced callback - fires onChange after user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, debounceMs, onChange]);

  const handleChange = useCallback(e => {
    setInternalValue(e.target.value);
  }, []);

  return <Input value={internalValue} onChange={handleChange} {...props} />;
});
