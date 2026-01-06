"use client";

import { useRef, useCallback } from "react";

/**
 * Custom hook for debounced saving
 *
 * @param {Function} saveFn - The function to call when saving (will receive the value as argument)
 * @param {number} delayMs - Debounce delay in milliseconds (default: 500)
 * @returns {Object} - { debouncedSave, immediateSave, cancelPending }
 *   - debouncedSave: Function to call on change (debounced)
 *   - immediateSave: Function to call for immediate save (clears pending debounce)
 *   - cancelPending: Function to cancel any pending debounced save
 *
 * @example
 * const { debouncedSave, immediateSave } = useDebouncedSave(
 *   (value) => onSave(taskId, value),
 *   500
 * );
 *
 * <TextField
 *   value={inputValue}
 *   onChange={(e) => {
 *     setInputValue(e.target.value);
 *     debouncedSave(e.target.value);
 *   }}
 *   onBlur={() => immediateSave(inputValue)}
 * />
 */
export function useDebouncedSave(saveFn, delayMs = 500) {
  const timeoutRef = useRef(null);

  const debouncedSave = useCallback(
    value => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        // If saveFn doesn't expect a value (no parameters), call it without one
        // Otherwise, pass the value
        if (saveFn.length === 0) {
          saveFn();
        } else {
          saveFn(value);
        }
        timeoutRef.current = null;
      }, delayMs);
    },
    [saveFn, delayMs]
  );

  const immediateSave = useCallback(
    value => {
      // Clear any pending debounced save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Save immediately
      // If saveFn doesn't expect a value (no parameters), call it without one
      // Otherwise, pass the value (or undefined if not provided)
      if (saveFn.length === 0) {
        saveFn();
      } else {
        saveFn(value);
      }
    },
    [saveFn]
  );

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { debouncedSave, immediateSave, cancelPending };
}
