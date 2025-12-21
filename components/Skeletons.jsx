"use client";

import { Box, Skeleton, VStack, HStack, Card, CardHeader, CardBody, useColorModeValue } from "@chakra-ui/react";

// Header skeleton
export const HeaderSkeleton = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box px={4} py={4} bg={bgColor} borderBottomWidth="1px" borderColor={borderColor}>
      <HStack spacing={3} mb={4}>
        <Skeleton w={7} h={7} borderRadius="md" />
        <Box flex={1}>
          <Skeleton h={6} w="200px" mb={2} />
          <Skeleton h={4} w="150px" />
        </Box>
        <Skeleton w={10} h={10} borderRadius="md" />
      </HStack>
      <HStack spacing={2} mb={4}>
        <Skeleton h={8} w={24} borderRadius="md" />
        <Skeleton h={8} w={24} borderRadius="md" />
        <Skeleton h={8} w={24} borderRadius="md" />
      </HStack>
      <Box>
        <HStack justify="space-between" mb={1}>
          <Skeleton h={4} w="120px" />
          <Skeleton h={4} w="60px" />
        </HStack>
        <Skeleton h={2} w="full" borderRadius="full" />
      </Box>
    </Box>
  );
};

// Section skeleton
export const SectionSkeleton = () => {
  return (
    <Card mb={4}>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Skeleton w={5} h={5} />
            <Skeleton w={5} h={5} borderRadius="md" />
            <Skeleton h={6} w="120px" />
            <Skeleton h={4} w="40px" />
          </HStack>
          <HStack spacing={1}>
            <Skeleton w={8} h={8} borderRadius="md" />
            <Skeleton w={8} h={8} borderRadius="md" />
          </HStack>
        </HStack>
      </CardHeader>
      <CardBody pt={2}>
        <VStack align="stretch" spacing={3} py={2}>
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </VStack>
      </CardBody>
    </Card>
  );
};

// Task skeleton
export const TaskSkeleton = () => {
  return (
    <Box borderRadius="lg" borderWidth="1px" p={3}>
      <HStack spacing={2}>
        <Skeleton w={4} h={4} />
        <Skeleton w={4} h={4} />
        <Skeleton w={3} h={3} borderRadius="full" />
        <Skeleton h={5} flex={1} />
        <Skeleton w={8} h={8} borderRadius="md" />
        <Skeleton w={8} h={8} borderRadius="md" />
        <Skeleton w={8} h={8} borderRadius="md" />
      </HStack>
    </Box>
  );
};

// Backlog skeleton
export const BacklogSkeleton = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box h="100%" display="flex" flexDirection="column" bg={bgColor}>
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <HStack justify="space-between" mb={2}>
          <Skeleton h={6} w="100px" />
          <HStack spacing={2}>
            <Skeleton w={8} h={8} borderRadius="md" />
            <Skeleton w={8} h={8} borderRadius="md" />
          </HStack>
        </HStack>
        <Skeleton h={5} w="80px" borderRadius="md" />
      </Box>
      <Box flex={1} overflowY="auto" p={2}>
        <VStack align="stretch" spacing={2} px={2}>
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </VStack>
      </Box>
    </Box>
  );
};

// Calendar skeleton
export const CalendarSkeleton = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box flex={1} display="flex" flexDirection="column">
      <HStack spacing={2} mb={3} px={2}>
        <Skeleton h={8} w={16} borderRadius="md" />
        <Skeleton w={10} h={10} borderRadius="md" />
        <Skeleton w={10} h={10} borderRadius="md" />
        <Skeleton h={5} w="120px" />
        <Skeleton h={8} w={24} borderRadius="md" />
      </HStack>
      <Card flex={1} minH="600px" bg={bgColor} borderColor={borderColor}>
        <CardBody p={0} h="full">
          <Box h="full" position="relative">
            {/* Day header skeleton */}
            <Box textAlign="center" py={3} borderBottomWidth="1px" borderColor={borderColor}>
              <Skeleton h={8} w="40px" mx="auto" mb={2} />
              <Skeleton h={4} w="150px" mx="auto" />
            </Box>
            {/* Calendar grid skeleton */}
            <Box p={4}>
              <VStack align="stretch" spacing={2}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} h={12} w="full" borderRadius="md" />
                ))}
              </VStack>
            </Box>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
};

// Full page skeleton (for initial load)
export const PageSkeleton = ({ showBacklog = true, showDashboard = true, showCalendar = true }) => {
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" bg={bgColor}>
      {/* Header */}
      <Box as="header" borderBottomWidth="1px" borderColor={borderColor} flexShrink={0}>
        <HeaderSkeleton />
      </Box>

      {/* Main content */}
      <Box as="main" flex={1} overflow="hidden" display="flex">
        {/* Backlog skeleton */}
        {showBacklog && (
          <Box w="500px" h="100%" borderRightWidth="1px" borderColor={borderColor} flexShrink={0}>
            <BacklogSkeleton />
          </Box>
        )}

        {/* Main content area */}
        <Box flex={1} overflowY="auto" px={4} py={6}>
          <Box display="flex" gap={6} h="full">
            {/* Dashboard skeleton */}
            {showDashboard && (
              <Box flex={1} minW={0}>
                <VStack align="stretch" spacing={4}>
                  <SectionSkeleton />
                  <SectionSkeleton />
                  <SectionSkeleton />
                </VStack>
              </Box>
            )}

            {/* Calendar skeleton */}
            {showCalendar && (
              <Box flex={1} minW={0} display="flex" flexDirection="column">
                <CalendarSkeleton />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
