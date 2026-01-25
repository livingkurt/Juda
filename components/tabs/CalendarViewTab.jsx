"use client";

import { Box, Stack, Typography, Button, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility as Eye, VisibilityOff as EyeOff, Repeat, Close as X, ZoomIn, ZoomOut } from "@mui/icons-material";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { BacklogFilterMenu } from "@/components/BacklogFilterMenu";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { CalendarYearView } from "@/components/CalendarYearView";
import { useViewState } from "@/hooks/useViewState";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { createDroppableId, createDraggableId } from "@/lib/dragHelpers";

const calendarViews = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export function CalendarViewTab({ isLoading, dropTimeRef }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Get view state
  const {
    selectedDate,
    setSelectedDate,
    navigateCalendar,
    calendarView,
    setCalendarView,
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    handleCalendarTagSelect,
    handleCalendarTagDeselect,
  } = useViewState();

  // Get preferences
  const { preferences, updatePreference } = usePreferencesContext();
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar;
  const showRecurringTasks = preferences.showRecurringTasks;
  const calendarZoom = preferences.calendarZoom;

  // Setter functions for preferences
  const setShowCompletedTasksCalendar = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showCompletedTasksCalendar);
      updatePreference("showCompletedTasksCalendar", newValue);
    } else {
      updatePreference("showCompletedTasksCalendar", updater);
    }
  };

  const setShowRecurringTasks = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showRecurringTasks);
      updatePreference("showRecurringTasks", newValue);
    } else {
      updatePreference("showRecurringTasks", updater);
    }
  };

  const setCalendarZoom = updater => {
    if (typeof updater === "function") {
      const newZoom = updater(calendarZoom);
      updatePreference("calendarZoom", newZoom);
    } else {
      updatePreference("calendarZoom", updater);
    }
  };

  // Get tasks and tags from API
  const { data: tasks = [], isLoading: tasksLoading } = useGetTasksQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  const createTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };

  // Get completion helpers
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Combine loading states
  const isActuallyLoading = isLoading || tasksLoading;
  // Filter tasks based on recurring preference for current view
  let filteredTasks = showRecurringTasks[calendarView]
    ? tasks
    : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

  // Filter by search term
  if (calendarSearchTerm.trim()) {
    const lowerSearch = calendarSearchTerm.toLowerCase();
    filteredTasks = filteredTasks.filter(task => task.title.toLowerCase().includes(lowerSearch));
  }

  // Filter by tags
  if (calendarSelectedTagIds.length > 0) {
    filteredTasks = filteredTasks.filter(task => task.tags?.some(tag => calendarSelectedTagIds.includes(tag.id)));
  }

  // Filter tasks based on completed preference for current view
  if (!showCompletedTasksCalendar[calendarView] && calendarView === "day" && selectedDate) {
    filteredTasks = filteredTasks.filter(task => {
      const isCompleted = isCompletedOnDate(task.id, selectedDate);
      const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, selectedDate) : null;
      const hasOutcome = outcome !== null && outcome !== undefined;
      return !isCompleted && !hasOutcome;
    });
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        width: "auto",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        p: isMobile ? 1 : { xs: 1, md: 2 },
      }}
    >
      {/* Calendar Header */}
      <Box
        sx={{
          mb: 2,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
            maxWidth: "100%",
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            Calendar
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                onClick={() => {
                  setCalendarZoom(prev => ({
                    ...prev,
                    [calendarView]: Math.max(0.25, prev[calendarView] - 0.25),
                  }));
                }}
                aria-label="Zoom Out"
                disabled={calendarZoom[calendarView] <= 0.25}
                sx={{
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  "&:hover": { color: "text.primary" },
                }}
              >
                <ZoomOut fontSize="small" />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  minWidth: "40px",
                  textAlign: "center",
                }}
              >
                {Math.round(calendarZoom[calendarView] * 100)}%
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setCalendarZoom(prev => ({
                    ...prev,
                    [calendarView]: Math.min(3.0, prev[calendarView] + 0.25),
                  }));
                }}
                aria-label="Zoom In"
                disabled={calendarZoom[calendarView] >= 3.0}
                sx={{
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  "&:hover": { color: "text.primary" },
                }}
              >
                <ZoomIn fontSize="small" />
              </IconButton>
            </Stack>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setShowCompletedTasksCalendar(prev => ({
                  ...prev,
                  [calendarView]: !prev[calendarView],
                }));
              }}
              sx={{
                fontSize: "0.875rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {showCompletedTasksCalendar[calendarView] ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                {showCompletedTasksCalendar[calendarView] ? "Hide Completed" : "Show Completed"}
              </Box>
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setShowRecurringTasks(prev => ({
                  ...prev,
                  [calendarView]: !prev[calendarView],
                }));
              }}
              sx={{
                fontSize: "0.875rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {showRecurringTasks[calendarView] ? <Repeat fontSize="small" /> : <X fontSize="small" />}
                {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
              </Box>
            </Button>
          </Stack>
        </Box>
        {/* Calendar Controls */}
        <Box sx={{ mb: 2 }}>
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={date => {
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);
              setSelectedDate(d);
            }}
            onPrevious={() => navigateCalendar(-1)}
            onNext={() => navigateCalendar(1)}
            onToday={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setSelectedDate(today);
            }}
            showDatePicker={true}
            showDateDisplay={true}
            showViewSelector={true}
            viewCollection={calendarViews}
            selectedView={calendarView}
            onViewChange={value => setCalendarView(value)}
            viewSelectorWidth="150px"
          />
        </Box>
        {/* Search and Tag Filter */}
        <Box sx={{ width: "100%", maxWidth: "100%", px: isMobile ? 2 : 0 }}>
          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2 }}
            alignItems="center"
            sx={{ width: "100%", maxWidth: "100%" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
            </Box>
            <BacklogFilterMenu
              tags={tags}
              selectedTagIds={calendarSelectedTagIds}
              onTagSelect={handleCalendarTagSelect}
              onTagDeselect={handleCalendarTagDeselect}
              onCreateTag={createTag}
              showPriorityFilter={false}
              showSort={false}
              showUntaggedOption={false}
            />
          </Stack>
        </Box>
      </Box>
      {isActuallyLoading && !selectedDate ? (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}></Box>
      ) : (
        <>
          {/* Calendar content */}
          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              height: "100%",
            }}
          >
            {calendarView === "day" && selectedDate && (
              <CalendarDayView
                date={selectedDate}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                onDropTimeChange={time => {
                  // eslint-disable-next-line no-param-reassign
                  dropTimeRef.current = time;
                }}
              />
            )}
            {calendarView === "week" && selectedDate && (
              <CalendarWeekView
                date={selectedDate}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                onDropTimeChange={time => {
                  // eslint-disable-next-line no-param-reassign
                  dropTimeRef.current = time;
                }}
              />
            )}
            {calendarView === "month" && selectedDate && <CalendarMonthView date={selectedDate} />}
            {calendarView === "year" && selectedDate && (
              <CalendarYearView
                date={selectedDate}
                tasks={filteredTasks}
                onDayClick={d => {
                  setSelectedDate(d);
                  setCalendarView("day");
                }}
                isCompletedOnDate={isCompletedOnDate}
                getOutcomeOnDate={getOutcomeOnDate}
                showCompleted={showCompletedTasksCalendar.year}
                zoom={calendarZoom.year}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
