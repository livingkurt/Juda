"use client";

import { useState, useMemo, useRef, useDeferredValue, useEffect } from "react";
import {
  Box,
  Table,
  Text,
  Group,
  Popover,
  ActionIcon,
  Flex,
  Checkbox,
  TextInput,
  Menu,
  Button,
  Stack,
} from "@mantine/core";
import { Check, X, ChevronLeft, ChevronRight, Dumbbell, Edit2, Copy, Trash2 } from "lucide-react";
import { shouldShowOnDate, formatDateDisplay } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";
import { CellEditorPopover } from "./CellEditorPopover";
import WorkoutModal from "./WorkoutModal";
import { TagMenuSelector } from "./TagMenuSelector";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { LoadingSpinner } from "./Skeletons";

// Flatten tasks including subtasks
const flattenTasks = tasks => {
  const result = [];
  const traverse = taskList => {
    taskList.forEach(task => {
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        traverse(task.subtasks);
      }
    });
  };
  traverse(tasks);
  return result;
};

// Filter only recurring tasks (exclude null, "none", and "note" completionType)
const getRecurringTasks = tasks => {
  const flatTasks = flattenTasks(tasks);
  return flatTasks.filter(
    t => t.recurrence && t.recurrence.type && t.recurrence.type !== "none" && t.completionType !== "note"
  );
};

// Group tasks by section, maintaining section order
const groupTasksBySection = (tasks, sections) => {
  const orderedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const grouped = [];

  orderedSections.forEach(section => {
    const sectionTasks = tasks.filter(t => t.sectionId === section.id).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sectionTasks.length > 0) {
      grouped.push({
        section,
        tasks: sectionTasks,
      });
    }
  });

  // Handle tasks with no section (shouldn't happen, but be safe)
  const tasksWithoutSection = tasks.filter(t => !t.sectionId);
  if (tasksWithoutSection.length > 0) {
    grouped.push({
      section: { id: "no-section", name: "Uncategorized", order: 999 },
      tasks: tasksWithoutSection,
    });
  }

  return grouped;
};

// Generate date array for range
const generateDates = (range, page = 0, pageSize = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate, endDate;

  switch (range) {
    case "week":
      // Last 7 days
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      endDate = today;
      break;
    case "month":
      // Last 30 days
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      endDate = today;
      break;
    case "year":
      // Last 365 days (paginated)
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - page * pageSize);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - pageSize + 1);
      break;
    case "currentYear": {
      // Jan 1 of current year to today (paginated)
      const yearStart = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - page * pageSize);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - pageSize + 1);
      // Don't go before year start
      if (startDate < yearStart) {
        startDate = yearStart;
      }
      break;
    }
    case "all": {
      // For "all", we'll use a large range (e.g., last 2 years)
      // In a real implementation, you'd query completions to find the earliest date
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - page * pageSize);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - pageSize + 1);
      // Limit to 2 years back
      const twoYearsAgo = new Date(today);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (startDate < twoYearsAgo) {
        startDate = twoYearsAgo;
      }
      break;
    }
    default:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      endDate = today;
  }

  const dates = [];
  let current = new Date(endDate);
  while (current >= startDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() - 1);
  }

  return dates; // Most recent first
};

// Calculate total pages for pagination
const calculateTotalPages = (range, pageSize = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (range) {
    case "week":
    case "month":
      return 1; // No pagination for these
    case "year":
      return Math.ceil(365 / pageSize);
    case "currentYear": {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const daysSinceYearStart = Math.floor((today - yearStart) / (1000 * 60 * 60 * 24));
      return Math.ceil(daysSinceYearStart / pageSize);
    }
    case "all":
      // Assume max 2 years = 730 days
      return Math.ceil(730 / pageSize);
    default:
      return 1;
  }
};

// Check if date is today
const isToday = date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return today.getTime() === checkDate.getTime();
};

