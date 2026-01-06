"use client";

import { useState, useMemo, memo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { JournalDayEntry } from "./JournalDayEntry";
import { shouldShowOnDate as checkTaskShouldShowOnDate } from "@/lib/utils";
import { DateNavigation } from "./DateNavigation";

// Journal task types in display order
const JOURNAL_TYPES = [
  { tag: "yearly reflection", label: "Yearly Reflection" },
  { tag: "monthly reflection", label: "Monthly Reflection" },
  { tag: "weekly reflection", label: "Weekly Reflection" },
  { tag: "daily journal", label: "Journal" },
];

export const JournalView = memo(function JournalView({
  tasks = [],
  getCompletionForDate,
  createCompletion,
  updateCompletion,
}) {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const currentYear = dayjs().year();

  // Convert dayjs to Date for DateNavigation
  const selectedDateAsDate = useMemo(() => {
    return selectedDate.toDate();
  }, [selectedDate]);

  // Navigate dates - convert Date back to dayjs
  const handleDateChange = date => {
    setSelectedDate(dayjs(date));
  };

  const handlePrev = () => {
    setSelectedDate(d => d.subtract(1, "day"));
  };

  const handleNext = () => {
    setSelectedDate(d => d.add(1, "day"));
  };

  const handleToday = () => {
    setSelectedDate(dayjs());
  };

  // Get years to display (current year and 4 previous years)
  const years = useMemo(() => {
    const current = selectedDate.year();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, [selectedDate]);

  // Filter journal tasks (completionType: "text" + journal-related tags)
  const journalTasks = useMemo(() => {
    const journalTagNames = JOURNAL_TYPES.map(t => t.tag);
    return tasks.filter(task => {
      if (task.completionType !== "text") return false;
      return task.tags?.some(tag => {
        const tagName = (tag.name || "").toLowerCase();
        return journalTagNames.includes(tagName);
      });
    });
  }, [tasks]);

  // Group journal tasks by type
  const tasksByType = useMemo(() => {
    const grouped = {};
    JOURNAL_TYPES.forEach(type => {
      grouped[type.tag] = journalTasks.filter(task => {
        const tagNames = (task.tags || []).map(t => (t.name || "").toLowerCase());
        return tagNames.includes(type.tag);
      });
    });
    return grouped;
  }, [journalTasks]);

  // Handle saving journal entries
  const handleSaveEntry = async (taskId, date, note) => {
    // If date is already a string in YYYY-MM-DD format, use it directly
    // Otherwise, format it properly to avoid timezone issues
    const dateStr =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayjs(date).format("YYYY-MM-DD");
    const existingCompletion = getCompletionForDate?.(taskId, dateStr);

    try {
      if (existingCompletion) {
        // updateCompletion expects (taskId, date, updates)
        // For journal entries, we only update the note, not the outcome
        await updateCompletion(taskId, dateStr, { note });
      } else {
        // createCompletion expects (taskId, date, options)
        // For journal entries, we create with note only (outcome defaults to "completed" in API)
        // But we can use POST endpoint which allows note without requiring outcome validation
        await createCompletion(taskId, dateStr, {
          note,
          // Don't pass outcome - let API handle it or use a default
        });
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      // Re-throw with a more descriptive error message
      const errorMessage = error?.data?.message || error?.message || String(error);
      throw new Error(`Failed to save journal entry: ${errorMessage}`);
    }
  };

  // Check if a task should appear on a specific date for a specific year
  const shouldShowTaskOnDate = (task, date, year) => {
    // Create a date object for the target year (same month/day, different year)
    const targetDate = dayjs(date).year(year).toDate();
    return checkTaskShouldShowOnDate(task, targetDate);
  };

  // Format display date
  const displayDate = selectedDate.format("dddd, MMMM D, YYYY");

  // View options for DateNavigation (Day view only for Journal)
  const viewOptions = [{ label: "Day", value: "day" }];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Date Navigation Bar */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <DateNavigation
          selectedDate={selectedDateAsDate}
          onDateChange={handleDateChange}
          onPrevious={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          showDatePicker={true}
          showDateDisplay={true}
          showViewSelector={true}
          viewCollection={viewOptions}
          selectedView="day"
          onViewChange={() => {}} // No-op since only one view
          viewSelectorWidth={20}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 4 } }}>
        {/* Date Heading */}
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            mb: { xs: 3, md: 4 },
            fontWeight: 500,
          }}
        >
          {displayDate}
        </Typography>

        {/* Year Sections */}
        <Stack spacing={{ xs: 3, md: 4 }}>
          {years.map(year => {
            const isCurrentYear = year === currentYear;
            const yearDate = selectedDate.year(year);

            return (
              <Box key={year}>
                {/* Year Header */}
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 500,
                    color: isCurrentYear ? "text.primary" : "text.secondary",
                  }}
                >
                  {year}
                </Typography>

                {/* Journal Entries by Type */}
                {(() => {
                  // Collect all relevant tasks for this year/date
                  const allRelevantTasks = [];
                  JOURNAL_TYPES.forEach(type => {
                    const typeTasks = tasksByType[type.tag] || [];
                    const relevant = typeTasks.filter(task => shouldShowTaskOnDate(task, selectedDate, year));
                    allRelevantTasks.push(...relevant.map(task => ({ ...task, journalType: type })));
                  });

                  // If no tasks exist for this year, show placeholder
                  if (allRelevantTasks.length === 0) {
                    return (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontStyle: "italic",
                          pl: 4,
                        }}
                      >
                        No journal tasks scheduled for this day
                      </Typography>
                    );
                  }

                  // Group tasks by type and display
                  return (
                    <Stack spacing={2}>
                      {JOURNAL_TYPES.map(type => {
                        const relevantTasks = allRelevantTasks.filter(t => t.journalType.tag === type.tag);

                        if (relevantTasks.length === 0) {
                          return null; // Don't show placeholder for individual types
                        }

                        return (
                          <Stack key={type.tag} spacing={1}>
                            {relevantTasks.map(task => {
                              const dateStr = yearDate.format("YYYY-MM-DD");
                              const completion = getCompletionForDate?.(task.id, dateStr);

                              return (
                                <JournalDayEntry
                                  key={`${task.id}-${year}-${completion?.note || ""}`}
                                  task={task}
                                  date={dateStr}
                                  year={year}
                                  completion={completion}
                                  isCurrentYear={isCurrentYear}
                                  onSave={handleSaveEntry}
                                />
                              );
                            })}
                          </Stack>
                        );
                      })}
                    </Stack>
                  );
                })()}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
});

export default JournalView;
