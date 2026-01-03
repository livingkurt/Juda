"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Handles resizable panel logic
 */
export function useResizeHandlers({
  backlogWidth: initialBacklogWidth,
  todayViewWidth: initialTodayViewWidth,
  setBacklogWidth,
  setTodayViewWidth,
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);
  const [localBacklogWidth, setLocalBacklogWidth] = useState(initialBacklogWidth);
  const [localTodayViewWidth, setLocalTodayViewWidth] = useState(initialTodayViewWidth);

  const resizeStartRef = useRef(null);
  const rafRef = useRef(null);

  // Sync local widths with preference widths
  useEffect(() => {
    setLocalBacklogWidth(initialBacklogWidth);
  }, [initialBacklogWidth]);

  useEffect(() => {
    setLocalTodayViewWidth(initialTodayViewWidth);
  }, [initialTodayViewWidth]);

  // Start backlog resize
  const handleBacklogResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("backlog");
      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: localBacklogWidth,
      };
    },
    [localBacklogWidth]
  );

  // Start today panel resize
  const handleTodayResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("today");
      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: localTodayViewWidth,
      };
    },
    [localTodayViewWidth]
  );

  // Handle mouse move during resize
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
          setLocalBacklogWidth(newWidth);
        } else if (resizeType === "today") {
          const newWidth = Math.max(300, Math.min(1200, resizeStartRef.current.startWidth + deltaX));
          setLocalTodayViewWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Save to preferences using refs to avoid dependency
      const currentResizeType = resizeType;
      const currentBacklogWidth = localBacklogWidth;
      const currentTodayWidth = localTodayViewWidth;

      if (currentResizeType === "backlog") {
        setBacklogWidth(currentBacklogWidth);
      } else if (currentResizeType === "today") {
        setTodayViewWidth(currentTodayWidth);
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
    // Remove width dependencies to prevent re-renders during resize
    // localBacklogWidth and localTodayViewWidth are intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing, resizeType, setBacklogWidth, setTodayViewWidth]);

  return {
    isResizing,
    localBacklogWidth,
    localTodayViewWidth,
    handleBacklogResizeStart,
    handleTodayResizeStart,
  };
}
