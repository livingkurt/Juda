"use client";

import { useState, useMemo, memo } from "react";
import { Box, CircularProgress, Button, Stack } from "@mui/material";
import { Add } from "@mui/icons-material";
import dayjs from "dayjs";
import { shouldShowOnDate as checkTaskShouldShowOnDate } from "@/lib/utils";
import { DateNavigation } from "@/components/DateNavigation";
import { JournalDayView } from "@/components/JournalDayView";
import { JournalWeekView } from "@/components/JournalWeekView";
import { JournalMonthView } from "@/components/JournalMonthView";
import { JournalYearView } from "@/components/JournalYearView";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useCreateCompletionMutation, useUpdateCompletionMutation } from "@/lib/store/api/completionsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export const JournalTab = memo(function JournalTab({ isLoading: tabLoading }) {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [currentView, setCurrentView] = useState("day");

  // Get data from Redux
  const { data: tasks = [] } = useGetTasksQuery();
  const { getCompletionForDate } = useCompletionHelpers();
  const { handleEditTask } = useTaskOperations();

  // Mutations
  const [createCompletionMutation] = useCreateCompletionMutation();
  const [updateCompletionMutation] = useUpdateCompletionMutation();

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
    if (currentView === "day") {
      setSelectedDate(d => d.subtract(1, "day"));
    } else if (currentView === "week") {
      setSelectedDate(d => d.subtract(1, "week"));
    } else if (currentView === "month") {
      setSelectedDate(d => d.subtract(1, "month"));
    } else if (currentView === "year") {
      setSelectedDate(d => d.subtract(1, "year"));
    }
  };

  const handleNext = () => {
    if (currentView === "day") {
      setSelectedDate(d => d.add(1, "day"));
    } else if (currentView === "week") {
      setSelectedDate(d => d.add(1, "week"));
    } else if (currentView === "month") {
      setSelectedDate(d => d.add(1, "month"));
    } else if (currentView === "year") {
      setSelectedDate(d => d.add(1, "year"));
    }
  };

  const handleToday = () => {
    setSelectedDate(dayjs());
  };

  // Get years to display (current year and 4 previous years)
  const years = useMemo(() => {
    const current = selectedDate.year();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, [selectedDate]);

  // Filter all text input tasks (no tag filtering)
  const journalTasks = useMemo(() => {
    return tasks.filter(task => task.completionType === "text");
  }, [tasks]);

  // Handle saving journal entries
  const handleSaveEntry = async (taskId, date, note) => {
    // If date is already a string in YYYY-MM-DD format, use it directly
    // Otherwise, format it properly to avoid timezone issues
    const dateStr =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayjs(date).format("YYYY-MM-DD");
    const existingCompletion = getCompletionForDate?.(taskId, dateStr);

    try {
      if (existingCompletion) {
        await updateCompletionMutation({ id: existingCompletion.id, taskId, date: dateStr, note }).unwrap();
      } else {
        await createCompletionMutation({ taskId, date: dateStr, note }).unwrap();
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      const errorMessage = error?.data?.message || error?.message || String(error);
      throw new Error(`Failed to save journal entry: ${errorMessage}`);
    }
  };

  // Check if a task should appear on a specific date for a specific year
  // For journal entries, show if either:
  // 1. The recurrence pattern matches the date, OR
  // 2. There's a completion entry for that date (allows flexibility for journal entries)
  const shouldShowTaskOnDate = (task, date, year) => {
    const targetDate = dayjs(date).year(year).toDate();
    const dateStr = dayjs(date).year(year).format("YYYY-MM-DD");

    // Check if recurrence pattern matches
    const matchesRecurrence = checkTaskShouldShowOnDate(task, targetDate);

    // For journal entries, also check if there's a completion for this date
    // This allows yearly reflections to show on the date they were written, not just the scheduled date
    const completion = getCompletionForDate?.(task.id, dateStr);
    const hasCompletion = completion?.note && completion.note.trim().length > 0;

    return matchesRecurrence || hasCompletion;
  };

  // View options for DateNavigation
  const viewOptions = [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ];

  // Handle creating a new journal entry
  const handleNewJournalEntry = () => {
    // Create a temporary task object with completionType: "text" to pre-fill the dialog
    const newJournalTask = {
      completionType: "text",
      title: "",
    };
    handleEditTask(newJournalTask);
  };

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

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
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1 }}>
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
              selectedView={currentView}
              onViewChange={setCurrentView}
              viewSelectorWidth="100px"
            />
          </Box>
        </Stack>
      </Box>

      {/* Content */}
      {currentView === "day" && (
        <JournalDayView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
        />
      )}
      {currentView === "week" && (
        <JournalWeekView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
        />
      )}
      {currentView === "month" && (
        <JournalMonthView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
        />
      )}
      {currentView === "year" && (
        <JournalYearView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
        />
      )}
    </Box>
  );
});
