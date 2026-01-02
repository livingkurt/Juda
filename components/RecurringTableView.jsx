"use client";

import { useState, useMemo, useRef } from "react";
import {
  Box,
  Table,
  Text,
  HStack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  IconButton,
  Flex,
  createListCollection,
  Checkbox,
  Input,
  Menu,
  Portal,
  Button,
  VStack,
} from "@chakra-ui/react";
import { Check, X, ChevronLeft, ChevronRight, Dumbbell, Edit2, Copy, Trash2 } from "lucide-react";
import { shouldShowOnDate, formatDateDisplay } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";
import { CellEditorPopover } from "./CellEditorPopover";
import WorkoutModal from "./WorkoutModal";
import { TagMenuSelector } from "./TagMenuSelector";

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
const TaskColumnHeader = ({
  task,
  onEditTask,
  onEditWorkout,
  onDuplicateTask,
  onDeleteTask,
  tags,
  onTagsChange,
  onCreateTag,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isWorkoutTask = task.completionType === "workout";

  return (
    <Menu.Root open={menuOpen} onOpenChange={({ open }) => setMenuOpen(open)}>
      <Menu.Trigger asChild>
        <Box
          as="button"
          w="100%"
          h="100%"
          minH="55px"
          display="flex"
          alignItems="center"
          px={2}
          py={2}
          cursor="pointer"
          _hover={{ bg: { _light: "gray.100", _dark: "gray.600" } }}
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          border="none"
          outline="none"
          bg="transparent"
          textAlign="left"
          transition="background-color 0.15s"
        >
          <Text fontSize="xs" noOfLines={1} title={task.title}>
            {task.title}
          </Text>
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            {onEditTask && (
              <Menu.Item
                onClick={e => {
                  e.stopPropagation();
                  onEditTask(task);
                  setMenuOpen(false);
                }}
              >
                <HStack gap={2}>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="14px"
                    h="14px"
                    flexShrink={0}
                  >
                    <Edit2 size={14} />
                  </Box>
                  <Text>Edit</Text>
                </HStack>
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
                <HStack gap={2}>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="14px"
                    h="14px"
                    flexShrink={0}
                  >
                    <Dumbbell size={14} />
                  </Box>
                  <Text>Edit Workout</Text>
                </HStack>
              </Menu.Item>
            )}
            {onDuplicateTask && (
              <Menu.Item
                onClick={e => {
                  e.stopPropagation();
                  onDuplicateTask(task.id);
                  setMenuOpen(false);
                }}
              >
                <HStack gap={2}>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="14px"
                    h="14px"
                    flexShrink={0}
                  >
                    <Copy size={14} />
                  </Box>
                  <Text>Duplicate</Text>
                </HStack>
              </Menu.Item>
            )}
            {/* Tags submenu */}
            {tags && onTagsChange && onCreateTag && (
              <TagMenuSelector task={task} tags={tags} onTagsChange={onTagsChange} onCreateTag={onCreateTag} />
            )}
            {onDeleteTask && (
              <Menu.Item
                color="red.500"
                onClick={e => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                  setMenuOpen(false);
                }}
              >
                <HStack gap={2}>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="14px"
                    h="14px"
                    flexShrink={0}
                  >
                    <Trash2 size={14} />
                  </Box>
                  <Text>Delete</Text>
                </HStack>
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

// Table cell component
const TableCell = ({ task, date, completion, isScheduled, onUpdate, onDelete, onSaveWorkoutProgress }) => {
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
          <Checkbox.Root checked={false} size="md">
            <Checkbox.HiddenInput />
            <Checkbox.Control
              bg="white"
              boxShadow="none"
              outline="none"
              border="none"
              _focus={{ boxShadow: "none", outline: "none" }}
              _focusVisible={{ boxShadow: "none", outline: "none" }}
            >
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Root>
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
        <Checkbox.Root checked={true} size="md">
          <Checkbox.HiddenInput />
          <Checkbox.Control
            bg="white"
            boxShadow="none"
            outline="none"
            border="none"
            _focus={{ boxShadow: "none", outline: "none" }}
            _focusVisible={{ boxShadow: "none", outline: "none" }}
          >
            <Checkbox.Indicator>
              <Check size={14} />
            </Checkbox.Indicator>
          </Checkbox.Control>
        </Checkbox.Root>
      );
    } else if (outcome === "not_completed" || outcome === "not completed") {
      // Not completed - X mark (match TaskItem style)
      // Handle both "not_completed" and "not completed" formats
      return (
        <Checkbox.Root checked={false} size="md">
          <Checkbox.HiddenInput />
          <Checkbox.Control
            bg="white"
            boxShadow="none"
            outline="none"
            border="none"
            _focus={{ boxShadow: "none", outline: "none" }}
            _focusVisible={{ boxShadow: "none", outline: "none" }}
          >
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="100%" h="100%">
              <Box as="span" color="gray.700">
                <X size={18} stroke="currentColor" style={{ strokeWidth: 3 }} />
              </Box>
            </Box>
          </Checkbox.Control>
        </Checkbox.Root>
      );
    } else {
      // Outcome is missing/null/unknown - if scheduled, show empty checkbox, otherwise empty cell
      if (isScheduled) {
        return (
          <Checkbox.Root checked={false} size="md">
            <Checkbox.HiddenInput />
            <Checkbox.Control
              bg="white"
              boxShadow="none"
              outline="none"
              border="none"
              _focus={{ boxShadow: "none", outline: "none" }}
              _focusVisible={{ boxShadow: "none", outline: "none" }}
            >
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Root>
        );
      } else {
        return null;
      }
    }
  };

  const cellBg = !isScheduled && completion ? { _light: "purple.50", _dark: "purple.900" } : "transparent";
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
        <Box w="100%" h="100%" minH="40px" display="flex" alignItems="center" p={1} bg={cellBg}>
          <Input
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
            variant="ghost"
            fontSize="xs"
            p={1}
            h="auto"
            minH="30px"
            border="none"
            bg="transparent"
            _hover={{ bg: "transparent" }}
            _focus={{ bg: "transparent", border: "1px solid", borderColor: "blue.500" }}
          />
        </Box>
      );
    }

    // If not scheduled, show text input if there's a completion, otherwise show popover button
    if (completion?.note) {
      // Has completion - show editable text input
      return (
        <Box w="100%" h="100%" minH="40px" display="flex" alignItems="center" p={1} bg={cellBg}>
          <Input
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
            variant="ghost"
            fontSize="xs"
            p={1}
            h="auto"
            minH="30px"
            border="none"
            bg="transparent"
            _hover={{ bg: "transparent" }}
            _focus={{ bg: "transparent", border: "1px solid", borderColor: "blue.500" }}
          />
        </Box>
      );
    }

    // No completion - show popover to add one
    return (
      <Popover.Root open={isOpen} onOpenChange={e => setIsOpen(e.open)}>
        <PopoverTrigger asChild>
          <Box
            as="button"
            onClick={() => setIsOpen(true)}
            p={0}
            m={0}
            w="100%"
            h="100%"
            minH="40px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={cellBg}
            _hover={{ bg: { _light: "gray.50", _dark: "gray.700" } }}
            cursor="pointer"
            border="none"
            outline="none"
            boxShadow="none"
            _focus={{ border: "none", outline: "none", boxShadow: "none" }}
            _focusVisible={{ border: "none", outline: "none", boxShadow: "none" }}
          />
        </PopoverTrigger>
        <Popover.Positioner>
          <PopoverContent>
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
          </PopoverContent>
        </Popover.Positioner>
      </Popover.Root>
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
          as="button"
          onClick={handleWorkoutClick}
          w="100%"
          h="100%"
          minH="40px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={cellBg}
          _hover={{ bg: { _light: "gray.50", _dark: "gray.700" } }}
          cursor="pointer"
          border="none"
          outline="none"
          boxShadow="none"
          _focus={{ border: "none", outline: "none", boxShadow: "none" }}
          _focusVisible={{ border: "none", outline: "none", boxShadow: "none" }}
        >
          {completion?.outcome === "completed" ? (
            <Checkbox.Root checked={true} size="md">
              <Checkbox.HiddenInput />
              <Checkbox.Control
                bg="white"
                boxShadow="none"
                outline="none"
                border="none"
                _focus={{ boxShadow: "none", outline: "none" }}
                _focusVisible={{ boxShadow: "none", outline: "none" }}
              >
                <Checkbox.Indicator>
                  <Check size={14} />
                </Checkbox.Indicator>
              </Checkbox.Control>
            </Checkbox.Root>
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
    <Popover.Root open={isOpen} onOpenChange={e => setIsOpen(e.open)}>
      <PopoverTrigger asChild>
        <Box
          as="button"
          onClick={() => setIsOpen(true)}
          p={0}
          m={0}
          w="100%"
          h="100%"
          minH="40px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={cellBg}
          _hover={{ bg: { _light: "gray.50", _dark: "gray.700" } }}
          cursor="pointer"
          border="none"
          outline="none"
          boxShadow="none"
          _focus={{ border: "none", outline: "none", boxShadow: "none" }}
          _focusVisible={{ border: "none", outline: "none", boxShadow: "none" }}
        >
          {cellContent}
        </Box>
      </PopoverTrigger>
      <Popover.Positioner>
        <PopoverContent>
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
        </PopoverContent>
      </Popover.Positioner>
    </Popover.Root>
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
  onEditTask,
  onEditWorkout,
  onDuplicateTask,
  onDeleteTask,
  tags,
  onTagsChange,
  onCreateTag,
}) => {
  const [range, setRange] = useState("month");
  const [page, setPage] = useState(0);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const rangeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "This Week", value: "week" },
          { label: "This Month", value: "month" },
          { label: "This Year", value: "year" },
          { label: "Current Year", value: "currentYear" },
          { label: "All Time", value: "all" },
        ],
      }),
    []
  );

  // Get recurring tasks
  const recurringTasks = useMemo(() => getRecurringTasks(tasks), [tasks]);

  // Group tasks by section
  const groupedTasks = useMemo(() => groupTasksBySection(recurringTasks, sections), [recurringTasks, sections]);

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
      const task = tasks.find(t => t.id === taskId);
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
    const task = tasks.find(t => t.id === taskId);
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
      const task = tasks.find(t => t.id === taskId);
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

  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const headerBg = { _light: "gray.50", _dark: "gray.700" };
  const sectionHeaderBg = { _light: "blue.50", _dark: "gray.750" };
  const todayRowBg = { _light: "blue.50", _dark: "whiteAlpha.100" };

  if (recurringTasks.length === 0) {
    return (
      <Box p={8} textAlign="center">
        <Text color={{ _light: "gray.500", _dark: "gray.400" }}>No recurring tasks found.</Text>
        <Text fontSize="sm" color={{ _light: "gray.400", _dark: "gray.500" }} mt={2}>
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
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden">
      {/* Header with title and date range */}
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          Recurring Tasks
        </Text>
        <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
          {getDateRangeDisplay()}
        </Text>
      </Box>

      {/* Controls */}
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <VStack gap={3} align="stretch">
          {/* Navigation and Today button */}
          <Flex align="center" gap={2} flexWrap="wrap">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <IconButton onClick={handlePreviousDay} variant="ghost" aria-label="Previous" size="sm">
              <Box as="span" color="currentColor">
                <ChevronLeft size={14} stroke="currentColor" />
              </Box>
            </IconButton>
            <IconButton onClick={handleNextDay} variant="ghost" aria-label="Next" size="sm">
              <Box as="span" color="currentColor">
                <ChevronRight size={14} stroke="currentColor" />
              </Box>
            </IconButton>

            {/* Preset Range Selector */}
            <HStack gap={2} flex={1}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={{ _light: "gray.700", _dark: "gray.300" }}
                minW="fit-content"
              >
                Preset:
              </Text>
              <SelectDropdown
                collection={rangeCollection}
                value={[range]}
                onValueChange={({ value }) => handleRangeChange(value[0])}
                placeholder="Select range"
                size="sm"
                w="150px"
              />
            </HStack>

            {/* Pagination for preset ranges */}
            {!useCustomRange && totalPages > 1 && (
              <HStack gap={2}>
                <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
                  Page {page + 1} of {totalPages}
                </Text>
              </HStack>
            )}
          </Flex>

          {/* Custom Date Range Pickers */}
          <Flex align="center" gap={2} flexWrap="wrap">
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={{ _light: "gray.700", _dark: "gray.300" }}
              minW="fit-content"
            >
              Custom Range:
            </Text>
            <HStack gap={2}>
              <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
                From
              </Text>
              <Input
                type="date"
                value={formatDateInput(customStartDate)}
                onChange={handleStartDateChange}
                size="sm"
                variant="outline"
                cursor="pointer"
                w="150px"
                sx={{
                  "&::-webkit-calendar-picker-indicator": {
                    cursor: "pointer",
                  },
                }}
              />
              <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
                To
              </Text>
              <Input
                type="date"
                value={formatDateInput(customEndDate)}
                onChange={handleEndDateChange}
                size="sm"
                variant="outline"
                cursor="pointer"
                w="150px"
                sx={{
                  "&::-webkit-calendar-picker-indicator": {
                    cursor: "pointer",
                  },
                }}
              />
            </HStack>
          </Flex>
        </VStack>
      </Box>

      {/* Table */}
      <Box flex={1} overflow="auto">
        <Table.Root variant="simple" size="sm">
          <Table.Header bg={headerBg} position="sticky" top={0} zIndex={10}>
            <Table.Row>
              {/* Date column */}
              <Table.ColumnHeader
                position={{ base: "relative", md: "sticky" }}
                left={{ base: "auto", md: 0 }}
                zIndex={{ base: "auto", md: 11 }}
                bg={headerBg}
                minW="150px"
                borderRightWidth="2px"
                borderColor={borderColor}
                borderWidth="1px"
                borderLeftWidth="1px"
                px={3}
                py={2}
              >
                Date
              </Table.ColumnHeader>
              {/* Task columns grouped by section */}
              {groupedTasks.map(({ section, tasks: sectionTasks }) => (
                <Table.ColumnHeader
                  key={section.id}
                  colSpan={sectionTasks.length}
                  bg={sectionHeaderBg}
                  textAlign="center"
                  fontWeight="bold"
                  borderWidth="1px"
                  borderColor={{ _light: "gray.200", _dark: "gray.600" }}
                  borderLeftWidth="0"
                  borderTopWidth="1px"
                  px={2}
                  py={2}
                >
                  {section.name}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
            {/* Task header row */}
            <Table.Row>
              <Table.ColumnHeader
                position={{ base: "relative", md: "sticky" }}
                left={{ base: "auto", md: 0 }}
                zIndex={{ base: "auto", md: 11 }}
                bg={headerBg}
                borderRightWidth="2px"
                borderColor={borderColor}
                borderWidth="1px"
                borderLeftWidth="1px"
                borderTopWidth="0"
              />
              {groupedTasks.map(({ section: _section, tasks: sectionTasks }) =>
                sectionTasks.map(task => (
                  <Table.ColumnHeader
                    key={task.id}
                    minW="100px"
                    maxW="150px"
                    borderWidth="1px"
                    borderColor={{ _light: "gray.200", _dark: "gray.600" }}
                    borderLeftWidth="0"
                    borderTopWidth="0"
                    p={0}
                    overflow="hidden"
                  >
                    <TaskColumnHeader
                      task={task}
                      onEditTask={onEditTask}
                      onEditWorkout={onEditWorkout}
                      onDuplicateTask={onDuplicateTask}
                      onDeleteTask={onDeleteTask}
                      tags={tags}
                      onTagsChange={onTagsChange}
                      onCreateTag={onCreateTag}
                    />
                  </Table.ColumnHeader>
                ))
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {dates.map(date => {
              const isTodayDate = isToday(date);
              return (
                <Table.Row
                  key={date.toISOString()}
                  bg={isTodayDate ? todayRowBg : "transparent"}
                  _hover={{ bg: { _light: "gray.50", _dark: "gray.700" } }}
                >
                  {/* Date cell */}
                  <Table.Cell
                    position={{ base: "relative", md: "sticky" }}
                    left={{ base: "auto", md: 0 }}
                    zIndex={{ base: "auto", md: 9 }}
                    bg={isTodayDate ? todayRowBg : bgColor}
                    borderRightWidth="2px"
                    borderColor={borderColor}
                    borderWidth="1px"
                    borderLeftWidth="1px"
                    borderTopWidth="0"
                    fontWeight={isTodayDate ? "bold" : "normal"}
                    px={3}
                    py={2}
                  >
                    {formatDateDisplay(date)}
                  </Table.Cell>
                  {/* Task cells */}
                  {groupedTasks.map(({ section: _section, tasks: sectionTasks }) =>
                    sectionTasks.map(task => {
                      const isScheduled = shouldShowOnDate(task, date);
                      const completion = getCompletionForTaskDate(completions, task.id, date);
                      return (
                        <Table.Cell
                          key={task.id}
                          p={0}
                          borderWidth="1px"
                          borderColor={{ _light: "gray.200", _dark: "gray.600" }}
                          borderLeftWidth="0"
                          borderTopWidth="0"
                          textAlign="center"
                          verticalAlign="middle"
                          position="relative"
                          minW="150px"
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
                        </Table.Cell>
                      );
                    })
                  )}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
};
