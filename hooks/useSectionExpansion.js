import { useMemo, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addAutoCollapsedSection,
  setAutoCollapsedSections as setAutoCollapsedSectionsAction,
  setManuallyExpandedSections as setManuallyExpandedSectionsAction,
} from "@/lib/store/slices/sectionExpansionSlice";

export function useSectionExpansion({ sections, showCompletedTasks, tasksBySection }) {
  const dispatch = useDispatch();

  // Get from Redux instead of useState
  const autoCollapsedSectionsArray = useSelector(state => state.sectionExpansion.autoCollapsedSections);
  const manuallyExpandedSectionsArray = useSelector(state => state.sectionExpansion.manuallyExpandedSections);

  // Convert arrays to Sets for efficient lookups (maintaining backward compatibility)
  const autoCollapsedSections = useMemo(() => new Set(autoCollapsedSectionsArray), [autoCollapsedSectionsArray]);
  const manuallyExpandedSections = useMemo(
    () => new Set(manuallyExpandedSectionsArray),
    [manuallyExpandedSectionsArray]
  );

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

  // Sort sections by order
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  // Create computed sections with combined expanded state (manual + auto-collapse)
  const computedSections = useMemo(() => {
    return sortedSections.map(section => {
      const isManuallyCollapsed = section.expanded === false;
      const isAutoCollapsed = autoCollapsedSections.has(section.id);
      // Section is collapsed if either manually collapsed OR auto-collapsed
      const isCollapsed = isManuallyCollapsed || isAutoCollapsed;
      return {
        ...section,
        expanded: !isCollapsed, // expanded is true when NOT collapsed
      };
    });
  }, [sortedSections, autoCollapsedSections]);

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

  return {
    autoCollapsedSections,
    setAutoCollapsedSections,
    manuallyExpandedSections,
    setManuallyExpandedSections,
    checkAndAutoCollapseSection,
    computedSections,
  };
}
