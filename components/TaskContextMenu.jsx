"use client";

import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import {
  Edit,
  Check,
  Close,
  RadioButtonUnchecked,
  ContentCopy,
  Delete,
  FitnessCenter,
  AccessTime,
  LinkOff,
} from "@mui/icons-material";
import { TagMenuSelector } from "./TagMenuSelector";
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
  anchorEl,
  open,
}) => {
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

  if (!open || !anchorEl) return null;

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Edit - always show */}
      <MenuItem
        onClick={e => {
          e.stopPropagation();
          taskOps.handleEditTask(task);
          onClose?.();
        }}
      >
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit</ListItemText>
      </MenuItem>

      {/* Remove from Parent - only show for subtasks */}
      {isSubtask && [
        <MenuItem
          key="remove-from-parent"
          onClick={e => {
            e.stopPropagation();
            handleRemoveFromParent();
          }}
        >
          <ListItemIcon>
            <LinkOff fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove from Parent</ListItemText>
        </MenuItem>,
        <Divider key="divider-remove-parent" />,
      ]}

      {/* Edit Workout option for workout-type tasks */}
      {isWorkoutTask && (
        <MenuItem
          onClick={e => {
            e.stopPropagation();
            taskOps.handleEditWorkout(task);
            onClose?.();
          }}
        >
          <ListItemIcon>
            <FitnessCenter fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Workout</ListItemText>
        </MenuItem>
      )}

      {/* Completion options for recurring tasks */}
      {isRecurring &&
        date &&
        [
          outcome !== null && (
            <MenuItem
              key="uncheck-recurring"
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleOutcomeChange(task.id, date, null);
                onClose?.();
              }}
            >
              <ListItemIcon>
                <RadioButtonUnchecked fontSize="small" />
              </ListItemIcon>
              <ListItemText>Uncheck</ListItemText>
            </MenuItem>
          ),
          outcome !== null && <Divider key="divider-uncheck-recurring" />,
          outcome !== "completed" && (
            <MenuItem
              key="complete-recurring"
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleOutcomeChange(task.id, date, "completed");
                onClose?.();
              }}
            >
              <ListItemIcon>
                <Check fontSize="small" />
              </ListItemIcon>
              <ListItemText>Complete</ListItemText>
            </MenuItem>
          ),
          outcome !== "not_completed" && (
            <MenuItem
              key="not-completed-recurring"
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleOutcomeChange(task.id, date, "not_completed");
                onClose?.();
              }}
            >
              <ListItemIcon>
                <Close fontSize="small" />
              </ListItemIcon>
              <ListItemText>Not Completed</ListItemText>
            </MenuItem>
          ),
          <Divider key="divider-recurring-end" />,
        ].filter(Boolean)}

      {/* Status options for non-recurring tasks */}
      {!isRecurring && [
        <Divider key="divider-status-start" />,
        <MenuItem
          key="status-todo"
          onClick={e => {
            e.stopPropagation();
            statusHandlers.handleStatusChange(task.id, "todo");
            onClose?.();
          }}
          disabled={task.status === "todo"}
        >
          <ListItemIcon>
            <RadioButtonUnchecked fontSize="small" />
          </ListItemIcon>
          <ListItemText>Set to Todo</ListItemText>
        </MenuItem>,
        <MenuItem
          key="status-in-progress"
          onClick={e => {
            e.stopPropagation();
            statusHandlers.handleStatusChange(task.id, "in_progress");
            onClose?.();
          }}
          disabled={task.status === "in_progress"}
        >
          <ListItemIcon>
            <AccessTime fontSize="small" />
          </ListItemIcon>
          <ListItemText>Set to In Progress</ListItemText>
        </MenuItem>,
        <MenuItem
          key="status-complete"
          onClick={e => {
            e.stopPropagation();
            statusHandlers.handleStatusChange(task.id, "complete");
            onClose?.();
          }}
          disabled={task.status === "complete"}
        >
          <ListItemIcon>
            <Check fontSize="small" />
          </ListItemIcon>
          <ListItemText>Set to Complete</ListItemText>
        </MenuItem>,
        <Divider key="divider-status-end" />,
      ]}

      <MenuItem
        onClick={e => {
          e.stopPropagation();
          taskOps.handleDuplicateTask(task.id);
          onClose?.();
        }}
      >
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText>Duplicate</ListItemText>
      </MenuItem>

      {/* Tags submenu */}
      <TagMenuSelector task={task} />

      <MenuItem
        onClick={e => {
          e.stopPropagation();
          taskOps.handleDeleteTask(task.id);
          onClose?.();
        }}
        sx={{ color: "error.main" }}
      >
        <ListItemIcon sx={{ color: "inherit" }}>
          <Delete fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default TaskContextMenu;
