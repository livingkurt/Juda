"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Handles resizable panel logic
 * Works directly with preference values to avoid sync issues
 */
export function useResizeHandlers({
  backlogWidth: initialBacklogWidth,
  todayViewWidth: initialTodayViewWidth,
  setBacklogWidth,
  setTodayViewWidth,
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);

  const resizeStartRef = useRef(null);
  const rafRef = useRef(null);

  // Start backlog resize
  const handleBacklogResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("backlog");
      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: initialBacklogWidth,
      };
    },
    [initialBacklogWidth]
  );

  // Start today panel resize
  const handleTodayResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("today");
      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: initialTodayViewWidth,
      };
    },
    [initialTodayViewWidth]
  );

  // Handle mouse move during resize
  // Directly updates preference values during drag for smooth resizing
  useEffect(() => {
    if (!isResizing || !resizeType) return;

    const handleMouseMove = e => {
      if (!resizeStartRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!resizeStartRef.current) return;
        const deltaX = e.clientX - resizeStartRef.current.startX;

        if (resizeType === "backlog") {
          const newWidth = Math.max(300, Math.min(800, resizeStartRef.current.startWidth + deltaX));
          setBacklogWidth(newWidth);
        } else if (resizeType === "today") {
          const newWidth = Math.max(300, Math.min(1200, resizeStartRef.current.startWidth + deltaX));
          setTodayViewWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      setIsResizing(false);
      setResizeType(null);
      resizeStartRef.current = null;
      rafRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, resizeType, setBacklogWidth, setTodayViewWidth]);

  return {
    isResizing,
    backlogWidth: initialBacklogWidth,
    todayViewWidth: initialTodayViewWidth,
    handleBacklogResizeStart,
    handleTodayResizeStart,
  };
}
