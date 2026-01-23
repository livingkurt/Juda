"use client";

import { SortableContext as DndKitSortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export const SortableContext = ({ items, strategy = verticalListSortingStrategy, children }) => {
  return (
    <DndKitSortableContext items={items} strategy={strategy}>
      {children}
    </DndKitSortableContext>
  );
};
