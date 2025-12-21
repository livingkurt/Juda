"use client";

import { Box } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SubtaskItem } from "./SubtaskItem";
import { createDroppableId } from "@/lib/dragHelpers";

export const SortableSubtaskItem = ({ subtask, parentTaskId, onToggle, onEdit, onDelete }) => {
  const draggableId = createDroppableId.subtask(parentTaskId, subtask.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    data: {
      type: "SUBTASK",
      parentTaskId,
      subtaskId: subtask.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <SubtaskItem
        subtask={subtask}
        parentTaskId={parentTaskId}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  );
};
