"use client";

import { useMemo, useCallback } from "react";
import { Box, Tabs, Tab, Badge, Typography, useMediaQuery, Collapse, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { List, Dashboard as LayoutDashboard, CalendarToday as Calendar } from "@mui/icons-material";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { TodayView } from "@/components/tabs/TodayView";
import { CalendarViewTab } from "@/components/tabs/CalendarViewTab";
import { useDispatch, useSelector } from "react-redux";
import { setMobileActiveView, setBacklogWidth, setTodayViewWidth } from "@/lib/store/slices/uiSlice";
import { createDraggableId, createDroppableId } from "@/lib/dragHelpers";
import { useViewState } from "@/hooks/useViewState";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useResizeHandlers } from "@/hooks/useResizeHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useGetTasksQuery, useReorderTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useColorMode } from "@/hooks/useColorMode";
import { useLoadingTab } from "@/components/MainTabs";

export function TasksTab() {
  const theme = useTheme();
  const { mode: colorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useDispatch();

  // Get loading state
  const { loadingTab } = useLoadingTab();
  const isLoading = loadingTab === 0;

  // Redux state
  const backlogOpen = useSelector(state => state.ui.backlogOpen);
  const showDashboard = useSelector(state => state.ui.showDashboard);
  const showCalendar = useSelector(state => state.ui.showCalendar);
  const mobileActiveView = useSelector(state => state.ui.mobileActiveView);
  const backlogWidth = useSelector(state => state.ui.backlogWidth);
  const todayViewWidth = useSelector(state => state.ui.todayViewWidth);

  // View state
  const viewState = useViewState();
  const {
    today,
    selectedDate,
    todayViewDate,
    viewDate,
    todaySearchTerm,
    setTodaySearchTerm,
    todaySelectedTagIds,
    handleTodayTagSelect,
    handleTodayTagDeselect,
    handleTodayViewDateChange,
    navigateTodayView,
    handleTodayViewToday,
    setSelectedDate,
    navigateCalendar,
    getCalendarTitle,
    calendarView,
    setCalendarView,
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    handleCalendarTagSelect,
    handleCalendarTagDeselect,
  } = viewState;

  // Preferences
  const { preferences, updatePreference } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar;
  const showRecurringTasks = preferences.showRecurringTasks;
  const calendarZoom = preferences.calendarZoom;

  const setShowCompletedTasks = useCallback(value => updatePreference("showCompletedTasks", value), [updatePreference]);

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

  // Data queries
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [reorderTaskMutation] = useReorderTaskMutation();

  const createTag = useCallback(
    async (name, color) => {
      return await createTagMutation({ name, color }).unwrap();
    },
    [createTagMutation]
  );

  const reorderTask = useCallback(
    async (taskId, sourceSectionId, targetSectionId, newOrder) => {
      try {
        await reorderTaskMutation({
          taskId,
          sourceSectionId,
          targetSectionId,
          newOrder,
        }).unwrap();
      } catch (err) {
        console.error("Error reordering task:", err);
        throw err;
      }
    },
    [reorderTaskMutation]
  );

  // Completion helpers
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Completion handlers
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: new Set(),
    setAutoCollapsedSections: () => {},
    checkAndAutoCollapseSection: () => {},
  });

  // Task filters
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const backlogTasks = taskFilters.backlogTasks;
  const filteredTodaysTasks = taskFilters.filteredTodaysTasks;
  const todaysTasks = taskFilters.todaysTasks;
  const tasksBySection = taskFilters.tasksBySection;

  // Section expansion
  const sectionExpansion = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection,
  });

  // Status handlers
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });

  // Resize handlers
  const resizeHandlers = useResizeHandlers({
    backlogWidth,
    todayViewWidth,
    setBacklogWidth: width => dispatch(setBacklogWidth(width)),
    setTodayViewWidth: width => dispatch(setTodayViewWidth(width)),
  });

  // Auto scroll
  const autoScroll = useAutoScroll({
    todayViewDate,
    computedSections: sectionExpansion.computedSections,
    tasksBySection,
    isMobile,
  });

  const todayScrollContainerRefCallback = useCallback(
    node => {
      autoScroll.setTodayScrollContainerRef(node);
    },
    [autoScroll]
  );

  // Drag and drop
  const dragAndDrop = useDragAndDrop({
    backlogTasks,
    tasksBySection,
    handleStatusChange: statusHandlers.handleStatusChange,
    reorderTask,
  });

  // Task operations
  const taskOps = useTaskOperations();

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

  // Map mobileActiveView to tab index
  const getTabIndex = useCallback(() => {
    switch (mobileActiveView) {
      case "backlog":
        return 0;
      case "today":
        return 1;
      case "calendar":
        return 2;
      default:
        return 0;
    }
  }, [mobileActiveView]);

  // Map tab index to mobileActiveView
  const handleTabChange = useCallback(
    (e, newValue) => {
      switch (newValue) {
        case 0:
          dispatch(setMobileActiveView("backlog"));
          break;
        case 1:
          dispatch(setMobileActiveView("today"));
          break;
        case 2:
          dispatch(setMobileActiveView("calendar"));
          break;
        default:
          dispatch(setMobileActiveView("backlog"));
      }
    },
    [dispatch]
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Tab Bar */}
        <Tabs
          value={getTabIndex()}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Tab
            icon={<List fontSize="small" />}
            iconPosition="start"
            label={
              <Box
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}
              >
                <Box component="span">Backlog</Box>
                {backlogTasks.length > 0 && (
                  <Badge
                    badgeContent={backlogTasks.length}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.625rem",
                        height: "16px",
                        minWidth: "16px",
                        px: 0.5,
                      },
                    }}
                  />
                )}
              </Box>
            }
            sx={{
              fontSize: "0.875rem",
              minHeight: 48,
              "& .MuiTab-wrapper": {
                width: "100%",
              },
            }}
          />
          <Tab
            icon={<LayoutDashboard fontSize="small" />}
            iconPosition="start"
            label="Today"
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
          <Tab
            icon={<Calendar fontSize="small" />}
            iconPosition="start"
            label="Calendar"
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
        </Tabs>

        {/* Mobile Content Area */}
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {mobileActiveView === "backlog" && (
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
              {isLoading ? (
                <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CircularProgress size={48} />
                </Box>
              ) : (
                <BacklogDrawer createDraggableId={createDraggableId} />
              )}
            </Box>
          )}

          {mobileActiveView === "today" && (
            <Box sx={{ height: "100%", overflow: "auto", p: 1 }}>
              {/* Mobile Today View - Progress bar */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    mb: 1,
                  }}
                >
                  <Typography variant="caption">
                    {viewDate && viewDate.toDateString() === today.toDateString()
                      ? "Today's Progress"
                      : `${viewDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })} Progress`}
                  </Typography>
                  <Typography variant="caption">
                    {completedTasks}/{totalTasks} ({completedPercent}%)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: "action.hover",
                    borderRadius: "9999px",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                  }}
                >
                  {/* Completed segment */}
                  {completedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        background: `linear-gradient(to right, ${
                          colorMode === "dark" ? "#48BB78" : "#38A169"
                        }, ${colorMode === "dark" ? "#4299E1" : "#3182CE"})`,
                        transition: "width 0.3s ease-in-out",
                        width: `${completedPercent}%`,
                      }}
                    />
                  )}
                  {/* Not completed segment */}
                  {notCompletedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        background: `linear-gradient(to right, ${
                          colorMode === "dark" ? "#E53E3E" : "#C53030"
                        }, ${colorMode === "dark" ? "#FC8181" : "#E53E3E"})`,
                        transition: "width 0.3s ease-in-out",
                        width: `${notCompletedPercent}%`,
                      }}
                    />
                  )}
                  {/* Unchecked segment - translucent background */}
                  {uncheckedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        bgcolor: "action.hover",
                        opacity: 0.5,
                        transition: "width 0.3s ease-in-out",
                        width: `${uncheckedPercent}%`,
                      }}
                    />
                  )}
                </Box>
              </Box>

              <TodayView
                isLoading={isLoading}
                sections={sections}
                todayViewDate={todayViewDate}
                handleTodayViewDateChange={handleTodayViewDateChange}
                navigateTodayView={navigateTodayView}
                handleTodayViewToday={handleTodayViewToday}
                filteredTodaysTasks={filteredTodaysTasks}
                todaysTasks={todaysTasks}
                todaySearchTerm={todaySearchTerm}
                setTodaySearchTerm={setTodaySearchTerm}
                todaySelectedTagIds={todaySelectedTagIds}
                handleTodayTagSelect={handleTodayTagSelect}
                handleTodayTagDeselect={handleTodayTagDeselect}
                tags={tags}
                createTag={createTag}
                showCompletedTasks={showCompletedTasks}
                setShowCompletedTasks={setShowCompletedTasks}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                todayScrollContainerRef={todayScrollContainerRefCallback}
                isMobile={isMobile}
              />
            </Box>
          )}

          {mobileActiveView === "calendar" && (
            <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <CalendarViewTab isLoading={isLoading} dropTimeRef={dragAndDrop.dropTimeRef} />
            </Box>
          )}
        </Box>
      </>
    );
  }

  // Desktop Layout
  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Backlog Section */}
      <Box
        sx={{
          width: backlogOpen ? `${resizeHandlers.backlogWidth}px` : "0px",
          height: "100%",
          transition:
            resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
              ? "none"
              : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "width" : "auto",
          overflow: "hidden",
          borderRight: backlogOpen ? "1px solid" : "none",
          borderColor: "divider",
          bgcolor: "background.default",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: `${resizeHandlers.backlogWidth}px`,
            height: "100%",
            position: "relative",
          }}
        >
          <Collapse
            orientation="horizontal"
            in={backlogOpen}
            timeout={400}
            sx={{
              width: "100%",
              height: "100%",
              transition: resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "none" : undefined,
            }}
          >
            <Box
              sx={{
                width: `${resizeHandlers.backlogWidth}px`,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                minHeight: 0,
              }}
            >
              {isLoading ? (
                <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CircularProgress size={48} />
                </Box>
              ) : (
                <BacklogDrawer createDraggableId={createDraggableId} />
              )}
              {/* Resize handle between backlog and today */}
              <Box
                onMouseDown={resizeHandlers.handleBacklogResizeStart}
                onTouchStart={resizeHandlers.handleBacklogResizeStart}
                sx={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: { md: "12px", lg: "4px" },
                  cursor: "col-resize",
                  bgcolor:
                    resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                      ? "primary.light"
                      : "transparent",
                  transition: "background-color 0.2s",
                  zIndex: 10,
                  userSelect: "none",
                  touchAction: "none",
                  display: { xs: "none", md: "block" },
                  "&:hover": {
                    bgcolor: "primary.main",
                  },
                }}
              />
            </Box>
          </Collapse>
        </Box>
      </Box>

      {/* Today and Calendar Section */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          height: "100%",
          minHeight: 0,
          minWidth: 0,
        }}
      >
        {/* Today View */}
        <Box
          sx={{
            width: showDashboard ? (showCalendar ? `${resizeHandlers.todayViewWidth}px` : "100%") : "0px",
            height: "100%",
            transition:
              resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                ? "none"
                : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? "width" : "auto",
            overflow: "hidden",
            borderRight: showDashboard && showCalendar ? "1px solid" : "none",
            borderColor: "divider",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <Box
            sx={{
              width: showCalendar ? `${resizeHandlers.todayViewWidth}px` : "100%",
              height: "100%",
              position: "relative",
            }}
          >
            <Collapse
              orientation="horizontal"
              in={showDashboard}
              timeout={400}
              sx={{
                width: "100%",
                height: "100%",
                flex: 1,
                transition: resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? "none" : undefined,
              }}
            >
              <Box
                sx={{
                  width: showCalendar ? `${resizeHandlers.todayViewWidth}px` : "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <TodayView
                  isLoading={isLoading}
                  sections={sections}
                  todayViewDate={todayViewDate}
                  handleTodayViewDateChange={handleTodayViewDateChange}
                  navigateTodayView={navigateTodayView}
                  handleTodayViewToday={handleTodayViewToday}
                  filteredTodaysTasks={filteredTodaysTasks}
                  todaysTasks={todaysTasks}
                  todaySearchTerm={todaySearchTerm}
                  setTodaySearchTerm={setTodaySearchTerm}
                  todaySelectedTagIds={todaySelectedTagIds}
                  handleTodayTagSelect={handleTodayTagSelect}
                  handleTodayTagDeselect={handleTodayTagDeselect}
                  tags={tags}
                  createTag={createTag}
                  showCompletedTasks={showCompletedTasks}
                  setShowCompletedTasks={setShowCompletedTasks}
                  createDroppableId={createDroppableId}
                  createDraggableId={createDraggableId}
                  todayScrollContainerRef={todayScrollContainerRefCallback}
                  isMobile={isMobile}
                />
                {/* Resize handle between today and calendar */}
                {showCalendar && (
                  <Box
                    onMouseDown={resizeHandlers.handleTodayResizeStart}
                    onTouchStart={resizeHandlers.handleTodayResizeStart}
                    sx={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: { md: "12px", lg: "4px" },
                      cursor: "col-resize",
                      bgcolor:
                        resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                          ? "primary.light"
                          : "transparent",
                      transition: "background-color 0.2s",
                      zIndex: 10,
                      userSelect: "none",
                      touchAction: "none",
                      display: { xs: "none", md: "block" },
                      "&:hover": {
                        bgcolor: "primary.main",
                      },
                    }}
                  />
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>

        {/* Calendar View */}
        <Box
          sx={{
            flex: showCalendar ? 1 : 0,
            width: showCalendar ? "auto" : "0px",
            height: "100%",
            transition: "flex 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            opacity: showCalendar ? 1 : 0,
          }}
        >
          {showCalendar && (
            <CalendarViewTab
              isLoading={isLoading}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              navigateCalendar={navigateCalendar}
              getCalendarTitle={getCalendarTitle}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              calendarSearchTerm={calendarSearchTerm}
              setCalendarSearchTerm={setCalendarSearchTerm}
              calendarSelectedTagIds={calendarSelectedTagIds}
              handleCalendarTagSelect={handleCalendarTagSelect}
              handleCalendarTagDeselect={handleCalendarTagDeselect}
              tags={tags}
              createTag={createTag}
              showCompletedTasksCalendar={showCompletedTasksCalendar}
              setShowCompletedTasksCalendar={setShowCompletedTasksCalendar}
              showRecurringTasks={showRecurringTasks}
              setShowRecurringTasks={setShowRecurringTasks}
              calendarZoom={calendarZoom}
              setCalendarZoom={setCalendarZoom}
              createDroppableId={createDroppableId}
              createDraggableId={createDraggableId}
              dropTimeRef={dragAndDrop.dropTimeRef}
              tasks={tasks}
              isCompletedOnDate={isCompletedOnDate}
              getOutcomeOnDate={getOutcomeOnDate}
              handleEditTask={taskOps.handleEditTask}
              handleEditWorkout={taskOps.handleEditWorkout}
              handleOutcomeChange={completionHandlers.handleOutcomeChange}
              handleDuplicateTask={taskOps.handleDuplicateTask}
              handleDeleteTask={taskOps.handleDeleteTask}
              isMobile={isMobile}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
