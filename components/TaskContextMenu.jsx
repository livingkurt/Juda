"use client";

import { useState } from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { Edit, ContentCopy, Delete, FitnessCenter, LinkOff, EditCalendar } from "@mui/icons-material";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { CompletionEditDialog } from "./CompletionEditDialog";

export const TaskContextMenuBase = ({
  task,
  date,
  isWorkoutTask,
  isSubtask,
  onClose,
  onRemoveFromParent,
  anchorEl,
  open,
  onEdit,
  onEditWorkout,
  onDuplicate,
  onDelete,
  onBulkEdit,
  hasMultipleSelected = false,
  selectedCount = 0,
  canEditCompletion = false,
}) => {
  // State for completion edit dialog
  const [completionEditOpen, setCompletionEditOpen] = useState(false);

  if (!open || !anchorEl) return null;

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Edit or Bulk Edit - show Bulk Edit when multiple tasks selected */}
        {hasMultipleSelected ? (
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              onBulkEdit?.();
              onClose?.();
            }}
          >
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Bulk Edit ({selectedCount} selected)</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              // Only pass date if task has a date (recurring or one-time with date)
              // Backlog tasks (no date) should not have a date passed
              const taskHasDate = task?.recurrence?.startDate;
              const clickedDate = taskHasDate && date ? new Date(date) : null;
              onEdit?.(task, clickedDate);
              onClose?.();
            }}
          >
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {/* Remove from Parent - only show for subtasks */}
        {isSubtask && [
          <MenuItem
            key="remove-from-parent"
            onClick={e => {
              e.stopPropagation();
              onRemoveFromParent?.();
              onClose?.();
            }}
          >
            <ListItemIcon>
              <LinkOff fontSize="small" />
            </ListItemIcon>
            <ListItemText>Remove from Parent</ListItemText>
          </MenuItem>,
          <Divider key="divider-remove-parent" />,
        ]}

        {/* Edit Completion option for non-recurring completed tasks */}
        {canEditCompletion && (
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              setCompletionEditOpen(true);
              onClose?.();
            }}
          >
            <ListItemIcon>
              <EditCalendar fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Completion</ListItemText>
          </MenuItem>
        )}

        {/* Edit Workout option for workout-type tasks */}
        {isWorkoutTask && (
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              onEditWorkout?.(task);
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
        {/* {isRecurring &&
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
          outcome !== "rolled_over" && (
            <MenuItem
              key="rollover-recurring"
              onClick={e => {
                e.stopPropagation();
                completionHandlers.handleRolloverTask(task.id, date);
                onClose?.();
              }}
            >
              <ListItemIcon>
                <SkipNext fontSize="small" />
              </ListItemIcon>
              <ListItemText>Roll Over to Tomorrow</ListItemText>
            </MenuItem>
          ),
          <Divider key="divider-recurring-end" />,
        ].filter(Boolean)} */}

        {/* Status options for non-recurring tasks */}
        {/* {!isRecurring && [
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
      ]} */}

        <MenuItem
          onClick={e => {
            e.stopPropagation();
            onDuplicate?.(task.id);
            onClose?.();
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>

        {/* Tags submenu */}
        {/* <TagSelector task={task} autoSave asMenuItem /> */}

        {/* Priority submenu */}
        {/* <PriorityMenuSelector task={task} onClose={onClose} /> */}

        <MenuItem
          onClick={e => {
            e.stopPropagation();
            onDelete?.(task.id);
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

      {/* Completion Edit Dialog */}
      <CompletionEditDialog task={task} open={completionEditOpen} onClose={() => setCompletionEditOpen(false)} />
    </>
  );
};

export const TaskContextMenu = ({
  task,
  date,
  isWorkoutTask,
  isSubtask,
  onClose,
  onRemoveFromParent,
  anchorEl,
  open,
}) => {
  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const selectionState = useSelectionState();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const { getCompletionForDate } = useCompletionHelpers();

  // Check if multiple tasks are selected
  const hasMultipleSelected = selectionState.selectedCount > 1;

  // Check if task is non-recurring and has been completed
  const isNonRecurring = !task?.recurrence || task?.recurrence?.type === "none";
  const hasCompletion =
    task?.recurrence?.startDate && getCompletionForDate(task?.id, new Date(task.recurrence.startDate));
  const canEditCompletion = isNonRecurring && hasCompletion && !isSubtask;

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
    <TaskContextMenuBase
      task={task}
      date={date}
      isWorkoutTask={isWorkoutTask}
      isSubtask={isSubtask}
      onClose={onClose}
      onRemoveFromParent={handleRemoveFromParent}
      anchorEl={anchorEl}
      open={open}
      onEdit={taskOps.handleEditTask}
      onEditWorkout={taskOps.handleEditWorkout}
      onDuplicate={taskOps.handleDuplicateTask}
      onDelete={taskOps.handleDeleteTask}
      onBulkEdit={selectionState.handleBulkEdit}
      hasMultipleSelected={hasMultipleSelected}
      selectedCount={selectionState.selectedCount}
      canEditCompletion={canEditCompletion}
    />
  );
};

export default TaskContextMenu;
