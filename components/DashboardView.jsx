"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Select,
  HStack,
  VStack,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
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
  const { completions, fetchCompletions, loading: completionsLoading } = useCompletions();
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

  // Task completion breakdown
  const taskBreakdown = useMemo(() => {
    const breakdown = new Map();

    completions.forEach(completion => {
      const taskId = completion.taskId;
      const task = tasks.find(t => t.id === taskId);
      const taskTitle = task?.title || "Unknown Task";

      if (!breakdown.has(taskId)) {
        breakdown.set(taskId, {
          taskId,
          taskTitle,
          count: 0,
        });
      }

      breakdown.get(taskId).count += 1;
    });

    return Array.from(breakdown.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tasks
  }, [completions, tasks]);

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
          <Text color={mutedText}>
            Track your task completion history over time
          </Text>
        </Box>

        {/* Filters */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <HStack spacing={4}>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Date Range
                </Text>
                <Select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
                  w="150px"
                  bg={bgColor}
                  borderColor={borderColor}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </Select>
              </Box>
              <Box>
                <Text fontSize="sm" mb={1} color={mutedText}>
                  Task Filter
                </Text>
                <Select
                  value={selectedTask}
                  onChange={e => setSelectedTask(e.target.value)}
                  w="200px"
                  bg={bgColor}
                  borderColor={borderColor}
                >
                  <option value="all">All Tasks</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </Select>
              </Box>
            </HStack>
          </CardBody>
        </Card>

        {/* Charts */}
        <Tabs>
          <TabList>
            <Tab>Line Chart</Tab>
            <Tab>Bar Chart</Tab>
            <Tab>Table View</Tab>
          </TabList>

          <TabPanels>
            {/* Line Chart */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="md" color={textColor}>Daily Completions Over Time</Heading>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                      <XAxis
                        dataKey="formattedDate"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke={mutedText}
                      />
                      <YAxis stroke={mutedText} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: cardBg,
                          borderColor: borderColor,
                          color: textColor,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="completions"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Completions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Bar Chart */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="md" color={textColor}>Daily Completion Totals</Heading>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyTotals}>
                      <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                      <XAxis
                        dataKey="formattedDate"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke={mutedText}
                      />
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
                </CardBody>
              </Card>
            </TabPanel>

            {/* Table View */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="md" color={textColor}>Completion History Table</Heading>
                </CardHeader>
                <CardBody>
                  <TableContainer>
                    <Table variant="simple" bg={tableBg}>
                      <Thead bg={tableHeaderBg}>
                        <Tr>
                          <Th color={textColor}>Date</Th>
                          <Th color={textColor}>Task</Th>
                          <Th color={textColor}>Section</Th>
                          <Th color={textColor}>Completed At</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {completions
                          .sort(
                            (a, b) =>
                              new Date(b.date) - new Date(a.date)
                          )
                          .map(completion => {
                            const task = tasks.find(
                              t => t.id === completion.taskId
                            );
                            return (
                              <Tr
                                key={completion.id}
                                _hover={{ bg: tableRowHover }}
                              >
                                <Td color={textColor}>
                                  {new Date(completion.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </Td>
                                <Td color={textColor}>{task?.title || "Unknown Task"}</Td>
                                <Td>
                                  <Badge colorScheme="blue">
                                    {task?.section?.name || "N/A"}
                                  </Badge>
                                </Td>
                                <Td color={textColor}>
                                  {new Date(
                                    completion.createdAt
                                  ).toLocaleString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </Td>
                              </Tr>
                            );
                          })}
                        {completions.length === 0 && (
                          <Tr>
                            <Td colSpan={4} textAlign="center" py={8}>
                              <Text color={mutedText}>
                                No completions found for the selected period
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Task Statistics */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={textColor}>Task Completion Statistics</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm" bg={tableBg}>
                <Thead bg={tableHeaderBg}>
                  <Tr>
                    <Th color={textColor}>Task</Th>
                    <Th isNumeric color={textColor}>Completions</Th>
                    <Th color={textColor}>Last Completed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {taskStats.map(stat => (
                    <Tr key={stat.taskId} _hover={{ bg: tableRowHover }}>
                      <Td color={textColor}>{stat.taskTitle}</Td>
                      <Td isNumeric>
                        <Badge colorScheme="green">{stat.count}</Badge>
                      </Td>
                      <Td color={textColor}>
                        {stat.lastCompleted
                          ? stat.lastCompleted.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Never"}
                      </Td>
                    </Tr>
                  ))}
                  {taskStats.length === 0 && (
                    <Tr>
                      <Td colSpan={3} textAlign="center" py={8}>
                        <Text color={mutedText}>No statistics available</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

