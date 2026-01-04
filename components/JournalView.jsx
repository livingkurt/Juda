"use client";

import { useMemo } from "react";
import { Box, VStack, Heading, Text, Select, Portal, createListCollection } from "@chakra-ui/react";
import { BookOpen } from "lucide-react";
import { DateNavigation } from "./DateNavigation";
import { JournalDayEntry } from "./JournalDayEntry";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useSelector, useDispatch } from "react-redux";
import { setJournalView, setJournalSelectedDate } from "@/lib/store/slices/uiSlice";
import { shouldShowOnDate } from "@/lib/utils";

export const JournalView = ({
  tasks,
  tags,
  getCompletionForDate,
  createCompletion,
  updateCompletion,
  deleteCompletion,
}) => {
  const dispatch = useDispatch();
  const journalView = useSelector(state => state.ui.journalView);
  const journalSelectedDateISO = useSelector(state => state.ui.journalSelectedDate);
  const { mode } = useSemanticColors();

  // Parse selected date from ISO string (avoid hydration issues by checking window)
  const selectedDate = useMemo(() => {
    if (typeof window === "undefined") {
      // SSR: return a stable date
      return new Date("2025-01-01T00:00:00.000Z");
    }
    if (!journalSelectedDateISO) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
    const date = new Date(journalSelectedDateISO);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [journalSelectedDateISO]);

  // Filter journal tasks (completionType: "text" + "Journal" tag)
  const journalTasks = useMemo(() => {
    const journalTag = tags.find(t => t.name.toLowerCase() === "journal");
    if (!journalTag) return [];

    return tasks.filter(
      task =>
        task.completionType === "text" &&
        task.tags?.some(tag => tag.id === journalTag.id || tag.name?.toLowerCase() === "journal")
    );
  }, [tasks, tags]);

  // Get entries for the selected date across all years (5-year journal)
  const currentYear = useMemo(() => {
    if (typeof window === "undefined") return 2025; // SSR fallback
    return new Date().getFullYear();
  }, []);
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4],
    [currentYear]
  );

  const handleDateChange = date => {
    const d = date instanceof Date ? date : new Date(date);
    d.setHours(0, 0, 0, 0);
    // Convert to ISO string for Redux (must be serializable)
    dispatch(setJournalSelectedDate(d.toISOString()));
  };

  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    handleDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    handleDateChange(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    handleDateChange(today);
  };

  const handleSave = async (taskId, date, note) => {
    const completion = getCompletionForDate(taskId, date);
    if (completion) {
      await updateCompletion(taskId, date, { note, outcome: "completed" });
    } else {
      await createCompletion(taskId, date, { note, outcome: "completed" });
    }
  };

  const handleDelete = async (taskId, date) => {
    await deleteCompletion(taskId, date);
  };

  const viewCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Day", value: "day" },
          { label: "Week", value: "week" },
          { label: "Month", value: "month" },
          { label: "Year", value: "year" },
        ],
      }),
    []
  );

  const bgColor = mode.bg.canvas;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;

  // Day View - show entries grouped by year
  const renderDayView = () => {
    if (journalTasks.length === 0) {
      return (
        <Box p={8} textAlign="center">
          <VStack spacing={4}>
            <Box as={BookOpen} size={48} color={mutedText} />
            <Text color={mutedText}>No journal tasks found</Text>
            <Text fontSize="sm" color={mutedText}>
              Create a task with completion type &quot;text&quot; and add the &quot;Journal&quot; tag to get started.
            </Text>
          </VStack>
        </Box>
      );
    }

    return (
      <VStack align="stretch" spacing={6}>
        {years.map(year => {
          const yearDate = new Date(selectedDate);
          yearDate.setFullYear(year);
          yearDate.setHours(0, 0, 0, 0);

          return (
            <Box key={year}>
              <Heading size="md" mb={4} color={textColor}>
                {year}
              </Heading>
              {journalTasks
                .filter(task => shouldShowOnDate(task, yearDate))
                .map(task => {
                  const completion = getCompletionForDate(task.id, yearDate);
                  const isCurrentYear = year === currentYear;

                  return (
                    <JournalDayEntry
                      key={`${task.id}-${year}-${completion?.note || "empty"}`}
                      task={task}
                      date={yearDate}
                      year={year}
                      completion={completion}
                      isCurrentYear={isCurrentYear}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  );
                })}
              {journalTasks.filter(task => shouldShowOnDate(task, yearDate)).length === 0 && (
                <Text fontSize="sm" color={mutedText} fontStyle="italic" mb={4}>
                  No journal tasks scheduled for this day
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>
    );
  };

  // Week/Month/Year views - placeholder for now
  const renderWeekView = () => {
    return (
      <Box p={8} textAlign="center">
        <Text color={mutedText}>Week view coming soon</Text>
      </Box>
    );
  };

  const renderMonthView = () => {
    return (
      <Box p={8} textAlign="center">
        <Text color={mutedText}>Month view coming soon</Text>
      </Box>
    );
  };

  const renderYearView = () => {
    return (
      <Box p={8} textAlign="center">
        <Text color={mutedText}>Year view coming soon</Text>
      </Box>
    );
  };

  return (
    <Box h="100%" overflow="hidden" display="flex" flexDirection="column" bg={bgColor}>
      {/* Header with Date Navigation */}
      <Box p={{ base: 2, md: 4 }} borderBottomWidth="1px" borderColor={mode.border.default} flexShrink={0}>
        <DateNavigation
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          title={selectedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
          showDatePicker={true}
          showDateDisplay={true}
          rightContent={
            <Select.Root
              collection={viewCollection}
              value={[journalView]}
              onValueChange={({ value }) => dispatch(setJournalView(value[0]))}
              size="sm"
              w={24}
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="View" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {viewCollection.items.map(item => (
                      <Select.Item item={item} key={item.value}>
                        {item.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          }
        />
      </Box>

      {/* Content Area */}
      <Box flex={1} overflowY="auto" p={{ base: 2, md: 4 }}>
        {journalView === "day" && renderDayView()}
        {journalView === "week" && renderWeekView()}
        {journalView === "month" && renderMonthView()}
        {journalView === "year" && renderYearView()}
      </Box>
    </Box>
  );
};
