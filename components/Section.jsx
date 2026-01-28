"use client";

import { Box, Button } from "@mui/material";
import { Droppable } from "@hello-pangea/dnd";
import { Add } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { SectionCard } from "./SectionCard";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFiltersContext } from "@/contexts/TaskFiltersContext";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

// Main Section component that renders all sections
export const Section = ({ hoveredDroppable, createDroppableId, createDraggableId, sectionFilter }) => {
  // Get Redux state directly
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Try to use TaskFiltersContext first (performance optimization)
  const taskFiltersContext = useTaskFiltersContext();

  // Always call hooks (React rules), but use context values if available
  const preferences = usePreferencesContext();
  const taskOpsHook = useTaskOperations();

  // Initialize section expansion early for completion handlers (if context not available)
  const sectionExpansionInitialHook = useSectionExpansion({
    sections: taskOpsHook.sections,
    showCompletedTasks: preferences.preferences.showCompletedTasks,
    tasksBySection: {},
    viewDate,
    todaysTasks: [],
  });

  const completionHandlersHook = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitialHook.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitialHook.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitialHook.checkAndAutoCollapseSection,
  });

  const taskFiltersHook = useTaskFilters({
    recentlyCompletedTasks: completionHandlersHook.recentlyCompletedTasks,
  });

  const sectionExpansionHook = useSectionExpansion({
    sections: taskOpsHook.sections,
    showCompletedTasks: preferences.preferences.showCompletedTasks,
    tasksBySection: taskFiltersHook.tasksBySection,
    viewDate,
    todaysTasks: taskFiltersHook.todaysTasks,
  });

  // Use context values if available, otherwise use hooks (backward compatibility)
  const finalTaskFilters = taskFiltersContext.taskFilters || taskFiltersHook;
  const finalSectionExpansion = taskFiltersContext.sectionExpansion || sectionExpansionHook;
  const finalTaskOps = taskFiltersContext.taskOps || taskOpsHook;
  const finalCompletionHandlers = taskFiltersContext.completionHandlers || completionHandlersHook;
  const contextViewDate = taskFiltersContext.viewDate || viewDate;
  const finalShowCompletedTasks =
    taskFiltersContext.showCompletedTasks !== null
      ? taskFiltersContext.showCompletedTasks
      : preferences.preferences.showCompletedTasks;

  // Get completion helpers for passing to TaskItem - use today view for optimized date range
  const { getOutcomeOnDate } = useCompletionHelpers("today", contextViewDate || viewDate);

  // Update section ops with section expansion callbacks
  const sectionOps = useSectionOperations({
    autoCollapsedSections: finalSectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: finalSectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: finalSectionExpansion.setManuallyExpandedSections,
    manuallyCollapsedSections: finalSectionExpansion.manuallyCollapsedSections,
    setManuallyCollapsedSections: finalSectionExpansion.setManuallyCollapsedSections,
  });

  return (
    <Droppable droppableId="sections-list" type="SECTION">
      {provided => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            bgcolor: "transparent",
            borderRadius: 1,
            width: "100%",
            maxWidth: "100%",
            minHeight: 100,
          }}
        >
          {finalSectionExpansion.computedSections
            .filter(section => (sectionFilter ? sectionFilter(section) : true))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                hoveredDroppable={hoveredDroppable}
                droppableId={createDroppableId.todaySection(section.id)}
                createDraggableId={createDraggableId}
                viewDate={contextViewDate || viewDate}
                // Performance optimization: Pass computed values and handlers
                tasks={finalTaskFilters.tasksBySection[section.id] || []}
                isExpanded={section.expanded !== false}
                taskOps={finalTaskOps}
                completionHandlers={finalCompletionHandlers}
                sectionOps={sectionOps}
                getOutcomeOnDate={getOutcomeOnDate}
              />
            ))}
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
