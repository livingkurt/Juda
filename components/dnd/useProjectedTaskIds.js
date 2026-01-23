"use client";

import { useMemo } from "react";
import { useDndContext } from "@dnd-kit/core";

export function useDragMeta() {
  const { active, over } = useDndContext();
  const activeId = active?.id ?? null;
  const activeContainerId = active?.data?.current?.containerId ?? active?.data?.current?.sortable?.containerId ?? null;
  const overContainerId = over?.data?.current?.containerId ?? null;
  const overIndex = over?.data?.current?.sortable?.index ?? null;

  return { activeId, activeContainerId, overContainerId, overIndex };
}

export function useProjectedTaskIds(sortableTaskIds, containerId) {
  const { activeId, activeContainerId, overContainerId, overIndex } = useDragMeta();

  return useMemo(() => {
    if (!activeId || !overContainerId) return sortableTaskIds;

    // Same-container drag: let SortableContext handle reordering.
    if (activeContainerId === containerId && overContainerId === containerId) {
      return sortableTaskIds;
    }

    // Dragging out of this container.
    if (activeContainerId === containerId && overContainerId !== containerId) {
      return sortableTaskIds.filter(taskId => taskId !== activeId);
    }

    // Dragging into this container.
    if (activeContainerId !== containerId && overContainerId === containerId) {
      const without = sortableTaskIds.filter(taskId => taskId !== activeId);
      const insertAt = typeof overIndex === "number" ? Math.min(overIndex, without.length) : without.length;
      return [...without.slice(0, insertAt), activeId, ...without.slice(insertAt)];
    }

    return sortableTaskIds;
  }, [activeContainerId, activeId, containerId, overContainerId, overIndex, sortableTaskIds]);
}
