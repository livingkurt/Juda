"use client";

import { useEffect, useMemo, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isLeapYear from "dayjs/plugin/isLeapYear";
import { DateNavigation } from "@/components/DateNavigation";
import {
  setProgressView,
  setProgressSelectedDate,
  setMainTabIndex,
  setTodayViewDate,
} from "@/lib/store/slices/uiSlice";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { shouldShowOnDate as checkTaskShouldShowOnDate } from "@/lib/utils";

dayjs.extend(isoWeek);
dayjs.extend(isLeapYear);

export const ProgressTab = memo(function ProgressTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();

  // Get state from Redux (synced with URL)
  const progressView = useSelector(state => state.ui.progressView || "daily");
  const progressSelectedDateISO = useSelector(state => state.ui.progressSelectedDate);

  // Convert ISO string to dayjs object
  const selectedDate = useMemo(() => {
    if (progressSelectedDateISO) {
      return dayjs(progressSelectedDateISO);
    }
    return dayjs();
  }, [progressSelectedDateISO]);

  // Get recurring tasks only (much faster - pre-filtered by API)
  const { data: tasks = [] } = useRecurringTasks();
  const { getCompletionForDate } = useCompletionHelpers();

  // Initialize Redux state from URL on mount if not set
  useEffect(() => {
    if (!progressSelectedDateISO) {
      dispatch(setProgressSelectedDate(dayjs().toISOString()));
    }
  }, [dispatch, progressSelectedDateISO]);

  // Convert dayjs to Date for DateNavigation
  const selectedDateAsDate = useMemo(() => {
    return selectedDate.toDate();
  }, [selectedDate]);

  // Navigate dates - update Redux state
  const handleDateChange = date => {
    dispatch(setProgressSelectedDate(dayjs(date).toISOString()));
  };

  const handlePrev = () => {
    let newDate;
    if (progressView === "daily") {
      newDate = selectedDate.subtract(1, "day");
    } else if (progressView === "weekly") {
      newDate = selectedDate.subtract(1, "week");
    } else if (progressView === "monthly") {
      newDate = selectedDate.subtract(1, "month");
    } else if (progressView === "yearly") {
      newDate = selectedDate.subtract(1, "year");
    } else {
      newDate = selectedDate.subtract(1, "day");
    }
    dispatch(setProgressSelectedDate(newDate.toISOString()));
  };

  const handleNext = () => {
    let newDate;
    if (progressView === "daily") {
      newDate = selectedDate.add(1, "day");
    } else if (progressView === "weekly") {
      newDate = selectedDate.add(1, "week");
    } else if (progressView === "monthly") {
      newDate = selectedDate.add(1, "month");
    } else if (progressView === "yearly") {
      newDate = selectedDate.add(1, "year");
    } else {
      newDate = selectedDate.add(1, "day");
    }
    dispatch(setProgressSelectedDate(newDate.toISOString()));
  };

  const handleToday = () => {
    dispatch(setProgressSelectedDate(dayjs().toISOString()));
  };

  // Handle view change - update Redux state
  const handleViewChange = newView => {
    dispatch(setProgressView(newView));
  };

  // Handle clicking on a progress bar - navigate to that date in Today view
  const handleProgressBarClick = dateStr => {
    // Parse the date string and navigate to Today view
    const targetDate = dayjs(dateStr);
    dispatch(setTodayViewDate(targetDate.toISOString()));
    dispatch(setMainTabIndex(0)); // Switch to Tasks tab
  };

  // View options for DateNavigation
  const viewOptions = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
  ];

  // Calculate progress for a specific date
  const calculateProgressForDate = date => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const targetDate = dayjs(date).toDate();

    // Filter tasks that should show on this date
    const tasksForDate = tasks.filter(task => checkTaskShouldShowOnDate(task, targetDate));

    const total = tasksForDate.length;
    const completed = tasksForDate.filter(task => {
      const completion = getCompletionForDate?.(task.id, dateStr);
      return completion?.outcome === "completed";
    }).length;

    const notCompleted = tasksForDate.filter(task => {
      const completion = getCompletionForDate?.(task.id, dateStr);
      return completion?.outcome === "not_completed";
    }).length;

    const unchecked = total - completed - notCompleted;

    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notCompletedPct = total > 0 ? Math.round((notCompleted / total) * 100) : 0;
    const uncheckedPct = total > 0 ? Math.round((unchecked / total) * 100) : 0;

    return {
      total,
      completed,
      notCompleted,
      unchecked,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  };

  // Calculate progress for a week (7 days combined)
  const calculateProgressForWeek = startDate => {
    let totalTasks = 0;
    let totalCompleted = 0;
    let totalNotCompleted = 0;
    let totalUnchecked = 0;

    for (let i = 0; i < 7; i++) {
      const date = dayjs(startDate).add(i, "day");
      const progress = calculateProgressForDate(date);
      totalTasks += progress.total;
      totalCompleted += progress.completed;
      totalNotCompleted += progress.notCompleted;
      totalUnchecked += progress.unchecked;
    }

    const completedPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const notCompletedPct = totalTasks > 0 ? Math.round((totalNotCompleted / totalTasks) * 100) : 0;
    const uncheckedPct = totalTasks > 0 ? Math.round((totalUnchecked / totalTasks) * 100) : 0;

    return {
      total: totalTasks,
      completed: totalCompleted,
      notCompleted: totalNotCompleted,
      unchecked: totalUnchecked,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  };

  // Calculate progress for a month (all days in month combined)
  const calculateProgressForMonth = date => {
    const startOfMonth = dayjs(date).startOf("month");
    const daysInMonth = dayjs(date).daysInMonth();

    let totalTasks = 0;
    let totalCompleted = 0;
    let totalNotCompleted = 0;
    let totalUnchecked = 0;

    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = startOfMonth.add(i, "day");
      const progress = calculateProgressForDate(currentDate);
      totalTasks += progress.total;
      totalCompleted += progress.completed;
      totalNotCompleted += progress.notCompleted;
      totalUnchecked += progress.unchecked;
    }

    const completedPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const notCompletedPct = totalTasks > 0 ? Math.round((totalNotCompleted / totalTasks) * 100) : 0;
    const uncheckedPct = totalTasks > 0 ? Math.round((totalUnchecked / totalTasks) * 100) : 0;

    return {
      total: totalTasks,
      completed: totalCompleted,
      notCompleted: totalNotCompleted,
      unchecked: totalUnchecked,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  };

  // Calculate progress for a year (all days in year combined)
  const calculateProgressForYear = date => {
    const startOfYear = dayjs(date).startOf("year");
    const daysInYear = dayjs(date).isLeapYear() ? 366 : 365;

    let totalTasks = 0;
    let totalCompleted = 0;
    let totalNotCompleted = 0;
    let totalUnchecked = 0;

    for (let i = 0; i < daysInYear; i++) {
      const currentDate = startOfYear.add(i, "day");
      const progress = calculateProgressForDate(currentDate);
      totalTasks += progress.total;
      totalCompleted += progress.completed;
      totalNotCompleted += progress.notCompleted;
      totalUnchecked += progress.unchecked;
    }

    const completedPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const notCompletedPct = totalTasks > 0 ? Math.round((totalNotCompleted / totalTasks) * 100) : 0;
    const uncheckedPct = totalTasks > 0 ? Math.round((totalUnchecked / totalTasks) * 100) : 0;

    return {
      total: totalTasks,
      completed: totalCompleted,
      notCompleted: totalNotCompleted,
      unchecked: totalUnchecked,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  };

  // Generate data based on view
  const progressData = useMemo(() => {
    if (progressView === "daily") {
      // Show each day of the year
      const startOfYear = selectedDate.startOf("year");
      const daysInYear = selectedDate.isLeapYear() ? 366 : 365;
      const days = [];

      for (let i = 0; i < daysInYear; i++) {
        const date = startOfYear.add(i, "day");
        const progress = calculateProgressForDate(date);
        // Only include days with actual progress (completed or not completed)
        if (progress.completed > 0 || progress.notCompleted > 0) {
          days.push({
            date: date.format("MMM D"),
            fullDate: date.format("YYYY-MM-DD"),
            clickDate: date.format("YYYY-MM-DD"), // Date to navigate to
            ...progress,
          });
        }
      }

      // Reverse to show most recent first
      return days.reverse();
    } else if (progressView === "weekly") {
      // Show each week of the year (52-53 weeks)
      const startOfYear = selectedDate.startOf("year");
      const endOfYear = selectedDate.endOf("year");
      const weeks = [];

      let currentWeek = startOfYear.startOf("isoWeek");

      while (currentWeek.isBefore(endOfYear) || currentWeek.isSame(endOfYear, "week")) {
        const progress = calculateProgressForWeek(currentWeek);
        const weekEnd = currentWeek.add(6, "day");
        // Only include weeks with actual progress (completed or not completed)
        if (progress.completed > 0 || progress.notCompleted > 0) {
          weeks.push({
            date: `${currentWeek.format("MMM D")} - ${weekEnd.format("MMM D")}`,
            fullDate: currentWeek.format("YYYY-MM-DD"),
            clickDate: currentWeek.format("YYYY-MM-DD"), // First day of week
            ...progress,
          });
        }
        currentWeek = currentWeek.add(1, "week");
      }

      // Reverse to show most recent first
      return weeks.reverse();
    } else if (progressView === "monthly") {
      // Show each month of the year
      const months = [];

      for (let i = 0; i < 12; i++) {
        const date = selectedDate.month(i);
        const progress = calculateProgressForMonth(date);
        // Only include months with actual progress (completed or not completed)
        if (progress.completed > 0 || progress.notCompleted > 0) {
          months.push({
            date: date.format("MMMM"),
            fullDate: date.format("YYYY-MM"),
            clickDate: date.startOf("month").format("YYYY-MM-DD"), // First day of month
            ...progress,
          });
        }
      }

      // Reverse to show most recent first
      return months.reverse();
    } else if (progressView === "yearly") {
      // Show multiple years (current year and 4 previous years)
      const years = [];
      const currentYear = selectedDate.year();

      for (let i = 4; i >= 0; i--) {
        const yearDate = selectedDate.year(currentYear - i);
        const progress = calculateProgressForYear(yearDate);
        // Only include years with actual progress (completed or not completed)
        if (progress.completed > 0 || progress.notCompleted > 0) {
          years.push({
            date: yearDate.format("YYYY"),
            fullDate: yearDate.format("YYYY"),
            clickDate: yearDate.startOf("year").format("YYYY-MM-DD"), // First day of year
            ...progress,
          });
        }
      }

      // Reverse to show most recent first
      return years.reverse();
    }

    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressView, selectedDate, tasks, getCompletionForDate]);

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
              selectedView={progressView}
              onViewChange={handleViewChange}
              viewSelectorWidth="120px"
              compareMode={progressView === "monthly" ? "month" : progressView === "yearly" ? "year" : "day"}
            />
          </Box>
        </Stack>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 3,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {progressView === "daily" && `Daily Progress - ${selectedDate.format("YYYY")}`}
            {progressView === "weekly" && `Weekly Progress - ${selectedDate.format("YYYY")}`}
            {progressView === "monthly" && `Monthly Progress - ${selectedDate.format("YYYY")}`}
            {progressView === "yearly" && "Yearly Progress"}
          </Typography>

          {progressData.map((item, index) => (
            <Box
              key={index}
              onClick={() => handleProgressBarClick(item.clickDate)}
              sx={{
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateX(4px)",
                  opacity: 0.9,
                },
              }}
            >
              <ProgressBar
                completedTasks={item.completed}
                totalTasks={item.total}
                completedPercent={item.completedPercent}
                notCompletedPercent={item.notCompletedPercent}
                uncheckedPercent={item.uncheckedPercent}
                label={item.date}
                showStats={true}
                height={progressView === "daily" ? 6 : progressView === "weekly" ? 8 : 10}
              />
            </Box>
          ))}

          {progressData.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No data available for this period
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
});
