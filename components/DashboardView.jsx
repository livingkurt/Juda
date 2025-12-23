"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  Select,
  HStack,
  VStack,
  Card,
  Badge,
  Tabs,
  createListCollection,
} from "@chakra-ui/react";
import { useCompletions } from "@/hooks/useCompletions";
import { useTasks } from "@/hooks/useTasks";
import { useColorModeSync } from "@/hooks/useColorModeSync";
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

// Color constants for Chakra UI components (used with _light/_dark syntax)
const bgColor = { _light: "white", _dark: "gray.800" };
const borderColor = { _light: "gray.200", _dark: "gray.600" };
const textColor = { _light: "gray.900", _dark: "gray.100" };
const mutedText = { _light: "gray.500", _dark: "gray.400" };
const cardBg = { _light: "white", _dark: "gray.800" };
const tableBg = { _light: "white", _dark: "gray.800" };
const tableHeaderBg = { _light: "gray.50", _dark: "gray.700" };
const tableRowHover = { _light: "gray.50", _dark: "gray.700" };

export const DashboardView = () => {
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

  // Resolved colors for Recharts (must be strings)
  const resolvedBorderColor = useMemo(() => resolveColor(borderColor, colorMode), [colorMode]);
  const resolvedMutedText = useMemo(() => resolveColor(mutedText, colorMode), [colorMode]);
  const resolvedCardBg = useMemo(() => resolveColor(cardBg, colorMode), [colorMode]);
  const resolvedTextColor = useMemo(() => resolveColor(textColor, colorMode), [colorMode]);

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
    <Box p={6} overflowY="auto" w="full" h="full" minH="100%">
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
                <Select.Root
                  collection={dateRangeCollection}
                  value={[dateRange]}
                  onValueChange={({ value }) => setDateRange(value[0])}
                  w="150px"
                >
                  <Select.Trigger bg={bgColor} borderColor={borderColor}>
                    <Select.ValueText placeholder="Select range" />
                  </Select.Trigger>
                  <Select.Content>
                    {dateRangeCollection.items.map(item => (
                      <Select.Item key={item.value} item={item}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Task Filter
                </Text>
                <Select.Root
                  collection={taskFilterCollection}
                  value={[selectedTask]}
                  onValueChange={({ value }) => setSelectedTask(value[0])}
                  w="200px"
                >
                  <Select.Trigger bg={bgColor} borderColor={borderColor}>
                    <Select.ValueText placeholder="Select task" />
                  </Select.Trigger>
                  <Select.Content>
                    {taskFilterCollection.items.map(item => (
                      <Select.Item key={item.value} item={item}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
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
                              <Select.Root
                                collection={statusCollection}
                                value={["checked"]}
                                onValueChange={({ value }) => handleStatusChange(completion, value[0])}
                                size="sm"
                                w="120px"
                              >
                                <Select.Trigger bg={bgColor} borderColor={borderColor}>
                                  <Select.ValueText />
                                </Select.Trigger>
                                <Select.Content>
                                  {statusCollection.items.map(item => (
                                    <Select.Item key={item.value} item={item}>
                                      {item.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
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
