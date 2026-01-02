"use client";

import { useState, useMemo } from "react";
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
} from "@chakra-ui/react";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { shouldShowOnDate, formatDateDisplay } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";
import { CellEditorPopover } from "./CellEditorPopover";

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

// Table cell component
const TableCell = ({ task, date, completion, isScheduled, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

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
          {task.completionType === "text" && completion?.note ? (
            <HStack spacing={2} align="center" justify="center">
              {cellContent}
              <Text fontSize="xs" noOfLines={1} maxW="80px" title={completion.note}>
                {completion.note}
              </Text>
            </HStack>
          ) : (
            cellContent
          )}
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
}) => {
  const [range, setRange] = useState("month");
  const [page, setPage] = useState(0);

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
  const dates = useMemo(() => generateDates(range, page), [range, page]);

  // Calculate total pages
  const totalPages = useMemo(() => calculateTotalPages(range), [range]);

  // Handle cell update
  const handleCellUpdate = async (taskId, date, data) => {
    const existingCompletion = getCompletionForDate(taskId, date);
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
    await deleteCompletion(taskId, date);
  };

  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const headerBg = { _light: "gray.50", _dark: "gray.700" };
  const sectionHeaderBg = { _light: "blue.50", _dark: "blue.900" };
  const todayRowBg = { _light: "yellow.50", _dark: "yellow.900" };

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

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden">
      {/* Controls */}
      <Flex justify="space-between" align="center" p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <HStack spacing={4}>
          <SelectDropdown
            collection={rangeCollection}
            value={[range]}
            onValueChange={({ value }) => {
              setRange(value[0]);
              setPage(0); // Reset to first page when changing range
            }}
            placeholder="Select range"
            size="sm"
            w="150px"
          />
          {totalPages > 1 && (
            <HStack spacing={2}>
              <IconButton
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
                Page {page + 1} of {totalPages}
              </Text>
              <IconButton
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight size={16} />
              </IconButton>
            </HStack>
          )}
        </HStack>
      </Flex>

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
                minW="120px"
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
                    title={task.title}
                    borderWidth="1px"
                    borderColor={{ _light: "gray.200", _dark: "gray.600" }}
                    borderLeftWidth="0"
                    borderTopWidth="0"
                    px={2}
                    py={2}
                  >
                    <Text fontSize="xs" noOfLines={1}>
                      {task.title}
                    </Text>
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
                        >
                          <TableCell
                            task={task}
                            date={date}
                            completion={completion}
                            isScheduled={isScheduled}
                            onUpdate={data => handleCellUpdate(task.id, date, data)}
                            onDelete={() => handleCellDelete(task.id, date)}
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
