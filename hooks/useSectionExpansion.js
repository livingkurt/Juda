import { useState, useMemo, useRef, useCallback, useEffect } from "react";

export function useSectionExpansion({ sections, showCompletedTasks, tasksBySection }) {
  // Track sections that are auto-collapsed (not manually collapsed by user)
  const [autoCollapsedSections, setAutoCollapsedSections] = useState(new Set());
  // Track sections that were manually expanded after being auto-collapsed (to prevent re-collapsing)
  const [manuallyExpandedSections, setManuallyExpandedSections] = useState(new Set());

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
        setAutoCollapsedSections(prev => {
          const newSet = new Set(prev);
          newSet.add(sectionId);
          return newSet;
        });
      }
    };
  }, [showCompletedTasks, tasksBySection, manuallyExpandedSections]);

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

  return {
    autoCollapsedSections,
    setAutoCollapsedSections,
    manuallyExpandedSections,
    setManuallyExpandedSections,
    checkAndAutoCollapseSection,
    computedSections,
  };
}
