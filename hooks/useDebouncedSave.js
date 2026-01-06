"use client";

import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Custom hook for debounced saving with saving state tracking
 *
 * @param {Function} saveFn - The function to call when saving (will receive the value as argument)
 * @param {number} delayMs - Debounce delay in milliseconds (default: 500)
 * @returns {Object} - { debouncedSave, immediateSave, cancelPending, isSaving, justSaved }
 *   - debouncedSave: Function to call on change (debounced)
 *   - immediateSave: Function to call for immediate save (clears pending debounce)
 *   - cancelPending: Function to cancel any pending debounced save
 *   - isSaving: Boolean indicating if a save is pending or in progress
 *   - justSaved: Boolean indicating if save just completed (shows "Saved" briefly)
 *
 * @example
 * const { debouncedSave, immediateSave, isSaving, justSaved } = useDebouncedSave(
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
 * <AutosaveBadge isSaving={isSaving} justSaved={justSaved} />
 */
export function useDebouncedSave(saveFn, delayMs = 500) {
  const timeoutRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef(null);

  const debouncedSave = useCallback(
    value => {
      setIsSaving(true);
      setJustSaved(false);

      // Clear any existing "saved" timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(async () => {
        try {
          // If saveFn doesn't expect a value (no parameters), call it without one
          // Otherwise, pass the value
          if (saveFn.length === 0) {
            await saveFn();
          } else {
            await saveFn(value);
          }

          // Show "Saved" briefly after successful save
          setIsSaving(false);
          setJustSaved(true);

          // Hide "Saved" after 1.5 seconds
          savedTimeoutRef.current = setTimeout(() => {
            setJustSaved(false);
          }, 1500);
        } catch (_error) {
          // On error, just stop showing saving state
          setIsSaving(false);
          setJustSaved(false);
        }
        timeoutRef.current = null;
      }, delayMs);
    },
    [saveFn, delayMs]
  );

  const immediateSave = useCallback(
    async value => {
      setIsSaving(true);
      setJustSaved(false);

      // Clear any existing "saved" timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }

      // Clear any pending debounced save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        // Save immediately
        // If saveFn doesn't expect a value (no parameters), call it without one
        // Otherwise, pass the value (or undefined if not provided)
        if (saveFn.length === 0) {
          await saveFn();
        } else {
          await saveFn(value);
        }

        // Show "Saved" briefly after successful save
        setIsSaving(false);
        setJustSaved(true);

        // Hide "Saved" after 1.5 seconds
        savedTimeoutRef.current = setTimeout(() => {
          setJustSaved(false);
        }, 1500);
      } catch (_error) {
        // On error, just stop showing saving state
        setIsSaving(false);
        setJustSaved(false);
      }
    },
    [saveFn]
  );

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsSaving(false);
    setJustSaved(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return { debouncedSave, immediateSave, cancelPending, isSaving, justSaved };
}
