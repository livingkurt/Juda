"use client";

import { useSortable } from "@dnd-kit/sortable";
import { getSortableStyles } from "@/lib/dndkit-config";

export const SortablePlaceholder = ({ id, height = 60 }) => {
  const { setNodeRef, transform, transition } = useSortable({
    id,
    disabled: true,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...getSortableStyles(transform, transition, false),
        height,
        borderRadius: 8,
        opacity: 0,
      }}
    />
  );
};
