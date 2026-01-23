"use client";

import { Box, Button } from "@mui/material";
import { Droppable } from "@/components/dnd/Droppable";
import { SortableContext } from "@/components/dnd/SortableContext";
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

  const sortableSectionIds = sectionExpansion.computedSections
    .filter(section => !section.isVirtual)
    .map(section => `section-${section.id}`);

  return (
    <Droppable id="sections-list" type="SECTION">
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            bgcolor: snapshot.isDraggingOver ? "action.hover" : "transparent",
            borderRadius: 1,
            width: "100%",
            maxWidth: "100%",
            minHeight: 100,
          }}
        >
          <SortableContext items={sortableSectionIds}>
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
            {provided.placeholder}
          </SortableContext>
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
