"use client";

import { Box, Button } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { SectionCard } from "./SectionCard";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

// Main Section component that renders all sections
export const Section = ({ hoveredDroppable, createDroppableId, createDraggableId }) => {
  const { dnd } = useSemanticColors();
  const dropHighlight = dnd.dropTarget;

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
  });

  // Update section ops with section expansion callbacks
  const sectionOps = useSectionOperations({
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
  });

  // Use droppable for section reordering
  const { setNodeRef, isOver } = useDroppable({
    id: "sections",
    data: { type: "SECTION" },
  });

  return (
    <SortableContext
      id="sections"
      items={taskOps.sections.map(s => `section-${s.id}`)}
      strategy={verticalListSortingStrategy}
    >
      <Box ref={setNodeRef} bg={isOver ? dropHighlight : "transparent"} borderRadius="md" w="100%" maxW="100%">
        {taskOps.sections.map((section, index) => (
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
          variant="outline"
          onClick={sectionOps.handleAddSection}
          w="full"
          py={{ base: 4, md: 6 }}
          borderStyle="dashed"
          mt={{ base: 2, md: 4 }}
          fontSize={{ base: "sm", md: "md" }}
        >
          <Box as="span" display="inline-flex" alignItems="center" mr={{ base: 1, md: 2 }}>
            <Plus size={16} stroke="currentColor" />
          </Box>
          Add Section
        </Button>
      </Box>
    </SortableContext>
  );
};
