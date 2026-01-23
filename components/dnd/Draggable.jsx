"use client";

import { useSortable } from "@dnd-kit/sortable";
import { getSortableStyles } from "@/lib/dndkit-config";

export const Draggable = ({ id, index, type = "TASK", containerId, data, disabled = false, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id,
    data: {
      type,
      index,
      containerId,
      ...data,
    },
    disabled,
  });

  const provided = {
    innerRef: setNodeRef,
    draggableProps: {
      ...attributes,
      style: getSortableStyles(transform, transition, isDragging),
    },
    dragHandleProps: listeners,
  };

  const snapshot = {
    isDragging,
    isDropAnimating: false,
    draggingOver: isOver ? containerId : null,
    dropAnimation: null,
    combineWith: null,
    combineTargetFor: null,
    mode: "FLUID",
  };

  return children(provided, snapshot);
};
