import { useRef, useEffect, useCallback } from "react";

export function useAutoScroll({ todayViewDate, computedSections, tasksBySection, isMobile }) {
  // Ref for Today view scrollable container (for auto-scroll to next incomplete task)
  const todayScrollContainerRef = useRef(null);
  // Track if we've already auto-scrolled on initial load (to prevent scrolling on every change)
  const hasAutoScrolledRef = useRef(false);

  // Auto-scroll to next incomplete task in Today view on initial load only
  useEffect(() => {
    // Only scroll once on initial load
    if (hasAutoScrolledRef.current) return;
    if (!todayViewDate) return;
    // On desktop, we need the container ref. On mobile, we scroll the window.
    if (!isMobile && !todayScrollContainerRef.current) return;
    // Wait for tasks to be loaded
    if (computedSections.length === 0 || tasksBySection.size === 0) return;

    const scrollToNextIncompleteTask = () => {
      // Find the first incomplete task across all sections
      let firstIncompleteTaskElement = null;

      // Iterate through sections in order
      for (const section of computedSections) {
        const sectionTasks = tasksBySection.get(section.id) || [];

        // Find first incomplete task in this section
        for (const task of sectionTasks) {
          // Task is incomplete if:
          // 1. Not completed (checked)
          // 2. No outcome set (not completed/skipped)
          // 3. If has subtasks, not all subtasks are completed
          const isTaskCompleted =
            task.completed || (task.subtasks && task.subtasks.length > 0 && task.subtasks.every(st => st.completed));
          const hasOutcome = task.outcome !== null && task.outcome !== undefined;

          // Skip if task is completed or has an outcome
          if (!isTaskCompleted && !hasOutcome) {
            // Try to find the DOM element for this task
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
              firstIncompleteTaskElement = taskElement;
              break;
            }
          }
        }

        if (firstIncompleteTaskElement) break;
      }

      // If we found an incomplete task, scroll to it
      if (firstIncompleteTaskElement) {
        const taskRect = firstIncompleteTaskElement.getBoundingClientRect();

        if (isMobile) {
          // On mobile, scroll the window to bring the task to the top
          const scrollPosition = window.scrollY + taskRect.top - 8; // 8px offset from top

          window.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        } else {
          // On desktop, scroll the container
          const container = todayScrollContainerRef.current;
          if (!container) return;

          const containerRect = container.getBoundingClientRect();
          const scrollPosition = container.scrollTop + taskRect.top - containerRect.top - 8;

          container.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        }

        // Mark that we've scrolled
        hasAutoScrolledRef.current = true;
      }
    };

    // Small delay to ensure DOM is rendered and has correct dimensions
    const timeoutId = setTimeout(scrollToNextIncompleteTask, 500);
    return () => clearTimeout(timeoutId);
  }, [todayViewDate, computedSections, tasksBySection, isMobile]);

  // Return a callback ref to avoid ESLint ref access warning
  const setTodayScrollContainerRef = useCallback(node => {
    todayScrollContainerRef.current = node;
  }, []);

  return {
    todayScrollContainerRef,
    setTodayScrollContainerRef,
  };
}
