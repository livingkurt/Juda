"use client";

import { Box, Button, useColorModeValue } from "@chakra-ui/react";
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
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  onEditSection,
  onDeleteSection,
  onAddSection,
  hoveredDroppable,
  createDroppableId,
  createDraggableId,
}) => {
  const dropHighlight = useColorModeValue("gray.50", "gray.800");

  // Use droppable for section reordering
  const { setNodeRef, isOver } = useDroppable({
    id: "sections",
    data: { type: "SECTION" },
  });

  return (
    <SortableContext items={sections.map(s => `section-${s.id}`)} strategy={verticalListSortingStrategy}>
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
            onDeleteTask={onDeleteTask}
            onDuplicateTask={onDuplicateTask}
            onAddTask={onAddTask}
            onEditSection={onEditSection}
            onDeleteSection={onDeleteSection}
            hoveredDroppable={hoveredDroppable}
            droppableId={createDroppableId.todaySection(section.id)}
            createDraggableId={createDraggableId}
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
