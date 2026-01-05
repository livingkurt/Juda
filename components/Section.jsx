"use client";

import { Box, Button, Group } from "@mantine/core";
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
      <Box
        ref={setNodeRef}
        style={{
          background: isOver ? dropHighlight : "transparent",
          borderRadius: "0.375rem",
          width: "100%",
          maxWidth: "100%",
        }}
      >
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
          w="100%"
          style={{
            paddingTop: 16,
            paddingBottom: 24,
            borderStyle: "dashed",
            marginTop: 16,
            fontSize: "0.875rem",
          }}
          visibleFrom="md"
          styles={{
            root: {
              paddingTop: 16,
              paddingBottom: 16,
              fontSize: "0.875rem",
            },
          }}
        >
          <Group gap={[4, 8]}>
            <Plus size={16} stroke="currentColor" />
            Add Section
          </Group>
        </Button>
        <Button
          variant="outline"
          onClick={sectionOps.handleAddSection}
          w="100%"
          style={{
            paddingTop: 16,
            paddingBottom: 16,
            borderStyle: "dashed",
            marginTop: 8,
            fontSize: "0.875rem",
          }}
          hiddenFrom="md"
        >
          <Group gap={4}>
            <Plus size={16} stroke="currentColor" />
            Add Section
          </Group>
        </Button>
      </Box>
    </SortableContext>
  );
};
