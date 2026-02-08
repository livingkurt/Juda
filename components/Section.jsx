"use client";

import { Box, Button } from "@mui/material";
import { Droppable } from "@hello-pangea/dnd";
import { Add } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SectionCard } from "./SectionCard";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useTaskItemShared } from "@/hooks/useTaskItemShared";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";

// Main Section component that renders all sections
export const Section = ({ hoveredDroppable, createDroppableId, createDraggableId, sectionFilter }) => {
  // Get Redux state directly
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // Use hooks directly (they use Redux internally)
  // Call hooks in the correct order (matching page.jsx pattern)
  const taskOps = useTaskOperations();

  // Initialize section expansion early (will be updated when tasksBySection is available)
  const sectionExpansionInitial = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: new Map(),
    viewDate,
    todaysTasks: [],
  });

  // Initialize completion handlers (needs sectionExpansionInitial callbacks)
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
  });

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const handleCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };

  const taskItemShared = useTaskItemShared({
    allTasks: taskFilters.tasks,
    viewDate,
    tags,
    onCreateTag: handleCreateTag,
    completionHandlers,
  });

  // Recreate section expansion with actual tasksBySection
  const sectionExpansion = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
    viewDate,
    todaysTasks: taskFilters.todaysTasks,
  });

  // Update section ops with section expansion callbacks
  const sectionOps = useSectionOperations({
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
    manuallyCollapsedSections: sectionExpansion.manuallyCollapsedSections,
    setManuallyCollapsedSections: sectionExpansion.setManuallyCollapsedSections,
  });

  // Prepare filtered and sorted sections
  const sortedSections = useMemo(
    () =>
      sectionExpansion.computedSections
        .filter(section => (sectionFilter ? sectionFilter(section) : true))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [sectionExpansion.computedSections, sectionFilter]
  );

  // Virtualization setup
  const parentRef = useRef(null);
  // TanStack Virtual returns functions that React Compiler cannot memoize safely.
  // We keep this hook local and avoid passing its return value into memoized hooks/components.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedSections.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Approximate section height (will be measured dynamically)
    overscan: 2,
    enabled: sortedSections.length > 5, // Only virtualize if more than 5 sections
  });

  return (
    <Droppable droppableId="sections-list" type="SECTION">
      {provided => (
        <Box
          ref={el => {
            provided.innerRef(el);
            parentRef.current = el;
          }}
          {...provided.droppableProps}
          sx={{
            bgcolor: "transparent",
            borderRadius: 1,
            width: "100%",
            maxWidth: "100%",
            minHeight: 100,
          }}
        >
          {sortedSections.length > 5 ? (
            <Box
              sx={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map(virtualItem => {
                const section = sortedSections[virtualItem.index];
                return (
                  <Box
                    key={section.id}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <SectionCard
                      section={section}
                      index={virtualItem.index}
                      hoveredDroppable={hoveredDroppable}
                      droppableId={createDroppableId.todaySection(section.id)}
                      createDraggableId={createDraggableId}
                      viewDate={viewDate}
                      taskItemShared={taskItemShared}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            sortedSections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                hoveredDroppable={hoveredDroppable}
                droppableId={createDroppableId.todaySection(section.id)}
                createDraggableId={createDraggableId}
                viewDate={viewDate}
                taskItemShared={taskItemShared}
              />
            ))
          )}
          {provided.placeholder}
          <Button
            variant="outlined"
            onClick={sectionOps.handleAddSection}
            fullWidth
            sx={{
              py: { xs: 2, md: 3 },
              borderStyle: "dashed",
              mt: { xs: 1, md: 2 },
              fontSize: { xs: "0.875rem", md: "1rem" },
            }}
            startIcon={<Add fontSize="small" />}
          >
            Add Section
          </Button>
        </Box>
      )}
    </Droppable>
  );
};

export default Section;
