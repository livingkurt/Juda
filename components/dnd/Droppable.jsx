"use client";

import { useDroppable } from "@dnd-kit/core";

export const Droppable = ({ id, type, disabled = false, children }) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { type, containerId: id },
    disabled,
  });

  const provided = {
    innerRef: setNodeRef,
    droppableProps: {},
    placeholder: null,
  };

  const snapshot = {
    isDraggingOver: isOver,
    draggingOverWith: active?.id || null,
    draggingFromThisWith: null,
    isUsingPlaceholder: false,
  };

  return children(provided, snapshot);
};
