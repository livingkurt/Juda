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
  SkipNext,
  MenuBook,
} from "@mui/icons-material";
import { TagMenuSelector } from "./TagMenuSelector";
import { PriorityMenuSelector } from "./PriorityMenuSelector";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useDispatch } from "react-redux";
import { setMainTabIndex, setJournalView, setSelectedDate } from "@/lib/store/slices/uiSlice";

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
  const selectionState = useSelectionState();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const dispatch = useDispatch();

  // Check if multiple tasks are selected
  const hasMultipleSelected = selectionState.selectedCount > 1;

  // Check if task is text_input or reflection type
  const isTextInputTask = task.completionType === "text";
  const isReflectionTask = task.completionType === "reflection";
  const showGoToJournal = isTextInputTask || isReflectionTask;

  const handleGoToJournal = () => {
    // Navigate to Journal tab (index 2)
    dispatch(setMainTabIndex(2));

    // If a date is provided, navigate to that date in the journal
    if (date) {
      const dateObj = new Date(date);
      dispatch(setSelectedDate(dateObj.toISOString()));

      // Determine which journal view to use based on task recurrence
      if (task.recurrence?.type === "yearly") {
        dispatch(setJournalView("year"));
      } else if (task.recurrence?.type === "monthly") {
        dispatch(setJournalView("month"));
      } else if (task.recurrence?.type === "weekly") {
        dispatch(setJournalView("week"));
      } else {
        dispatch(setJournalView("day"));
      }
    }

    onClose?.();
  };

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
      {/* Edit or Bulk Edit - show Bulk Edit when multiple tasks selected */}
      {hasMultipleSelected ? (
        <MenuItem
          onClick={e => {
            e.stopPropagation();
            selectionState.handleBulkEdit();
            onClose?.();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bulk Edit ({selectionState.selectedCount} selected)</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem
          onClick={e => {
            e.stopPropagation();
            // Pass date for recurring tasks so the dialog shows the correct occurrence
            taskOps.handleEditTask(task, date ? new Date(date) : null);
            onClose?.();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}

      {/* Go to Journal - show for text_input and reflection tasks */}
      {showGoToJournal && [
        <MenuItem
          key="go-to-journal"
          onClick={e => {
            e.stopPropagation();
            handleGoToJournal();
          }}
        >
          <ListItemIcon>
            <MenuBook fontSize="small" />
          </ListItemIcon>
          <ListItemText>Go to Journal</ListItemText>
        </MenuItem>,
        <Divider key="divider-journal" />,
      ]}

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

      {/* Priority submenu */}
      <PriorityMenuSelector task={task} onClose={onClose} />

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
