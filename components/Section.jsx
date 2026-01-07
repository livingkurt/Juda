"use client";

import { Box, Button } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Add } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { SectionCard } from "./SectionCard";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

// Main Section component that renders all sections
export const Section = ({ hoveredDroppable, createDroppableId, createDraggableId }) => {
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
    tasksBySection: {},
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

  // Use droppable for section reordering
  const { setNodeRef, isOver } = useDroppable({
    id: "sections",
    data: { type: "SECTION" },
  });

  return (
    <SortableContext
      id="sections"
      items={sectionExpansion.computedSections.map(s => `section-${s.id}`)}
      strategy={verticalListSortingStrategy}
    >
      <Box
        ref={setNodeRef}
        sx={{
          bgcolor: isOver ? "action.hover" : "transparent",
          borderRadius: 1,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {sectionExpansion.computedSections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            hoveredDroppable={hoveredDroppable}
            droppableId={createDroppableId.todaySection(section.id)}
            createDraggableId={createDraggableId}
            viewDate={viewDate}
          />
        ))}
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
    </SortableContext>
  );
};

export default Section;
