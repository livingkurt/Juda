"use client";

import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";

export function usePriorityHandlers() {
  const [updateTaskMutation] = useUpdateTaskMutation();

  const handlePriorityChange = async (taskId, priority) => {
    try {
      await updateTaskMutation({ id: taskId, priority }).unwrap();
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  return { handlePriorityChange };
}
