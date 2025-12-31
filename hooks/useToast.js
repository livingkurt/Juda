"use client";

import { useState, useCallback } from "react";

// Simple toast state management
let toastListeners = [];
let toastIdCounter = 0;

export function useToast() {
  const [, setCounter] = useState(0);

  const triggerUpdate = useCallback(() => {
    setCounter(c => c + 1);
  }, []);

  const toast = useCallback(
    options => {
      const { title, description, status = "info", duration = 3000 } = options || {};
      if (!title) return;

      const id = `toast-${toastIdCounter++}`;
      const toastData = {
        id,
        title,
        description,
        status,
        duration,
      };

      // Notify all listeners
      toastListeners.forEach(listener => listener(toastData));
      triggerUpdate();

      return id;
    },
    [triggerUpdate]
  );

  return { toast };
}

// Subscribe to toast events
export function subscribeToToasts(callback) {
  toastListeners.push(callback);
  return () => {
    toastListeners = toastListeners.filter(listener => listener !== callback);
  };
}
