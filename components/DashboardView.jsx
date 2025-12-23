"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Heading, Text, Table, Select, HStack, VStack, Card, Badge, Tabs } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { useCompletions } from "@/hooks/useCompletions";
import { useTasks } from "@/hooks/useTasks";
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

export const DashboardView = () => {
  const {
    completions,
    fetchCompletions,
    createCompletion,
    deleteCompletion,
    loading: completionsLoading,
  } = useCompletions();
  const { tasks, loading: tasksLoading } = useTasks();
  const [dateRange, setDateRange] = useState("30"); // days
  const [selectedTask, setSelectedTask] = useState("all");

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("white", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowHover = useColorModeValue("gray.50", "gray.700");

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
                <Select.Root value={dateRange} onValueChange={({ value }) => setDateRange(value)} w="150px">
                  <Select.Trigger bg={bgColor} borderColor={borderColor}>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item item="7">Last 7 days</Select.Item>
                    <Select.Item item="30">Last 30 days</Select.Item>
                    <Select.Item item="90">Last 90 days</Select.Item>
                    <Select.Item item="365">Last year</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Task Filter
                </Text>
                <Select.Root value={selectedTask} onValueChange={({ value }) => setSelectedTask(value)} w="200px">
                  <Select.Trigger bg={bgColor} borderColor={borderColor}>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item item="all">All Tasks</Select.Item>
                    {tasks.map(task => (
                      <Select.Item key={task.id} item={task.id}>
                        {task.title}
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
                    <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                    <XAxis dataKey="formattedDate" angle={-45} textAnchor="end" height={100} stroke={mutedText} />
                    <YAxis stroke={mutedText} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: cardBg,
                        borderColor: borderColor,
                        color: textColor,
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
                    <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                    <XAxis dataKey="formattedDate" angle={-45} textAnchor="end" height={100} stroke={mutedText} />
                    <YAxis stroke={mutedText} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: cardBg,
                        borderColor: borderColor,
                        color: textColor,
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
                                value="checked"
                                onValueChange={({ value }) => handleStatusChange(completion, value)}
                                size="sm"
                                w="120px"
                              >
                                <Select.Trigger bg={bgColor} borderColor={borderColor}>
                                  <Select.ValueText />
                                </Select.Trigger>
                                <Select.Content>
                                  <Select.Item item="checked">Checked</Select.Item>
                                  <Select.Item item="unchecked">Unchecked</Select.Item>
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
