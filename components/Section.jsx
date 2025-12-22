"use client";

import { Box, Button } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { SectionCard } from "./SectionCard";

// Main Section component that renders all sections
export const Section = ({
  sections,
  tasksBySection,
  onToggleTask,
  onToggleSubtask,
  onToggleExpand,
  onEditTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  onCreateTaskInline,
  onEditSection,
  onDeleteSection,
  onAddSection,
  onToggleSectionExpand,
  hoveredDroppable,
  createDroppableId,
  createDraggableId,
  viewDate,
}) => {
  const dropHighlight = useColorModeValue("gray.50", "gray.800");

  // Use droppable for section reordering
  const { setNodeRef, isOver } = useDroppable({
    id: "sections",
    data: { type: "SECTION" },
  });

  return (
    <SortableContext id="sections" items={sections.map(s => `section-${s.id}`)} strategy={verticalListSortingStrategy}>
      <Box ref={setNodeRef} bg={isOver ? dropHighlight : "transparent"} borderRadius="md">
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            tasks={tasksBySection[section.id] || []}
            onToggleTask={onToggleTask}
            onToggleSubtask={onToggleSubtask}
            onToggleExpand={onToggleExpand}
            onEditTask={onEditTask}
            onUpdateTaskTitle={onUpdateTaskTitle}
            onDeleteTask={onDeleteTask}
            onDuplicateTask={onDuplicateTask}
            onAddTask={onAddTask}
            onCreateTaskInline={onCreateTaskInline}
            onEditSection={onEditSection}
            onDeleteSection={onDeleteSection}
            onToggleSectionExpand={onToggleSectionExpand}
            hoveredDroppable={hoveredDroppable}
            droppableId={createDroppableId.todaySection(section.id)}
            createDraggableId={createDraggableId}
            viewDate={viewDate}
          />
        ))}
        <Button variant="outline" onClick={onAddSection} w="full" py={6} borderStyle="dashed" mt={4}>
          <Box as="span" display="inline-flex" alignItems="center" mr={2}>
            <Plus size={20} stroke="currentColor" />
          </Box>
          Add Section
        </Button>
      </Box>
    </SortableContext>
  );
};
