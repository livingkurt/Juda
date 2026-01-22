"use client";

import { useMemo } from "react";
import { Box, Stack, Typography, ToggleButton, ToggleButtonGroup, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CalendarToday as Calendar, Dashboard as LayoutDashboard, List } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { setBacklogOpen, setMainContentView } from "@/lib/store/slices/uiSlice";
import { useViewState } from "@/hooks/useViewState";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useColorMode } from "@/hooks/useColorMode";

export function ViewTogglesAndProgress() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { mode: colorMode } = useColorMode();
  const dispatch = useDispatch();

  // Get view state
  const { mainTabIndex, viewDate, today } = useViewState();

  // Get UI state from Redux
  const backlogOpen = useSelector(state => state.ui.backlogOpen);
  const mainContentView = useSelector(state => state.ui.mainContentView);
  const recentlyCompletedTasksArray = useSelector(state => state.ui.recentlyCompletedTasks);

  // Convert recently completed tasks array to Set
  const recentlyCompletedTasks = useMemo(() => new Set(recentlyCompletedTasksArray), [recentlyCompletedTasksArray]);

  // Get task filters
  const { backlogTasks: _backlogTasks, filteredTodaysTasks } = useTaskFilters({
    recentlyCompletedTasks,
  });

  // Get completion helpers
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Progress calculation
  const { totalTasks, completedTasks, completedPercent, notCompletedPercent, uncheckedPercent } = useMemo(() => {
    const total = filteredTodaysTasks.length;

    const completed = filteredTodaysTasks.filter(t => {
      const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
      const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
      return isCompletedOnViewDate || allSubtasksComplete;
    }).length;

    const notCompleted = filteredTodaysTasks.filter(t => {
      const outcome = getOutcomeOnDate(t.id, viewDate);
      return outcome === "not_completed";
    }).length;

    const unchecked = total - completed - notCompleted;

    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notCompletedPct = total > 0 ? Math.round((notCompleted / total) * 100) : 0;
    const uncheckedPct = total > 0 ? Math.round((unchecked / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  }, [filteredTodaysTasks, isCompletedOnDate, getOutcomeOnDate, viewDate]);

  // Only show in Tasks tab, hide on mobile
  if (mainTabIndex !== 0 || isMobile) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ position: "relative" }}>
            <ToggleButtonGroup value={backlogOpen ? "backlog" : null} exclusive size="small" color="primary">
              <ToggleButton
                value="backlog"
                onClick={() => dispatch(setBacklogOpen(!backlogOpen))}
                sx={{
                  textTransform: "none",
                  position: "relative",
                  minWidth: 100,
                  px: 1.5,
                }}
              >
                <List fontSize="small" sx={{ mr: 0.5 }} />
                Backlog
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <ToggleButtonGroup
            value={mainContentView}
            exclusive
            onChange={(event, newView) => {
              if (newView) {
                dispatch(setMainContentView(newView));
              }
            }}
            size="small"
            color="primary"
          >
            <ToggleButton value="today" sx={{ textTransform: "none", minWidth: 100, px: 1.5 }}>
              <LayoutDashboard fontSize="small" sx={{ mr: 0.5 }} />
              Today
            </ToggleButton>
            <ToggleButton value="calendar" sx={{ textTransform: "none", minWidth: 100, px: 1.5 }}>
              <Calendar fontSize="small" sx={{ mr: 0.5 }} />
              Calendar
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Progress bar */}
      {mainContentView === "today" && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {viewDate && viewDate.toDateString() === today.toDateString()
                ? "Today's Progress"
                : `${viewDate?.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })} Progress`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedTasks}/{totalTasks} ({completedPercent}%)
            </Typography>
          </Stack>
          <Box
            sx={{
              height: 8,
              bgcolor: "action.disabledBackground",
              borderRadius: "9999px",
              overflow: "hidden",
              position: "relative",
              display: "flex",
            }}
          >
            {completedPercent > 0 && (
              <Box
                sx={{
                  height: "100%",
                  background:
                    colorMode === "dark"
                      ? "linear-gradient(to right, #48BB78, #4299E1)"
                      : "linear-gradient(to right, #38A169, #3182CE)",
                  transition: "width 0.3s ease-in-out",
                  width: `${completedPercent}%`,
                }}
              />
            )}
            {notCompletedPercent > 0 && (
              <Box
                sx={{
                  height: "100%",
                  background:
                    colorMode === "dark"
                      ? "linear-gradient(to right, #E53E3E, #FC8181)"
                      : "linear-gradient(to right, #C53030, #E53E3E)",
                  transition: "width 0.3s ease-in-out",
                  width: `${notCompletedPercent}%`,
                }}
              />
            )}
            {uncheckedPercent > 0 && (
              <Box
                sx={{
                  height: "100%",
                  bgcolor: "action.disabledBackground",
                  opacity: 0.5,
                  transition: "width 0.3s ease-in-out",
                  width: `${uncheckedPercent}%`,
                }}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
