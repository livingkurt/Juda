"use client";

import { Group, Box, Text, Menu } from "@mantine/core";
import { Edit2, Check, X, Circle, Copy, Trash2, Dumbbell, Clock, Unlink } from "lucide-react";
import { TagMenuSelector } from "./TagMenuSelector";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";

export const TaskContextMenu = ({
  task,
  date,
  isRecurring,
  isWorkoutTask,
  outcome,
  isSubtask,
  onClose,
  onRemoveFromParent,
}) => {
  const { mode } = useSemanticColors();

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });
  const [updateTaskMutation] = useUpdateTaskMutation();

  const handleRemoveFromParent = async () => {
    // If a custom handler is provided (e.g., from dialog), use it
    if (onRemoveFromParent) {
      onRemoveFromParent();
      onClose?.();
      return;
    }

    // Otherwise, update via API
    try {
      await updateTaskMutation({ id: task.id, parentId: null }).unwrap();
      console.warn("Subtask promoted: Task is now a regular task");
      onClose?.();
    } catch (error) {
      console.error("Failed to remove from parent:", error);
    }
  };

  return (
    <>
      {/* Edit - always show */}
      <Menu.Item
        onClick={e => {
          e.stopPropagation();
          taskOps.handleEditTask(task);
          onClose?.();
        }}
      >
        <Group gap={8}>
          <Box
            component="span"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px",
              flexShrink: 0,
            }}
          >
            <Edit2 size={14} />
          </Box>
          <Text>Edit</Text>
        </Group>
      </Menu.Item>

      {/* Remove from Parent - only show for subtasks */}
      {isSubtask && (
        <>
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              handleRemoveFromParent();
            }}
            c={mode.text.primary}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  flexShrink: 0,
                }}
              >
                <Unlink size={14} />
              </Box>
              <Text>Remove from Parent</Text>
            </Group>
          </Menu.Item>
          <Menu.Divider />
        </>
      )}

      {/* Edit Workout option for workout-type tasks */}
      {isWorkoutTask && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            taskOps.handleEditWorkout(task);
            onClose?.();
          }}
        >
          <Group gap={8}>
            <Box
              component="span"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "14px",
                height: "14px",
                flexShrink: 0,
              }}
            >
              <Dumbbell size={14} />
            </Box>
            <Text>Edit Workout</Text>
          </Group>
        </Menu.Item>
      )}

      {/* Completion options for recurring tasks */}
      {isRecurring && date && (
        <>
          {outcome !== null && (
            <>
              <Menu.Item
                onClick={e => {
                  e.stopPropagation();
                  completionHandlers.handleOutcomeChange(task.id, date, null);
                  onClose?.();
                }}
              >
                <Group gap={8}>
                  <Box
                    component="span"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "14px",
                      height: "14px",
                      flexShrink: 0,
                    }}
                  >
                    <Circle size={14} />
                  </Box>
                  <Text>Uncheck</Text>
                </Group>
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          {outcome !== "completed" && (
            <Menu.Item
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleOutcomeChange(task.id, date, "completed");
                onClose?.();
              }}
            >
              <Group gap={8}>
                <Box
                  component="span"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "14px",
                    height: "14px",
                    flexShrink: 0,
                  }}
                >
                  <Check size={14} />
                </Box>
                <Text>Complete</Text>
              </Group>
            </Menu.Item>
          )}
          {outcome !== "not_completed" && (
            <Menu.Item
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleOutcomeChange(task.id, date, "not_completed");
                onClose?.();
              }}
            >
              <Group gap={8}>
                <Box
                  component="span"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "14px",
                    height: "14px",
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </Box>
                <Text>Not Completed</Text>
              </Group>
            </Menu.Item>
          )}
          <Menu.Divider />
        </>
      )}
      {/* Status options for non-recurring tasks */}
      {!isRecurring && (
        <>
          <Menu.Divider />
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              statusHandlers.handleStatusChange(task.id, "todo");
              onClose?.();
            }}
            disabled={task.status === "todo"}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  flexShrink: 0,
                }}
              >
                <Circle size={14} />
              </Box>
              <Text>Set to Todo</Text>
            </Group>
          </Menu.Item>
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              statusHandlers.handleStatusChange(task.id, "in_progress");
              onClose?.();
            }}
            disabled={task.status === "in_progress"}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  flexShrink: 0,
                }}
              >
                <Clock size={14} />
              </Box>
              <Text>Set to In Progress</Text>
            </Group>
          </Menu.Item>
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              statusHandlers.handleStatusChange(task.id, "complete");
              onClose?.();
            }}
            disabled={task.status === "complete"}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  flexShrink: 0,
                }}
              >
                <Check size={14} />
              </Box>
              <Text>Set to Complete</Text>
            </Group>
          </Menu.Item>
          <Menu.Divider />
        </>
      )}
      <Menu.Item
        onClick={e => {
          e.stopPropagation();
          taskOps.handleDuplicateTask(task.id);
          onClose?.();
        }}
      >
        <Group gap={8}>
          <Box
            component="span"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px",
              flexShrink: 0,
            }}
          >
            <Copy size={14} />
          </Box>
          <Text>Duplicate</Text>
        </Group>
      </Menu.Item>

      {/* Tags submenu */}
      <TagMenuSelector task={task} />

      <Menu.Item
        onClick={e => {
          e.stopPropagation();
          taskOps.handleDeleteTask(task.id);
          onClose?.();
        }}
        c={mode.status.error}
      >
        <Group gap={8}>
          <Box
            component="span"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px",
              flexShrink: 0,
            }}
          >
            <Trash2 size={14} />
          </Box>
          <Text>Delete</Text>
        </Group>
      </Menu.Item>
    </>
  );
};
