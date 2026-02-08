"use client";

import { useEffect, useMemo, memo, useState, useDeferredValue } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, CircularProgress, Stack } from "@mui/material";
import dayjs from "dayjs";
import { shouldShowOnDate as checkTaskShouldShowOnDate } from "@/lib/utils";
import { DateNavigation } from "@/components/DateNavigation";
import { JournalDayView } from "@/components/JournalDayView";
import { JournalWeekView } from "@/components/JournalWeekView";
import { JournalMonthView } from "@/components/JournalMonthView";
import { JournalYearView } from "@/components/JournalYearView";
import { JournalFilterMenu } from "@/components/JournalFilterMenu";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useCreateCompletionMutation, useUpdateCompletionMutation } from "@/lib/store/api/completionsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { setJournalView, setJournalSelectedDate } from "@/lib/store/slices/uiSlice";
import { useTaskLookups } from "@/hooks/useTaskLookups";

export const JournalTab = memo(function JournalTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();

  // Get state from Redux (synced with URL)
  const journalView = useSelector(state => state.ui.journalView || "day");
  const journalSelectedDateISO = useSelector(state => state.ui.journalSelectedDate);

  // Convert ISO string to dayjs object
  const selectedDate = useMemo(() => {
    if (journalSelectedDateISO) {
      return dayjs(journalSelectedDateISO);
    }
    return dayjs();
  }, [journalSelectedDateISO]);

  // Get recurring tasks only (much faster - pre-filtered by API)
  const { data: tasks = [] } = useRecurringTasks();
  const { getCompletionForDate } = useCompletionHelpers();
  const { handleEditTask } = useTaskOperations();

  // Mutations
  const [createCompletionMutation] = useCreateCompletionMutation();
  const [updateCompletionMutation] = useUpdateCompletionMutation();

  // Filter state
  const [selectedCompletionTypes, setSelectedCompletionTypes] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const deferredCompletionTypes = useDeferredValue(selectedCompletionTypes);
  const deferredSelectedTaskIds = useDeferredValue(selectedTaskIds);

  const currentYear = dayjs().year();

  // Initialize Redux state from URL on mount if not set
  useEffect(() => {
    if (!journalSelectedDateISO) {
      dispatch(setJournalSelectedDate(dayjs().toISOString()));
    }
  }, [dispatch, journalSelectedDateISO]);

  // Convert dayjs to Date for DateNavigation
  const selectedDateAsDate = useMemo(() => {
    return selectedDate.toDate();
  }, [selectedDate]);

  // Navigate dates - update Redux state
  const handleDateChange = date => {
    dispatch(setJournalSelectedDate(dayjs(date).toISOString()));
  };

  const handlePrev = () => {
    let newDate;
    if (journalView === "day") {
      newDate = selectedDate.subtract(1, "day");
    } else if (journalView === "week") {
      newDate = selectedDate.subtract(1, "week");
    } else if (journalView === "month") {
      newDate = selectedDate.subtract(1, "month");
    } else if (journalView === "year") {
      newDate = selectedDate.subtract(1, "year");
    } else {
      newDate = selectedDate.subtract(1, "day");
    }
    dispatch(setJournalSelectedDate(newDate.toISOString()));
  };

  const handleNext = () => {
    let newDate;
    if (journalView === "day") {
      newDate = selectedDate.add(1, "day");
    } else if (journalView === "week") {
      newDate = selectedDate.add(1, "week");
    } else if (journalView === "month") {
      newDate = selectedDate.add(1, "month");
    } else if (journalView === "year") {
      newDate = selectedDate.add(1, "year");
    } else {
      newDate = selectedDate.add(1, "day");
    }
    dispatch(setJournalSelectedDate(newDate.toISOString()));
  };

  const handleToday = () => {
    dispatch(setJournalSelectedDate(dayjs().toISOString()));
  };

  // Handle view change - update Redux state
  const handleViewChange = newView => {
    dispatch(setJournalView(newView));
  };

  // Get years to display (current year and 4 previous years)
  const years = useMemo(() => {
    const current = selectedDate.year();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, [selectedDate]);

  // Filter text input, selection, and reflection tasks
  const allJournalTasks = useMemo(() => {
    return tasks.filter(
      task =>
        task.completionType === "text" || task.completionType === "selection" || task.completionType === "reflection"
    );
  }, [tasks]);
  const { taskById } = useTaskLookups({ tasks: allJournalTasks });

  // Apply filters to journal tasks
  const journalTasks = useMemo(() => {
    let filtered = allJournalTasks;

    // Filter by completion type
    if (deferredCompletionTypes.length > 0) {
      filtered = filtered.filter(task => deferredCompletionTypes.includes(task.completionType));
    }

    // Filter by specific task IDs
    if (deferredSelectedTaskIds.length > 0) {
      filtered = filtered.filter(task => deferredSelectedTaskIds.includes(task.id));
    }

    return filtered;
  }, [allJournalTasks, deferredCompletionTypes, deferredSelectedTaskIds]);

  // Filter handlers
  const handleCompletionTypeSelect = type => {
    setSelectedCompletionTypes(prev => [...prev, type]);
  };

  const handleCompletionTypeDeselect = type => {
    setSelectedCompletionTypes(prev => prev.filter(t => t !== type));
  };

  const handleTaskSelect = taskId => {
    setSelectedTaskIds(prev => [...prev, taskId]);
  };

  const handleTaskDeselect = taskId => {
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  // Handle saving journal entries
  const handleSaveEntry = async (taskId, date, noteOrOptions) => {
    // If date is already a string in YYYY-MM-DD format, use it directly
    // Otherwise, format it properly to avoid timezone issues
    const dateStr =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayjs(date).format("YYYY-MM-DD");
    const existingCompletion = getCompletionForDate?.(taskId, dateStr);

    // Determine if this is a selection task with multiple options
    const task = taskById.get(taskId);
    const isSelectionTask = task?.completionType === "selection";
    const isArray = Array.isArray(noteOrOptions);

    const completionData = {};
    if (isSelectionTask && isArray) {
      // For selection tasks, save to selectedOptions field
      completionData.selectedOptions = noteOrOptions;
    } else if (isArray) {
      // If array but not selection task, join as string for backward compatibility
      completionData.note = noteOrOptions.join(", ");
    } else {
      // Single value - save to note field
      completionData.note = noteOrOptions;
    }

    try {
      if (existingCompletion) {
        await updateCompletionMutation({
          id: existingCompletion.id,
          taskId,
          date: dateStr,
          ...completionData,
        }).unwrap();
      } else {
        await createCompletionMutation({ taskId, date: dateStr, ...completionData }).unwrap();
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
              selectedView={journalView}
              onViewChange={handleViewChange}
              viewSelectorWidth="100px"
            />
          </Box>
        </Stack>
      </Box>

      {/* Content */}
      {journalView === "day" && (
        <JournalDayView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          allJournalTasks={allJournalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
          filterMenu={
            <JournalFilterMenu
              journalTasks={allJournalTasks}
              selectedCompletionTypes={selectedCompletionTypes}
              onCompletionTypeSelect={handleCompletionTypeSelect}
              onCompletionTypeDeselect={handleCompletionTypeDeselect}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={handleTaskSelect}
              onTaskDeselect={handleTaskDeselect}
            />
          }
        />
      )}
      {journalView === "week" && (
        <JournalWeekView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          allJournalTasks={allJournalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
          filterMenu={
            <JournalFilterMenu
              journalTasks={allJournalTasks}
              selectedCompletionTypes={selectedCompletionTypes}
              onCompletionTypeSelect={handleCompletionTypeSelect}
              onCompletionTypeDeselect={handleCompletionTypeDeselect}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={handleTaskSelect}
              onTaskDeselect={handleTaskDeselect}
            />
          }
        />
      )}
      {journalView === "month" && (
        <JournalMonthView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          allJournalTasks={allJournalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
          filterMenu={
            <JournalFilterMenu
              journalTasks={allJournalTasks}
              selectedCompletionTypes={selectedCompletionTypes}
              onCompletionTypeSelect={handleCompletionTypeSelect}
              onCompletionTypeDeselect={handleCompletionTypeDeselect}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={handleTaskSelect}
              onTaskDeselect={handleTaskDeselect}
            />
          }
        />
      )}
      {journalView === "year" && (
        <JournalYearView
          selectedDate={selectedDate}
          years={years}
          journalTasks={journalTasks}
          allJournalTasks={allJournalTasks}
          currentYear={currentYear}
          getCompletionForDate={getCompletionForDate}
          shouldShowTaskOnDate={shouldShowTaskOnDate}
          onSaveEntry={handleSaveEntry}
          onNewJournalEntry={handleNewJournalEntry}
          filterMenu={
            <JournalFilterMenu
              journalTasks={allJournalTasks}
              selectedCompletionTypes={selectedCompletionTypes}
              onCompletionTypeSelect={handleCompletionTypeSelect}
              onCompletionTypeDeselect={handleCompletionTypeDeselect}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={handleTaskSelect}
              onTaskDeselect={handleTaskDeselect}
            />
          }
        />
      )}
    </Box>
  );
});
