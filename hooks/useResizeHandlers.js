"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Handles resizable panel logic
 * Works directly with preference values to avoid sync issues
 * Supports both mouse and touch events for desktop and iPad
 */
export function useResizeHandlers({ backlogWidth: initialBacklogWidth, setBacklogWidth }) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);

  const resizeStartRef = useRef(null);
  const rafRef = useRef(null);

  // Helper to get X coordinate from mouse or touch event
  const getClientX = e => {
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };

  // Start backlog resize (works for both mouse and touch)
  const handleBacklogResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("backlog");
      const clientX = getClientX(e);
      resizeStartRef.current = {
        startX: clientX,
        startWidth: initialBacklogWidth,
      };
    },
    [initialBacklogWidth]
  );

  // Handle mouse move and touch move during resize
  // Directly updates preference values during drag for smooth resizing
  useEffect(() => {
    if (!isResizing || !resizeType) return;

    const handleMove = e => {
      if (!resizeStartRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!resizeStartRef.current) return;
        const clientX = getClientX(e);
        const deltaX = clientX - resizeStartRef.current.startX;

        if (resizeType === "backlog") {
          const newWidth = Math.max(300, Math.min(800, resizeStartRef.current.startWidth + deltaX));
          setBacklogWidth(newWidth);
        }
      });
    };

    const handleEnd = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      setIsResizing(false);
      setResizeType(null);
      resizeStartRef.current = null;
      rafRef.current = null;
    };

    // Add both mouse and touch event listeners
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, resizeType, setBacklogWidth]);

  return {
    isResizing,
    resizeType,
    backlogWidth: initialBacklogWidth,
    handleBacklogResizeStart,
  };
}