// Get completion for task and date
const getCompletionForTaskDate = (completions, taskId, date) => {
  const checkDate = new Date(date);
  const utcCheckDate = new Date(
    Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0, 0)
  );

  return completions.find(c => {
    const completionDate = new Date(c.date);
    const utcCompletionDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );
    return c.taskId === taskId && utcCompletionDate.getTime() === utcCheckDate.getTime();
  });
};

// Task column header with menu
const TaskColumnHeader = ({ task, onEdit, onEditWorkout, onDuplicate, onDelete, tags, onTagsChange, onCreateTag }) => {
  const { mode } = useSemanticColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const isWorkoutTask = task.completionType === "workout";

  return (
    <Menu opened={menuOpen} onChange={setMenuOpen}>
      <Menu.Target>
        <Box
          component="button"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "55px",
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 8,
            paddingBottom: 8,
            cursor: "pointer",
            border: "none",
            outline: "none",
            background: "transparent",
            textAlign: "left",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = mode.bg.surfaceHover;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <Text size="xs" style={{ lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis" }} title={task.title}>
            {task.title}
          </Text>
        </Box>
      </Menu.Target>
      <Menu.Dropdown onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        {onEdit && (
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onEdit(task);
              setMenuOpen(false);
            }}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                }}
              >
                <Edit2 size={14} />
              </Box>
              <Text>Edit</Text>
            </Group>
          </Menu.Item>
        )}
        {/* Edit Workout option for workout-type tasks */}
        {isWorkoutTask && onEditWorkout && (
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onEditWorkout(task);
              setMenuOpen(false);
            }}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                }}
              >
                <Dumbbell size={14} />
              </Box>
              <Text>Edit Workout</Text>
            </Group>
          </Menu.Item>
        )}
        {onDuplicate && (
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onDuplicate(task.id);
              setMenuOpen(false);
            }}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                }}
              >
                <Copy size={14} />
              </Box>
              <Text>Duplicate</Text>
            </Group>
          </Menu.Item>
        )}
        {/* Tags submenu */}
        {tags && onTagsChange && onCreateTag && (
          <TagMenuSelector task={task} tags={tags} onTagsChange={onTagsChange} onCreateTag={onCreateTag} />
        )}
        {onDelete && (
          <Menu.Item
            c={mode.status.error}
            onClick={e => {
              e.stopPropagation();
              onDelete(task.id);
              setMenuOpen(false);
            }}
          >
            <Group gap={8}>
              <Box
                component="span"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </Box>
              <Text>Delete</Text>
            </Group>
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

// Table cell component
const TableCell = ({ task, date, completion, isScheduled, onUpdate, onDelete, onSaveWorkoutProgress }) => {
  const { mode } = useSemanticColors();
  const [isOpen, setIsOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [textValue, setTextValue] = useState(completion?.note || "");
  const prevCompletionNoteRef = useRef(completion?.note);

  // Update text value when completion changes from external source
  if (prevCompletionNoteRef.current !== completion?.note) {
    prevCompletionNoteRef.current = completion?.note;
    setTextValue(completion?.note || "");
  }

  const getCellDisplay = () => {
    if (!completion) {
      if (isScheduled) {
        // Scheduled but no completion - show unchecked box (empty checkbox)
        // Match TaskItem checkbox style exactly
        return (
          <Checkbox
            checked={false}
            size="md"
            styles={{
              input: {
                backgroundColor: "white",
                boxShadow: "none",
                outline: "none",
                border: "none",
                "&:focus": {
                  boxShadow: "none",
                  outline: "none",
                },
                "&:focusVisible": {
                  boxShadow: "none",
                  outline: "none",
                },
              },
            }}
          />
        );
      } else {
        // Not scheduled, no completion - empty cell (no visual indicator)
        return null;
      }
    }

    // Has completion - show checkbox with appropriate state
    // Check outcome explicitly
    const outcome = completion?.outcome;

    if (outcome === "completed") {
      // Completed - green checkmark (match TaskItem style)
      return (
        <Checkbox
          checked={true}
          size="md"
          icon={() => <Check size={14} strokeWidth={3} />}
          styles={{
            input: {
              backgroundColor: "white",
              boxShadow: "none",
              outline: "none",
              border: "none",
              "&:focus": {
                boxShadow: "none",
                outline: "none",
              },
              "&:focusVisible": {
                boxShadow: "none",
                outline: "none",
              },
            },
            icon: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        />
      );
    } else if (outcome === "not_completed" || outcome === "not completed") {
      // Not completed - X mark (match TaskItem style)
      // Handle both "not_completed" and "not completed" formats
      return (
        <Checkbox
          checked={false}
          size="md"
          icon={() => <X size={14} strokeWidth={3} />}
          styles={{
            input: {
              backgroundColor: "white",
              boxShadow: "none",
              outline: "none",
              border: "none",
              "&:focus": {
                boxShadow: "none",
                outline: "none",
              },
              "&:focusVisible": {
                boxShadow: "none",
                outline: "none",
              },
            },
            icon: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        />
      );
    } else {
      // Outcome is missing/null/unknown - if scheduled, show empty checkbox, otherwise empty cell
      if (isScheduled) {
        return (
          <Checkbox
            checked={false}
            size="md"
            styles={{
              input: {
                backgroundColor: "white",
                boxShadow: "none",
                outline: "none",
                border: "none",
                "&:focus": {
                  boxShadow: "none",
                  outline: "none",
                },
                "&:focusVisible": {
                  boxShadow: "none",
                  outline: "none",
                },
              },
            }}
          />
        );
      } else {
        return null;
      }
    }
  };

  const { task: taskColors } = useSemanticColors();
  const cellBg = !isScheduled && completion ? taskColors.recurringBg : "transparent";
  const cellContent = getCellDisplay();

  // Handle text input completion type
  if (task.completionType === "text") {
    const handleTextSave = () => {
      if (textValue.trim()) {
        onUpdate({ outcome: "completed", note: textValue });
      } else if (completion) {
        onDelete();
      }
    };

    // If scheduled, show inline text input
    if (isScheduled) {
      return (
        <Box
          style={{
            width: "100%",
            height: "100%",
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            padding: 4,
            background: cellBg,
          }}
        >
          <TextInput
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onBlur={handleTextSave}
            onKeyDown={e => {
              if (e.key === "Enter") {
                handleTextSave();
                e.target.blur();
              }
            }}
            placeholder="Enter text..."
            size="sm"
            variant="unstyled"
            styles={{
              input: {
                fontSize: "var(--mantine-font-size-xs)",
                padding: 4,
                height: "auto",
                minHeight: "30px",
                border: "none",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                },
                "&:focus": {
                  backgroundColor: "transparent",
                  border: "1px solid",
                  borderColor: mode.border.focus,
                },
              },
            }}
          />
        </Box>
      );
    }

    // If not scheduled, show text input if there's a completion, otherwise show popover button
    if (completion?.note) {
      // Has completion - show editable text input
      return (
        <Box
          style={{
            width: "100%",
            height: "100%",
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            padding: 4,
            background: cellBg,
          }}
        >
          <TextInput
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onBlur={handleTextSave}
            onKeyDown={e => {
              if (e.key === "Enter") {
                handleTextSave();
                e.target.blur();
              }
            }}
            placeholder="Enter text..."
            size="sm"
            variant="unstyled"
            styles={{
              input: {
                fontSize: "var(--mantine-font-size-xs)",
                padding: 4,
                height: "auto",
                minHeight: "30px",
                border: "none",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                },
                "&:focus": {
                  backgroundColor: "transparent",
                  border: "1px solid",
                  borderColor: mode.border.focus,
                },
              },
            }}
          />
        </Box>
      );
    }

    // No completion - show popover to add one
    return (
      <Popover opened={isOpen} onChange={setIsOpen}>
        <Popover.Target>
          <Box
            component="button"
            onClick={() => setIsOpen(true)}
            style={{
              padding: 0,
              margin: 0,
              width: "100%",
              height: "100%",
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: cellBg,
              cursor: "pointer",
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = mode.bg.muted;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = cellBg;
            }}
          />
        </Popover.Target>
        <Popover.Dropdown>
          <CellEditorPopover
            task={task}
            date={date}
            completion={completion}
            isScheduled={isScheduled}
            onSave={data => {
              onUpdate(data);
              setIsOpen(false);
            }}
            onDelete={() => {
              onDelete();
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        </Popover.Dropdown>
      </Popover>
    );
  }

  // Handle workout completion type
  if (task.completionType === "workout") {
    const handleWorkoutClick = () => {
      setWorkoutModalOpen(true);
    };

    return (
      <>
        <Box
          component="button"
          onClick={handleWorkoutClick}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: cellBg,
            cursor: "pointer",
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = mode.bg.muted;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = cellBg;
          }}
        >
          {completion?.outcome === "completed" ? (
            <Checkbox
              checked={true}
              size="md"
              icon={() => <Check size={14} strokeWidth={3} />}
              styles={{
                input: {
                  backgroundColor: "white",
                  boxShadow: "none",
                  outline: "none",
                  border: "none",
                  "&:focus": {
                    boxShadow: "none",
                    outline: "none",
                  },
                  "&:focusVisible": {
                    boxShadow: "none",
                    outline: "none",
                  },
                },
                icon: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              }}
            />
          ) : (
            <Dumbbell size={18} />
          )}
        </Box>
        <WorkoutModal
          task={task}
          isOpen={workoutModalOpen}
          onClose={() => setWorkoutModalOpen(false)}
          onSaveProgress={onSaveWorkoutProgress}
          onCompleteTask={(_taskId, _completionDate) => {
            onUpdate({ outcome: "completed" });
            setWorkoutModalOpen(false);
          }}
          currentDate={date}
        />
      </>
    );
  }

  // Handle checkbox completion type (default)
  // Always render a clickable cell to allow adding completions to non-scheduled days
  return (
    <Popover opened={isOpen} onChange={setIsOpen}>
      <Popover.Target>
        <Box
          component="button"
          onClick={() => setIsOpen(true)}
          style={{
            padding: 0,
            margin: 0,
            width: "100%",
            height: "100%",
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: cellBg,
            cursor: "pointer",
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = mode.bg.muted;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = cellBg;
          }}
        >
          {cellContent}
        </Box>
      </Popover.Target>
      <Popover.Dropdown>
        <CellEditorPopover
          task={task}
          date={date}
          completion={completion}
          isScheduled={isScheduled}
          onSave={data => {
            onUpdate(data);
            setIsOpen(false);
          }}
          onDelete={() => {
            onDelete();
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

export const RecurringTableView = ({
  tasks,
  sections,
  completions,
  createCompletion,
  deleteCompletion,
  updateCompletion,
  getCompletionForDate,
  updateTask,
  onEdit,
  onEditWorkout,
  onDuplicate,
  onDelete,
  tags,
  onTagsChange,
  onCreateTag,
}) => {
  const [range, setRange] = useState("month");
  const [page, setPage] = useState(0);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Defer heavy data processing to prevent blocking the UI
  const deferredTasks = useDeferredValue(tasks);
  const deferredSections = useDeferredValue(sections);
  const deferredCompletions = useDeferredValue(completions);

  // Mark initial load as complete after skeleton has time to render
  useEffect(() => {
    // Use double requestAnimationFrame to ensure skeleton paints before we start heavy work
    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => {
        setIsInitialLoad(false);
      });
      return () => cancelAnimationFrame(frame2);
    });
    return () => cancelAnimationFrame(frame1);
  }, []);

  const rangeOptions = useMemo(
    () => [
      { label: "This Week", value: "week" },
      { label: "This Month", value: "month" },
      { label: "This Year", value: "year" },
      { label: "Current Year", value: "currentYear" },
      { label: "All Time", value: "all" },
    ],
    []
  );

  // Get recurring tasks - use deferred values to prevent blocking
  const recurringTasks = useMemo(() => getRecurringTasks(deferredTasks), [deferredTasks]);

  // Group tasks by section - use deferred values
  const groupedTasks = useMemo(
    () => groupTasksBySection(recurringTasks, deferredSections),
    [recurringTasks, deferredSections]
  );

  // Generate dates for current range and page
  const dates = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      // Generate dates from custom range
      const result = [];
      let current = new Date(customEndDate);
      current.setHours(0, 0, 0, 0);
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      while (current >= start) {
        result.push(new Date(current));
        current.setDate(current.getDate() - 1);
      }
      return result; // Most recent first
    }
    return generateDates(range, page);
  }, [range, page, useCustomRange, customStartDate, customEndDate]);

  // Calculate total pages
  const totalPages = useMemo(() => calculateTotalPages(range), [range]);

  // Handle cell update
  const handleCellUpdate = async (taskId, date, data) => {
    const existingCompletion = getCompletionForDate(taskId, date);

    // If this is an off-schedule completion with a time, add the date to additionalDates
    if (!data.isScheduled && data.time) {
      const task = deferredTasks.find(t => t.id === taskId);
      if (task) {
        // Normalize date to UTC to avoid timezone issues
        const d = new Date(date);
        const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
        const dateStr = utcDate.toISOString();

        // Check if this date is already in additionalDates
        const existingAdditionalDates = task.recurrence?.additionalDates || [];
        const dateAlreadyAdded = existingAdditionalDates.some(d => {
          const existingDateStr = d.split("T")[0];
          const newDateStr = dateStr.split("T")[0];
          return existingDateStr === newDateStr;
        });

        if (!dateAlreadyAdded) {
          const updatedRecurrence = {
            ...task.recurrence,
            additionalDates: [...existingAdditionalDates, dateStr],
          };

          // Update the task with the new recurrence (but NOT the time - that's stored in the completion)
          await updateTask(taskId, {
            recurrence: updatedRecurrence,
          });
        }
      }
    }

    if (existingCompletion) {
      // Update existing
      await updateCompletion(taskId, date, data);
    } else {
      // Create new
      await createCompletion(taskId, date, data);
    }
  };

  // Handle cell delete
  const handleCellDelete = async (taskId, date) => {
    // Check if this was an off-schedule completion
    const task = deferredTasks.find(t => t.id === taskId);
    if (task && task.recurrence?.additionalDates) {
      // Normalize date to UTC to avoid timezone issues
      const d = new Date(date);
      const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
      const dateStr = utcDate.toISOString();
      const dateStrShort = dateStr.split("T")[0];

      // Check if this date is in additionalDates
      const hasAdditionalDate = task.recurrence.additionalDates.some(d => {
        const existingDateStr = d.split("T")[0];
        return existingDateStr === dateStrShort;
      });

      if (hasAdditionalDate) {
        // Remove this date from additionalDates
        const updatedAdditionalDates = task.recurrence.additionalDates.filter(d => {
          const existingDateStr = d.split("T")[0];
          return existingDateStr !== dateStrShort;
        });

        const updatedRecurrence = {
          ...task.recurrence,
          additionalDates: updatedAdditionalDates,
        };

        // Update the task to remove this date from additionalDates
        await updateTask(taskId, {
          recurrence: updatedRecurrence,
        });
      }
    }

    await deleteCompletion(taskId, date);
  };

  // Handle workout progress save
  const handleSaveWorkoutProgress = async (taskId, date, workoutCompletion) => {
    try {
      // Find the task to update its workoutData
      const task = deferredTasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedWorkoutData = {
        ...task.workoutData,
        progress: {
          ...task.workoutData?.progress,
          [workoutCompletion.week]: workoutCompletion,
        },
      };

      // Update the task with new workout data
      await updateTask(taskId, { workoutData: updatedWorkoutData });
    } catch (error) {
      console.error("Failed to save workout progress:", error);
    }
  };

  const { mode, calendar } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const headerBg = mode.bg.muted;
  const sectionHeaderBg = calendar.todayBg;
  const todayRowBg = calendar.todayBg;

  // Show loading spinner on initial load only - deferred values will update automatically
  const isPending = isInitialLoad;

  // Show loading spinner while data is loading
  if (isPending) {
    return (
      <Box
        style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        <LoadingSpinner size="xl" />
      </Box>
    );
  }

  if (recurringTasks.length === 0) {
    return (
      <Box style={{ padding: 32, textAlign: "center" }}>
        <Text c={mode.text.secondary}>No recurring tasks found.</Text>
        <Text size="sm" c={mode.text.muted} style={{ marginTop: 8 }}>
          Create recurring tasks to see them in this view.
        </Text>
      </Box>
    );
  }

  // Calculate date range display
  const getDateRangeDisplay = () => {
    if (dates.length === 0) return "";

    const startDate = dates[dates.length - 1]; // dates are in reverse order
    const endDate = dates[0];

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    const formatDate = date => {
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    if (startYear === endYear) {
      // Same year
      return `${formatDate(startDate)} - ${formatDate(endDate)}, ${endYear}`;
    } else {
      // Different years
      return `${formatDate(startDate)}, ${startYear} - ${formatDate(endDate)}, ${endYear}`;
    }
  };

  // Format date for input field
  const formatDateInput = date => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handle start date change
  const handleStartDateChange = e => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(0, 0, 0, 0);
      setCustomStartDate(newDate);
      setUseCustomRange(true);
      setPage(0);
    }
  };

  // Handle end date change
  const handleEndDateChange = e => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(0, 0, 0, 0);
      setCustomEndDate(newDate);
      setUseCustomRange(true);
      setPage(0);
    }
  };

  // Handle preset range change
  const handleRangeChange = value => {
    setRange(value);
    setUseCustomRange(false);
    setPage(0);
  };

  // Navigate dates backward (earlier)
  const handlePreviousDay = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      const newStart = new Date(customStartDate);
      newStart.setDate(newStart.getDate() - 1);
      const newEnd = new Date(customEndDate);
      newEnd.setDate(newEnd.getDate() - 1);
      setCustomStartDate(newStart);
      setCustomEndDate(newEnd);
    } else {
      setPage(Math.min(totalPages - 1, page + 1));
    }
  };

  // Navigate dates forward (more recent)
  const handleNextDay = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      const newStart = new Date(customStartDate);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(customEndDate);
      newEnd.setDate(newEnd.getDate() + 1);
      setCustomStartDate(newStart);
      setCustomEndDate(newEnd);
    } else {
      setPage(Math.max(0, page - 1));
    }
  };

  // Reset to today
  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCustomEndDate(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29); // 30 days
    setCustomStartDate(startDate);
    setUseCustomRange(true);
    setPage(0);
  };

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header with title and date range */}
      <Box
        style={{ padding: 16, borderBottomWidth: "1px", borderBottomColor: borderColor, borderBottomStyle: "solid" }}
      >
        <Text size="xl" fw={700} style={{ marginBottom: 8 }}>
          Recurring Tasks
        </Text>
        <Text size="sm" c={mode.text.secondary}>
          {getDateRangeDisplay()}
        </Text>
      </Box>

      {/* Controls */}
      <Box
        style={{ padding: 16, borderBottomWidth: "1px", borderBottomColor: borderColor, borderBottomStyle: "solid" }}
      >
        <Stack gap={12} align="stretch">
          {/* Navigation and Today button */}
          <Flex align="center" gap={8} wrap="wrap">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <ActionIcon onClick={handlePreviousDay} variant="subtle" aria-label="Previous" size="sm">
              <ChevronLeft size={14} stroke="currentColor" />
            </ActionIcon>
            <ActionIcon onClick={handleNextDay} variant="subtle" aria-label="Next" size="sm">
              <ChevronRight size={14} stroke="currentColor" />
            </ActionIcon>

            {/* Preset Range Selector */}
            <Group gap={8} style={{ flex: 1 }}>
              <Text size="sm" fw={500} c={mode.text.primary} style={{ minWidth: "fit-content" }}>
                Preset:
              </Text>
              <SelectDropdown
                data={rangeOptions}
                value={range}
                onChange={handleRangeChange}
                placeholder="Select range"
                size="sm"
                width="150px"
              />
            </Group>

            {/* Pagination for preset ranges */}
            {!useCustomRange && totalPages > 1 && (
              <Group gap={8}>
                <Text size="sm" c={mode.text.secondary}>
                  Page {page + 1} of {totalPages}
                </Text>
              </Group>
            )}
          </Flex>

          {/* Custom Date Range Pickers */}
          <Flex align="center" gap={8} wrap="wrap">
            <Text size="sm" fw={500} c={mode.text.primary} style={{ minWidth: "fit-content" }}>
              Custom Range:
            </Text>
            <Group gap={8}>
              <Text size="sm" c={mode.text.secondary}>
                From
              </Text>
              <TextInput
                type="date"
                value={formatDateInput(customStartDate)}
                onChange={handleStartDateChange}
                size="sm"
                variant="default"
                style={{ width: "150px", cursor: "pointer" }}
                styles={{
                  input: {
                    cursor: "pointer",
                    "&::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                    },
                  },
                }}
              />
              <Text size="sm" c={mode.text.secondary}>
                To
              </Text>
              <TextInput
                type="date"
                value={formatDateInput(customEndDate)}
                onChange={handleEndDateChange}
                size="sm"
                variant="default"
                style={{ width: "150px", cursor: "pointer" }}
                styles={{
                  input: {
                    cursor: "pointer",
                    "&::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                    },
                  },
                }}
              />
            </Group>
          </Flex>
        </Stack>
      </Box>

      {/* Table */}
      <Box style={{ flex: 1, overflow: "auto" }}>
        <Table size="sm" style={{ borderCollapse: "collapse" }}>
          <Table.Thead
            style={{
              background: headerBg,
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <Table.Tr>
              {/* Date column */}
              <Table.Th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 11,
                  background: headerBg,
                  minWidth: "150px",
                  borderRightWidth: "2px",
                  borderRightColor: borderColor,
                  borderRightStyle: "solid",
                  borderWidth: "1px",
                  borderLeftWidth: "1px",
                  borderLeftColor: borderColor,
                  borderLeftStyle: "solid",
                  borderTopWidth: "1px",
                  borderTopColor: borderColor,
                  borderTopStyle: "solid",
                  borderBottomWidth: "1px",
                  borderBottomColor: borderColor,
                  borderBottomStyle: "solid",
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                Date
              </Table.Th>
              {/* Task columns grouped by section */}
              {groupedTasks.map(({ section, tasks: sectionTasks }) => (
                <Table.Th
                  key={section.id}
                  colSpan={sectionTasks.length}
                  style={{
                    background: sectionHeaderBg,
                    textAlign: "center",
                    fontWeight: 700,
                    borderWidth: "1px",
                    borderColor: borderColor,
                    borderLeftWidth: 0,
                    borderTopWidth: "1px",
                    borderTopColor: borderColor,
                    borderTopStyle: "solid",
                    borderRightWidth: "1px",
                    borderRightColor: borderColor,
                    borderRightStyle: "solid",
                    borderBottomWidth: "1px",
                    borderBottomColor: borderColor,
                    borderBottomStyle: "solid",
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  {section.name}
                </Table.Th>
              ))}
            </Table.Tr>
            {/* Task header row */}
            <Table.Tr>
              <Table.Th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 11,
                  background: headerBg,
                  borderRightWidth: "2px",
                  borderRightColor: borderColor,
                  borderRightStyle: "solid",
                  borderWidth: "1px",
                  borderLeftWidth: "1px",
                  borderLeftColor: borderColor,
                  borderLeftStyle: "solid",
                  borderTopWidth: 0,
                  borderBottomWidth: "1px",
                  borderBottomColor: borderColor,
                  borderBottomStyle: "solid",
                }}
              />
              {groupedTasks.map(({ section: _section, tasks: sectionTasks }) =>
                sectionTasks.map(task => (
                  <Table.Th
                    key={task.id}
                    style={{
                      minWidth: "100px",
                      maxWidth: "150px",
                      borderWidth: "1px",
                      borderColor: borderColor,
                      borderLeftWidth: 0,
                      borderTopWidth: 0,
                      borderRightWidth: "1px",
                      borderRightColor: borderColor,
                      borderRightStyle: "solid",
                      borderBottomWidth: "1px",
                      borderBottomColor: borderColor,
                      borderBottomStyle: "solid",
                      padding: 0,
                      overflow: "hidden",
                    }}
                  >
                    <TaskColumnHeader
                      task={task}
                      onEdit={onEdit}
                      onEditWorkout={onEditWorkout}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                      tags={tags}
                      onTagsChange={onTagsChange}
                      onCreateTag={onCreateTag}
                    />
                  </Table.Th>
                ))
              )}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dates.map(date => {
              const isTodayDate = isToday(date);
              return (
                <Table.Tr
                  key={date.toISOString()}
                  style={{
                    background: isTodayDate ? todayRowBg : "transparent",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = mode.bg.muted;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = isTodayDate ? todayRowBg : "transparent";
                  }}
                >
                  {/* Date cell */}
                  <Table.Td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 9,
                      background: isTodayDate ? todayRowBg : bgColor,
                      borderRightWidth: "2px",
                      borderRightColor: borderColor,
                      borderRightStyle: "solid",
                      borderWidth: "1px",
                      borderLeftWidth: "1px",
                      borderLeftColor: borderColor,
                      borderLeftStyle: "solid",
                      borderTopWidth: 0,
                      borderBottomWidth: "1px",
                      borderBottomColor: borderColor,
                      borderBottomStyle: "solid",
                      fontWeight: isTodayDate ? 700 : 400,
                      paddingLeft: 12,
                      paddingRight: 12,
                      paddingTop: 8,
                      paddingBottom: 8,
                    }}
                  >
                    {formatDateDisplay(date)}
                  </Table.Td>
                  {/* Task cells */}
                  {groupedTasks.map(({ section: _section, tasks: sectionTasks }) =>
                    sectionTasks.map(task => {
                      const isScheduled = shouldShowOnDate(task, date);
                      const completion = getCompletionForTaskDate(deferredCompletions, task.id, date);
                      return (
                        <Table.Td
                          key={task.id}
                          style={{
                            padding: 0,
                            borderWidth: "1px",
                            borderColor: borderColor,
                            borderLeftWidth: 0,
                            borderTopWidth: 0,
                            borderRightWidth: "1px",
                            borderRightColor: borderColor,
                            borderRightStyle: "solid",
                            borderBottomWidth: "1px",
                            borderBottomColor: borderColor,
                            borderBottomStyle: "solid",
                            textAlign: "center",
                            verticalAlign: "middle",
                            position: "relative",
                            minWidth: "150px",
                          }}
                        >
                          <TableCell
                            task={task}
                            date={date}
                            completion={completion}
                            isScheduled={isScheduled}
                            onUpdate={data => handleCellUpdate(task.id, date, data)}
                            onDelete={() => handleCellDelete(task.id, date)}
                            onSaveWorkoutProgress={handleSaveWorkoutProgress}
                          />
                        </Table.Td>
                      );
                    })
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Box>
  );
};
