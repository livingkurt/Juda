import { useMemo, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addAutoCollapsedSection,
  setAutoCollapsedSections as setAutoCollapsedSectionsAction,
  setManuallyExpandedSections as setManuallyExpandedSectionsAction,
  setManuallyCollapsedSections as setManuallyCollapsedSectionsAction,
} from "@/lib/store/slices/sectionExpansionSlice";

export function useSectionExpansion({ sections, showCompletedTasks, tasksBySection, viewDate, todaysTasks }) {
  const dispatch = useDispatch();

  // Get from Redux instead of useState
  const autoCollapsedSectionsArray = useSelector(state => state.sectionExpansion.autoCollapsedSections);
  const manuallyExpandedSectionsArray = useSelector(state => state.sectionExpansion.manuallyExpandedSections);
  const manuallyCollapsedSectionsArray = useSelector(state => state.sectionExpansion.manuallyCollapsedSections);

  // Convert arrays to Sets for efficient lookups (maintaining backward compatibility)
  const autoCollapsedSections = useMemo(() => new Set(autoCollapsedSectionsArray), [autoCollapsedSectionsArray]);
  const manuallyExpandedSections = useMemo(
    () => new Set(manuallyExpandedSectionsArray),
    [manuallyExpandedSectionsArray]
  );
  const manuallyCollapsedSections = useMemo(
    () => new Set(manuallyCollapsedSectionsArray),
    [manuallyCollapsedSectionsArray]
  );

  // Track if initial calculation has been done for the current view date
  const initialCalculationDoneRef = useRef(false);
  const lastViewDateRef = useRef(null);

  // Helper function to check if a section should be auto-collapsed after task completion/not completed
  // Using useRef to store the latest check function to avoid stale closures in setTimeout
  const checkAndAutoCollapseSectionRef = useRef(null);

  const checkAndAutoCollapseSection = useCallback(sectionId => {
    if (checkAndAutoCollapseSectionRef.current) {
      checkAndAutoCollapseSectionRef.current(sectionId);
    }
  }, []);

  // Update checkAndAutoCollapseSectionRef after tasksBySection is computed
  useEffect(() => {
    checkAndAutoCollapseSectionRef.current = sectionId => {
      // Only auto-collapse when hide completed is true
      if (showCompletedTasks) return;

      // Don't auto-collapse if user manually expanded it
      if (manuallyExpandedSections.has(sectionId)) return;

      // Get visible tasks for this section
      const visibleTasks = tasksBySection[sectionId] || [];

      // Auto-collapse if no visible tasks remain
      if (visibleTasks.length === 0) {
        dispatch(addAutoCollapsedSection(sectionId));
      }
    };
  }, [showCompletedTasks, tasksBySection, manuallyExpandedSections, dispatch]);

  // Clear state when showCompletedTasks is toggled ON
  useEffect(() => {
    if (showCompletedTasks) {
      // Clear auto-collapsed state when showing completed tasks
      if (autoCollapsedSections.size > 0) {
        dispatch(setAutoCollapsedSectionsAction([]));
      }
      // Also clear manually expanded since it's no longer relevant
      if (manuallyExpandedSections.size > 0) {
        dispatch(setManuallyExpandedSectionsAction([]));
      }
      // Keep manually collapsed sections - user preference should persist
    }
  }, [showCompletedTasks, autoCollapsedSections.size, manuallyExpandedSections.size, dispatch]);

  // Calculate initial auto-collapsed sections on load or date change
  useEffect(() => {
    // Skip if showing completed tasks (no auto-collapse needed)
    if (showCompletedTasks) {
      return;
    }

    // Skip if sections are not loaded yet
    if (!sections || sections.length === 0) return;

    // Skip if tasksBySection is not initialized (still loading)
    // We need at least one section to have been processed (even if empty)
    if (!tasksBySection || typeof tasksBySection !== "object") return;

    // Check if date changed (need to reset manual expansions and recalculate)
    const viewDateStr = viewDate?.toISOString?.() || viewDate?.toString() || "today";
    if (lastViewDateRef.current !== viewDateStr) {
      // Date changed - reset ALL manual state (both expanded and collapsed)
      // This allows sections to react to the new day's data
      lastViewDateRef.current = viewDateStr;
      initialCalculationDoneRef.current = false;
      dispatch(setManuallyExpandedSectionsAction([]));
      dispatch(setManuallyCollapsedSectionsAction([]));
    }

    // Only calculate once per view date
    if (initialCalculationDoneRef.current) return;

    // Ensure we have processed all sections (tasksBySection should have entries for all sections)
    // This ensures tasksBySection has been fully computed
    const allSectionsProcessed = sections.every(section => section.id in tasksBySection);
    if (!allSectionsProcessed) return;

    // Mark as done before dispatching to prevent race conditions
    initialCalculationDoneRef.current = true;

    // Calculate which sections should be auto-collapsed
    // A section should be auto-collapsed if:
    // 1. It has no tasks at all (empty section), OR
    // 2. ALL its tasks have completions (completed or not_completed)
    const sectionsToCollapse = [];
    sections.forEach(section => {
      // Get ALL tasks for this section (not just visible ones)
      const allSectionTasks = todaysTasks?.filter(t => t.sectionId === section.id) || [];

      if (allSectionTasks.length === 0) {
        // No tasks in section - auto-collapse empty sections
        sectionsToCollapse.push(section.id);
        return;
      }

      // Check if ALL tasks have an outcome (completed or not_completed)
      const allTasksHaveOutcome = allSectionTasks.every(task => {
        const isCompleted =
          task.completed || (task.subtasks && task.subtasks.length > 0 && task.subtasks.every(st => st.completed));
        const hasOutcome = task.outcome !== null && task.outcome !== undefined;
        return isCompleted || hasOutcome;
      });

      if (allTasksHaveOutcome) {
        sectionsToCollapse.push(section.id);
      }
    });

    // Set initial auto-collapsed state
    dispatch(setAutoCollapsedSectionsAction(sectionsToCollapse));
  }, [showCompletedTasks, tasksBySection, sections, viewDate, todaysTasks, dispatch]);

  // Sort sections by order
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  // Create computed sections with combined expanded state (Redux only, ignores database expanded field)
  const computedSections = useMemo(() => {
    const sectionsWithState = sortedSections.map(section => {
      // Check Redux state only - ignore section.expanded from database
      const isManuallyCollapsed = manuallyCollapsedSections.has(section.id);
      const isAutoCollapsed = autoCollapsedSections.has(section.id);
      const isManuallyExpanded = manuallyExpandedSections.has(section.id);

      // Section is collapsed if:
      // 1. Manually collapsed by user (highest priority), OR
      // 2. Auto-collapsed AND not manually expanded
      const isCollapsed = isManuallyCollapsed || (isAutoCollapsed && !isManuallyExpanded);

      return {
        ...section,
        expanded: !isCollapsed, // expanded is true when NOT collapsed
      };
    });

    // Add virtual "No Section" section at the beginning (order -1)
    // Only show if there are tasks without a section
    const noSectionTasks = tasksBySection["no-section"] || [];
    if (noSectionTasks.length > 0) {
      const isManuallyCollapsed = manuallyCollapsedSections.has("no-section");
      const isAutoCollapsed = autoCollapsedSections.has("no-section");
      const isManuallyExpanded = manuallyExpandedSections.has("no-section");
      const isCollapsed = isManuallyCollapsed || (isAutoCollapsed && !isManuallyExpanded);

      const noSection = {
        id: "no-section",
        name: "No Section",
        icon: "📋",
        order: -1,
        expanded: !isCollapsed,
        userId: sectionsWithState[0]?.userId, // Use first section's userId
        createdAt: new Date(),
        updatedAt: new Date(),
        isVirtual: true, // Mark as virtual so we know not to try to edit/delete it
      };

      return [noSection, ...sectionsWithState];
    }

    return sectionsWithState;
  }, [sortedSections, manuallyCollapsedSections, autoCollapsedSections, manuallyExpandedSections, tasksBySection]);

  // Wrapper functions to maintain backward compatibility with existing code
  const setAutoCollapsedSections = useCallback(
    updater => {
      if (typeof updater === "function") {
        // Handle function updater (prev => newSet)
        const newSet = updater(autoCollapsedSections);
        dispatch(setAutoCollapsedSectionsAction(Array.from(newSet)));
      } else {
        // Handle direct value (Set or Array)
        const array = updater instanceof Set ? Array.from(updater) : updater;
        dispatch(setAutoCollapsedSectionsAction(array));
      }
    },
    [dispatch, autoCollapsedSections]
  );

  const setManuallyExpandedSections = useCallback(
    updater => {
      if (typeof updater === "function") {
        // Handle function updater (prev => newSet)
        const newSet = updater(manuallyExpandedSections);
        dispatch(setManuallyExpandedSectionsAction(Array.from(newSet)));
      } else {
        // Handle direct value (Set or Array)
        const array = updater instanceof Set ? Array.from(updater) : updater;
        dispatch(setManuallyExpandedSectionsAction(array));
      }
    },
    [dispatch, manuallyExpandedSections]
  );

  const setManuallyCollapsedSections = useCallback(
    updater => {
      if (typeof updater === "function") {
        // Handle function updater (prev => newSet)
        const newSet = updater(manuallyCollapsedSections);
        dispatch(setManuallyCollapsedSectionsAction(Array.from(newSet)));
      } else {
        // Handle direct value (Set or Array)
        const array = updater instanceof Set ? Array.from(updater) : updater;
        dispatch(setManuallyCollapsedSectionsAction(array));
      }
    },
    [dispatch, manuallyCollapsedSections]
  );

  return useMemo(
    () => ({
      autoCollapsedSections,
      setAutoCollapsedSections,
      manuallyExpandedSections,
      setManuallyExpandedSections,
      manuallyCollapsedSections,
      setManuallyCollapsedSections,
      checkAndAutoCollapseSection,
      computedSections,
    }),
    [
      autoCollapsedSections,
      setAutoCollapsedSections,
      manuallyExpandedSections,
      setManuallyExpandedSections,
      manuallyCollapsedSections,
      setManuallyCollapsedSections,
      checkAndAutoCollapseSection,
      computedSections,
    ]
  );
}
