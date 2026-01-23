"use client";

import { useState } from "react";
import {
  DndContext as DndKitContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { dropAnimation } from "@/lib/dndkit-config";

export const DndProvider = ({ children, onDragEnd, onDragStart, onDragOver, renderOverlay }) => {
  const [activeId, setActiveId] = useState(null);
  const [activeData, setActiveData] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = event => {
    setActiveId(event.active.id);
    setActiveData(event.active.data.current || null);
    onDragStart?.(event);
  };

  const handleDragOver = event => {
    onDragOver?.(event);
  };

  const handleDragEnd = event => {
    const { active, over } = event;

    const sourceContainerId =
      active.data.current?.containerId ||
      active.data.current?.sortable?.containerId ||
      active.data.current?.droppableId ||
      null;
    const sourceIndex = active.data.current?.sortable?.index ?? active.data.current?.index ?? 0;

    const destination = over
      ? {
          droppableId:
            over.data.current?.containerId ||
            over.data.current?.sortable?.containerId ||
            over.data.current?.droppableId ||
            over.id,
          index: over.data.current?.sortable?.index ?? over.data.current?.index ?? 0,
        }
      : null;

    const result = {
      draggableId: active.id,
      type: active.data.current?.type || "TASK",
      source: {
        droppableId: sourceContainerId,
        index: sourceIndex,
      },
      destination,
    };

    setActiveId(null);
    setActiveData(null);
    onDragEnd?.(result);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveData(null);
  };

  return (
    <DndKitContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeId && renderOverlay ? renderOverlay(activeId, activeData) : null}
      </DragOverlay>
    </DndKitContext>
  );
};
