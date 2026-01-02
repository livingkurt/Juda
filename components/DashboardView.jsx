"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Heading, Text, Table, HStack, VStack, Card, Badge, Tabs, createListCollection } from "@chakra-ui/react";
import { useCompletions } from "@/hooks/useCompletions";
import { useTasks } from "@/hooks/useTasks";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { shouldShowOnDate } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Helper function to resolve Chakra color mode objects to hex strings for Recharts
const resolveColor = (colorObj, colorMode) => {
  if (typeof colorObj === "string") return colorObj;
  if (!colorObj || typeof colorObj !== "object") return "#000000";

  // Color mapping based on Chakra v2 theme values
  const colorMap = {
    white: "#FFFFFF",
    "gray.50": "#F7FAFC",
    "gray.100": "#EDF2F7",
    "gray.200": "#E2E8F0",
    "gray.300": "#CBD5E0",
    "gray.400": "#A0AEC0",
    "gray.500": "#718096",
    "gray.600": "#4A5568",
    "gray.700": "#2D3748",
    "gray.800": "#1A202C",
    "gray.900": "#171923",
  };

  const colorValue = colorMode === "dark" ? colorObj._dark : colorObj._light;
  return colorMap[colorValue] || colorValue || "#000000";
};

export const DashboardView = () => {
  const { mode } = useSemanticColors();
  const {
    completions,
    fetchCompletions,
    createCompletion,
    deleteCompletion,
    loading: completionsLoading,
  } = useCompletions();
  const { tasks, loading: tasksLoading } = useTasks();
  const { colorMode } = useColorModeSync();
  const [dateRange, setDateRange] = useState("30"); // days
  const [selectedTask, setSelectedTask] = useState("all");

  // Create collections for selects
  const dateRangeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
          { label: "Last year", value: "365" },
        ],
      }),
    []
  );

  const taskFilterCollection = useMemo(
    () =>
      createListCollection({
        items: [{ label: "All Tasks", value: "all" }, ...tasks.map(task => ({ label: task.title, value: task.id }))],
      }),
    [tasks]
  );

  const statusCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Checked", value: "checked" },
          { label: "Unchecked", value: "unchecked" },
        ],
      }),
    []
  );

  const outcomeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Completed", value: "completed" },
          { label: "Not Completed", value: "not_completed" },
        ],
      }),
    []
  );

  // Filter recurring tasks (exclude null recurrence and type "none")
  const recurringTasks = useMemo(() => {
    return tasks.filter(task => task.recurrence && task.recurrence.type !== "none");
  }, [tasks]);

  // Generate date range for recurring tasks table (last 30 days, today at top)
  const tableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start with today (i=0) and go backwards
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Resolved colors for Recharts (must be strings)
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const cardBg = mode.bg.surface;
  const tableBg = mode.bg.surface;
  const tableHeaderBg = mode.bg.muted;
  const tableRowHover = mode.bg.surfaceHover;

  const resolvedBorderColor = useMemo(() => resolveColor(borderColor, colorMode), [borderColor, colorMode]);
  const resolvedMutedText = useMemo(() => resolveColor(mutedText, colorMode), [mutedText, colorMode]);
  const resolvedCardBg = useMemo(() => resolveColor(cardBg, colorMode), [cardBg, colorMode]);
  const resolvedTextColor = useMemo(() => resolveColor(textColor, colorMode), [textColor, colorMode]);

  const loading = completionsLoading || tasksLoading;

  // Calculate date range
  const endDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dateRange]);

  // Fetch completions for date range
  useEffect(() => {
    fetchCompletions({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...(selectedTask !== "all" && { taskId: selectedTask }),
    });
  }, [fetchCompletions, startDate, endDate, selectedTask]);

  // Handle status change in table
  const handleStatusChange = async (completion, newStatus) => {
    try {
      const completionDate = new Date(completion.date).toISOString();

      if (newStatus === "unchecked") {
        // Delete the completion record
        await deleteCompletion(completion.taskId, completionDate);
        // Refetch to update the table
        await fetchCompletions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...(selectedTask !== "all" && { taskId: selectedTask }),
        });
      } else if (newStatus === "checked") {
        // Create the completion record (shouldn't happen since all rows are already checked)
        await createCompletion(completion.taskId, completionDate);
        // Refetch to update the table
        await fetchCompletions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...(selectedTask !== "all" && { taskId: selectedTask }),
        });
      }
    } catch (error) {
      console.error("Error updating completion status:", error);
    }
  };

  // Handle outcome change for recurring tasks table
  const handleRecurringOutcomeChange = async (taskId, date, newOutcome) => {
    try {
      const dateStr = date.toISOString();

      if (newOutcome === null) {
        // Delete any existing completion
        await deleteCompletion(taskId, dateStr);
      } else {
        // Create or update completion with the selected outcome
        await createCompletion(taskId, dateStr, { outcome: newOutcome });
      }

      // Refetch completions
      await fetchCompletions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } catch (error) {
      console.error("Error updating recurring task outcome:", error);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    const dataMap = new Map();

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0];
      dataMap.set(dateKey, {
        date: dateKey,
        completions: 0,
        formattedDate: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    // Count completions per date
    completions.forEach(completion => {
      const dateKey = new Date(completion.date).toISOString().split("T")[0];
      if (dataMap.has(dateKey)) {
        dataMap.get(dateKey).completions += 1;
      }
    });

    return Array.from(dataMap.values());
  }, [completions, startDate, endDate]);

  // Task completion statistics
  const taskStats = useMemo(() => {
    const stats = new Map();

    completions.forEach(completion => {
      const taskId = completion.taskId;
      const task = tasks.find(t => t.id === taskId);
      const taskTitle = task?.title || "Unknown Task";

      if (!stats.has(taskId)) {
        stats.set(taskId, {
          taskId,
          taskTitle,
          count: 0,
          lastCompleted: null,
        });
      }

      const stat = stats.get(taskId);
      stat.count += 1;
      const completionDate = new Date(completion.date);
      if (!stat.lastCompleted || completionDate > stat.lastCompleted) {
        stat.lastCompleted = completionDate;
      }
    });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [completions, tasks]);

  // Daily completion totals
  const dailyTotals = useMemo(() => {
    return chartData.map(d => ({
      ...d,
      total: d.completions,
    }));
  }, [chartData]);

  if (loading) {
    return (
      <Box p={6}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box p={{ base: 3, md: 6 }} overflowY="auto" w="full" h="full" minH="100%" maxW="100%">
      <VStack align="stretch" spacing={6} w="full">
        <Box>
          <Heading size="lg" mb={2} color={textColor}>
            Completion History Dashboard
          </Heading>
          <Text color={mutedText}>Track your task completion history over time</Text>
        </Box>

        {/* Filters */}
        <Card.Root bg={cardBg} borderColor={borderColor}>
          <Card.Body>
            <HStack spacing={4}>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Date Range
                </Text>
                <SelectDropdown
                  collection={dateRangeCollection}
                  value={[dateRange]}
                  onValueChange={({ value }) => setDateRange(value[0])}
                  placeholder="Select range"
                  w="150px"
                  triggerProps={{ bg: "transparent", borderColor: borderColor, borderWidth: "1px" }}
                />
              </Box>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Task Filter
                </Text>
                <SelectDropdown
                  collection={taskFilterCollection}
                  value={[selectedTask]}
                  onValueChange={({ value }) => setSelectedTask(value[0])}
                  placeholder="Select task"
                  w="200px"
                  triggerProps={{ bg: "transparent", borderColor: borderColor, borderWidth: "1px" }}
                />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Charts */}
        <Tabs.Root defaultValue="0">
          <Tabs.List>
            <Tabs.Trigger value="0">Line Chart</Tabs.Trigger>
            <Tabs.Trigger value="1">Bar Chart</Tabs.Trigger>
            <Tabs.Trigger value="2">Table View</Tabs.Trigger>
            <Tabs.Trigger value="3">Recurring Tasks</Tabs.Trigger>
          </Tabs.List>

          {/* Line Chart */}
          <Tabs.Content value="0" px={0}>
            <Card.Root bg={cardBg} borderColor={borderColor}>
              <Card.Header>
                <Heading size="md" color={textColor}>
                  Daily Completions Over Time
                </Heading>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={resolvedBorderColor} />
                    <XAxis
                      dataKey="formattedDate"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      stroke={resolvedMutedText}
                    />
                    <YAxis stroke={resolvedMutedText} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: resolvedCardBg,
                        borderColor: resolvedBorderColor,
                        color: resolvedTextColor,
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="completions" stroke="#3b82f6" strokeWidth={2} name="Completions" />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>

          {/* Bar Chart */}
          <Tabs.Content value="1" px={0}>
            <Card.Root bg={cardBg} borderColor={borderColor}>
              <Card.Header>
                <Heading size="md" color={textColor}>
                  Daily Completion Totals
                </Heading>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dailyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke={resolvedBorderColor} />
                    <XAxis
                      dataKey="formattedDate"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      stroke={resolvedMutedText}
                    />
                    <YAxis stroke={resolvedMutedText} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: resolvedCardBg,
                        borderColor: resolvedBorderColor,
                        color: resolvedTextColor,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Completions" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>

          {/* Table View */}
          <Tabs.Content value="2" px={0}>
            <Card.Root bg={cardBg} borderColor={borderColor}>
              <Card.Header>
                <Heading size="md" color={textColor}>
                  Completion History Table
                </Heading>
              </Card.Header>
              <Card.Body>
                <Table.Root variant="simple" bg={tableBg}>
                  <Table.Header bg={tableHeaderBg}>
                    <Table.Row>
                      <Table.ColumnHeader color={textColor}>Date</Table.ColumnHeader>
                      <Table.ColumnHeader color={textColor}>Task</Table.ColumnHeader>
                      <Table.ColumnHeader color={textColor}>Section</Table.ColumnHeader>
                      <Table.ColumnHeader color={textColor}>Completed At</Table.ColumnHeader>
                      <Table.ColumnHeader color={textColor}>Status</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {completions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(completion => {
                        const task = tasks.find(t => t.id === completion.taskId);
                        return (
                          <Table.Row key={completion.id} _hover={{ bg: tableRowHover }}>
                            <Table.Cell color={textColor}>
                              {new Date(completion.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </Table.Cell>
                            <Table.Cell color={textColor}>{task?.title || "Unknown Task"}</Table.Cell>
                            <Table.Cell>
                              <Badge colorPalette="blue">{task?.section?.name || "N/A"}</Badge>
                            </Table.Cell>
                            <Table.Cell color={textColor}>
                              {new Date(completion.createdAt).toLocaleString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </Table.Cell>
                            <Table.Cell>
                              <SelectDropdown
                                collection={statusCollection}
                                value={["checked"]}
                                onValueChange={({ value }) => handleStatusChange(completion, value[0])}
                                size="sm"
                                w="120px"
                                triggerProps={{ bg: "transparent", borderColor: borderColor, borderWidth: "1px" }}
                              />
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    {completions.length === 0 && (
                      <Table.Row>
                        <Table.Cell colSpan={5} textAlign="center" py={8}>
                          <Text color={mutedText}>No completions found for the selected period</Text>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>

          {/* Recurring Tasks Table */}
          <Tabs.Content value="3" px={0}>
            <Card.Root bg={cardBg} borderColor={borderColor}>
              <Card.Header>
                <Heading size="md" color={textColor}>
                  Recurring Tasks Completion Matrix
                </Heading>
                <Text fontSize="sm" color={mutedText} mt={1}>
                  Edit completion status for recurring tasks. Grey cells indicate tasks that don&apos;t recur on that
                  day.
                </Text>
              </Card.Header>
              <Card.Body>
                <Box overflowX="auto" w="full">
                  <Table.Root variant="simple" bg={tableBg} size="sm">
                    <Table.Header bg={tableHeaderBg}>
                      <Table.Row>
                        <Table.ColumnHeader
                          color={textColor}
                          position={{ base: "relative", md: "sticky" }}
                          left={{ base: "auto", md: 0 }}
                          bg={tableHeaderBg}
                          zIndex={{ base: "auto", md: 2 }}
                        >
                          Date
                        </Table.ColumnHeader>
                        {recurringTasks.map(task => (
                          <Table.ColumnHeader key={task.id} color={textColor} minW="150px">
                            {task.title}
                          </Table.ColumnHeader>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {tableDates.map(date => {
                        const dateStr = date.toISOString();
                        const formattedDate = date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        });
                        return (
                          <Table.Row key={dateStr} _hover={{ bg: tableRowHover }}>
                            <Table.Cell
                              color={textColor}
                              position={{ base: "relative", md: "sticky" }}
                              left={{ base: "auto", md: 0 }}
                              bg={tableBg}
                              zIndex={{ base: "auto", md: 1 }}
                              fontWeight="medium"
                            >
                              {formattedDate}
                            </Table.Cell>
                            {recurringTasks.map(task => {
                              const shouldShow = shouldShowOnDate(task, date);
                              const completion = completions.find(c => {
                                const cDate = new Date(c.date);
                                return c.taskId === task.id && cDate.toDateString() === date.toDateString();
                              });
                              const currentOutcome = completion?.outcome || null;

                              return (
                                <Table.Cell
                                  key={`${task.id}-${dateStr}`}
                                  bg={shouldShow ? tableBg : mode.bg.muted}
                                  opacity={shouldShow ? 1 : 0.4}
                                >
                                  {shouldShow ? (
                                    <SelectDropdown
                                      collection={outcomeCollection}
                                      value={[currentOutcome]}
                                      onValueChange={({ value }) =>
                                        handleRecurringOutcomeChange(task.id, date, value[0])
                                      }
                                      size="sm"
                                      w="110px"
                                      triggerProps={{ bg: "transparent", borderColor: borderColor, borderWidth: "1px" }}
                                    />
                                  ) : (
                                    <Text color={mutedText} fontSize="xs" fontStyle="italic">
                                      N/A
                                    </Text>
                                  )}
                                </Table.Cell>
                              );
                            })}
                          </Table.Row>
                        );
                      })}
                      {recurringTasks.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={recurringTasks.length + 1} textAlign="center" py={8}>
                            <Text color={mutedText}>No recurring tasks found</Text>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>
        </Tabs.Root>

        {/* Task Statistics */}
        <Card.Root bg={cardBg} borderColor={borderColor}>
          <Card.Header>
            <Heading size="md" color={textColor}>
              Task Completion Statistics
            </Heading>
          </Card.Header>
          <Card.Body>
            <Table.Root variant="simple" size="sm" bg={tableBg}>
              <Table.Header bg={tableHeaderBg}>
                <Table.Row>
                  <Table.ColumnHeader color={textColor}>Task</Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric color={textColor}>
                    Completions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color={textColor}>Last Completed</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {taskStats.map(stat => (
                  <Table.Row key={stat.taskId} _hover={{ bg: tableRowHover }}>
                    <Table.Cell color={textColor}>{stat.taskTitle}</Table.Cell>
                    <Table.Cell isNumeric>
                      <Badge colorPalette="green">{stat.count}</Badge>
                    </Table.Cell>
                    <Table.Cell color={textColor}>
                      {stat.lastCompleted
                        ? stat.lastCompleted.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </Table.Cell>
                  </Table.Row>
                ))}
                {taskStats.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={3} textAlign="center" py={8}>
                      <Text color={mutedText}>No statistics available</Text>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
};
