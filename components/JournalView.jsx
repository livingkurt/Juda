"use client";

import { useMemo } from "react";
import { Box, VStack, Heading, Text, createListCollection } from "@chakra-ui/react";
import { BookOpen } from "lucide-react";
import { DateNavigation } from "./DateNavigation";
import { JournalDayEntry } from "./JournalDayEntry";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useSelector, useDispatch } from "react-redux";
import { setJournalView, setJournalSelectedDate } from "@/lib/store/slices/uiSlice";
import { shouldShowOnDate } from "@/lib/utils";
import { useMobileDetection } from "@/hooks/useMobileDetection";

// Define journal-related tag names (case-insensitive matching)
const JOURNAL_TAG_NAMES = ["daily journal", "yearly reflection", "monthly reflection", "weekly reflection"];

export const JournalView = ({
  tasks,
  tags: _tags,
  getCompletionForDate,
  createCompletion,
  updateCompletion,
  deleteCompletion,
}) => {
  const dispatch = useDispatch();
  const journalView = useSelector(state => state.ui.journalView);
  const journalSelectedDateISO = useSelector(state => state.ui.journalSelectedDate);
  const { mode } = useSemanticColors();
  const isMobile = useMobileDetection();

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

  // Helper to get the journal type for a task (for ordering and styling)
  const getJournalType = task => {
    const tagNames = (task.tags || []).map(t => (t.name || "").toLowerCase());

    if (tagNames.includes("yearly reflection")) return "yearly";
    if (tagNames.includes("monthly reflection")) return "monthly";
    if (tagNames.includes("weekly reflection")) return "weekly";
    if (tagNames.includes("daily journal")) return "daily";
    return "daily"; // fallback
  };

  // Sort order priority (for display within each year)
  const JOURNAL_TYPE_ORDER = {
    yearly: 0,
    monthly: 1,
    weekly: 2,
    daily: 3,
  };

  // Filter journal tasks (completionType: "text" + any journal-related tag)
  const journalTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.completionType !== "text") return false;

      // Check if task has any journal-related tag
      return task.tags?.some(tag => {
        const tagName = (tag.name || "").toLowerCase();
        return JOURNAL_TAG_NAMES.includes(tagName);
      });
    });
  }, [tasks]);

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
              Create a task with completion type &quot;text&quot; and add one of these tags: &quot;Daily Journal&quot;,
              &quot;Weekly Reflection&quot;, &quot;Monthly Reflection&quot;, or &quot;Yearly Reflection&quot;
            </Text>
          </VStack>
        </Box>
      );
    }

    return (
      <VStack align="stretch" spacing={{ base: 8, md: 6 }}>
        {years.map(year => {
          const yearDate = new Date(selectedDate);
          yearDate.setFullYear(year);
          yearDate.setHours(0, 0, 0, 0);

          return (
            <Box key={year}>
              <Heading size={{ base: "lg", md: "md" }} mb={{ base: 3, md: 4 }} color={textColor} fontWeight="bold">
                {year}
              </Heading>
              {journalTasks
                .filter(task => shouldShowOnDate(task, yearDate))
                .sort((a, b) => {
                  const typeA = getJournalType(a);
                  const typeB = getJournalType(b);
                  return JOURNAL_TYPE_ORDER[typeA] - JOURNAL_TYPE_ORDER[typeB];
                })
                .map(task => {
                  const completion = getCompletionForDate(task.id, yearDate);
                  const isCurrentYear = year === currentYear;
                  const journalType = getJournalType(task);

                  return (
                    <JournalDayEntry
                      key={`${task.id}-${year}`}
                      task={task}
                      date={yearDate}
                      year={year}
                      completion={completion}
                      isCurrentYear={isCurrentYear}
                      journalType={journalType}
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
      <Box p={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor={mode.border.default} flexShrink={0}>
        <VStack align="stretch" spacing={3}>
          {/* Date Navigation Controls */}
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            showDatePicker={true}
            showDateDisplay={false}
            twoRowLayout={isMobile}
            showViewSelector={true}
            viewCollection={viewCollection}
            selectedView={journalView}
            onViewChange={value => dispatch(setJournalView(value))}
            viewSelectorWidth={24}
          />
        </VStack>
      </Box>

      {/* Content Area */}
      <Box
        flex={1}
        overflowY="auto"
        p={{ base: 3, md: 4 }}
        css={{
          // Improve scroll behavior on mobile
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        {/* Large Date Display */}
        <Box textAlign="center" py={2}>
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color={textColor}>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Box>
        {journalView === "day" && renderDayView()}
        {journalView === "week" && renderWeekView()}
        {journalView === "month" && renderMonthView()}
        {journalView === "year" && renderYearView()}
      </Box>
    </Box>
  );
};
