"use client";

import { useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Select,
  Portal,
  HStack,
  Text,
  Flex,
  IconButton,
  Heading,
  Badge,
  Tabs,
  createListCollection,
} from "@chakra-ui/react";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useToast } from "@/hooks/useToast";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { AuthPage } from "@/components/AuthPage";
import { DndContext, DragOverlay, pointerWithin, closestCenter } from "@dnd-kit/core";
import {
  Calendar,
  LayoutDashboard,
  List,
  Sun,
  Sunset,
  Moon,
  Eye,
  EyeOff,
  Repeat,
  X,
  ZoomIn,
  ZoomOut,
  LogOut,
  StickyNote,
  CheckSquare,
  Clock,
  Columns,
} from "lucide-react";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { useTasks } from "@/hooks/useTasks";
import { useSections } from "@/hooks/useSections";
import { useCompletions } from "@/hooks/useCompletions";
import { useTags } from "@/hooks/useTags";
import { useViewState } from "@/hooks/useViewState";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useResizeHandlers } from "@/hooks/useResizeHandlers";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useDialogState } from "@/hooks/useDialogState";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { getGreeting } from "@/lib/utils";
import { createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { CalendarYearView } from "@/components/CalendarYearView";
import { RecurringTableView } from "@/components/RecurringTableView";
import { KanbanView } from "@/components/KanbanView";
import { PageSkeleton, SectionSkeleton, BacklogSkeleton, CalendarSkeleton } from "@/components/Skeletons";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { NotesView } from "@/components/NotesView";
import { TagEditor } from "@/components/TagEditor";
import { Tag as TagIcon } from "lucide-react";
import WorkoutModal from "@/components/WorkoutModal";
import WorkoutBuilder from "@/components/WorkoutBuilder";
import { SelectDropdown } from "@/components/SelectDropdown";

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

const calendarViewCollection = createListCollection({
  items: [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ],
});

// Custom collision detection that prioritizes sortable reordering
const customCollisionDetection = args => {
  const activeData = args.active?.data?.current;
  const isSortable = activeData?.type === "TASK" || activeData?.type === "SUBTASK" || activeData?.type === "SECTION";

  // For sortable items, use closestCenter for smooth list reordering
  if (isSortable) {
    const closestCollisions = closestCenter(args);
    if (closestCollisions.length > 0) {
      return closestCollisions;
    }
  }

  // Fall back to pointerWithin for cross-container drops and non-sortable items
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : [];
};

export default function DailyTasksApp() {
  const { isAuthenticated, loading: authLoading, initialized: authInitialized, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorModeSync();
  const { toast } = useToast();
  const { mode, interactive, dnd } = useSemanticColors();

  const bgColor = mode.bg.canvas;
  const headerBg = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const progressBarBg = mode.bg.muted;
  const dragOverlayBg = dnd.dropTarget;
  const dragOverlayBorder = dnd.dropTargetBorder;
  const dragOverlayText = interactive.primary;

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    duplicateTask,
    saveTask,
    batchReorderTasks,
    batchUpdateTasks,
    updateTagInTasks,
    removeTagFromTasks,
    refetch: fetchTasks,
    loading: tasksLoading,
  } = useTasks();
  const {
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    loading: sectionsLoading,
  } = useSections();
  const {
    completions,
    createCompletion,
    deleteCompletion,
    updateCompletion,
    batchCreateCompletions,
    batchDeleteCompletions,
    isCompletedOnDate,
    hasRecordOnDate,
    getOutcomeOnDate,
    getCompletionForDate,
    hasAnyCompletion,
    fetchCompletions,
  } = useCompletions();
  const {
    tags,
    createTag,
    updateTag: updateTagOriginal,
    deleteTag: deleteTagOriginal,
    batchUpdateTaskTags,
  } = useTags();

  // Wrapper around updateTag that also updates tag references in tasks
  const updateTag = useCallback(
    async (id, updates) => {
      const updatedTag = await updateTagOriginal(id, updates);
      // Update tag references in all tasks
      updateTagInTasks(id, updatedTag);
      return updatedTag;
    },
    [updateTagOriginal, updateTagInTasks]
  );

  // Wrapper around deleteTag that also removes tag references from tasks
  const deleteTag = useCallback(
    async id => {
      await deleteTagOriginal(id);
      // Remove tag references from all tasks
      removeTagFromTasks(id);
    },
    [deleteTagOriginal, removeTagFromTasks]
  );

  // Get preferences from context
  const { preferences, initialized: prefsInitialized, updatePreference } = usePreferencesContext();

  // Use synced color mode
  // const { colorMode, toggleColorMode } = useColorModeSync(); // Already imported above

  // Destructure preferences for easier access
  const {
    showDashboard,
    showCalendar,
    showKanban: _showKanban,
    backlogOpen,
    backlogWidth,
    todayViewWidth,
    calendarView,
    calendarZoom,
    showCompletedTasks,
    showRecurringTasks,
    showCompletedTasksCalendar,
    showStatusTasks: _showStatusTasks,
    notesSidebarOpen,
    notesSidebarWidth,
    notesListOpen,
    notesListWidth,
  } = preferences;

  // Create setter functions that update preferences
  const setShowDashboard = useCallback(value => updatePreference("showDashboard", value), [updatePreference]);
  const setShowCalendar = useCallback(value => updatePreference("showCalendar", value), [updatePreference]);
  const _setShowKanban = useCallback(value => updatePreference("showKanban", value), [updatePreference]);
  const setBacklogOpen = useCallback(value => updatePreference("backlogOpen", value), [updatePreference]);
  const setBacklogWidth = useCallback(value => updatePreference("backlogWidth", value), [updatePreference]);
  const setTodayViewWidth = useCallback(value => updatePreference("todayViewWidth", value), [updatePreference]);
  const setCalendarView = useCallback(value => updatePreference("calendarView", value), [updatePreference]);

  // Reset calendarView if it was set to "kanban" (from old implementation)
  useEffect(() => {
    if (calendarView === "kanban") {
      setCalendarView("week");
    }
  }, [calendarView, setCalendarView]);
  const setShowCompletedTasks = useCallback(value => updatePreference("showCompletedTasks", value), [updatePreference]);
  const setNotesSidebarOpen = useCallback(value => updatePreference("notesSidebarOpen", value), [updatePreference]);
  const setNotesSidebarWidth = useCallback(value => updatePreference("notesSidebarWidth", value), [updatePreference]);
  const setNotesListOpen = useCallback(value => updatePreference("notesListOpen", value), [updatePreference]);
  const setNotesListWidth = useCallback(value => updatePreference("notesListWidth", value), [updatePreference]);

  // For nested preferences
  const setCalendarZoom = updater => {
    if (typeof updater === "function") {
      const newZoom = updater(calendarZoom);
      updatePreference("calendarZoom", newZoom);
    } else {
      updatePreference("calendarZoom", updater);
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

  const setShowCompletedTasksCalendar = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showCompletedTasksCalendar);
      updatePreference("showCompletedTasksCalendar", newValue);
    } else {
      updatePreference("showCompletedTasksCalendar", updater);
    }
  };

  // setShowStatusTasks is available for future use (e.g., toggle in calendar views)
  // const setShowStatusTasks = updater => {
  //   if (typeof updater === "function") {
  //     const newValue = updater(showStatusTasks);
  //     updatePreference("showStatusTasks", newValue);
  //   } else {
  //     updatePreference("showStatusTasks", updater);
  //   }
  // };

  const isLoading = tasksLoading || sectionsLoading || !prefsInitialized;

  // Extract view state using hook
  const viewState = useViewState({
    showCompletedTasks,
    calendarView,
    calendarZoom,
  });

  // Extract selection state
  const selectionState = useSelectionState({ batchUpdateTasks });

  // Extract resize handlers
  const resizeHandlers = useResizeHandlers({
    backlogWidth,
    todayViewWidth,
    setBacklogWidth,
    setTodayViewWidth,
  });

  // Extract dialog state
  const dialogState = useDialogState();

  // Extract mobile detection
  const isMobile = useMobileDetection();

  // Initialize section expansion state early (will be updated when tasksBySection is available)
  // We'll recreate it after taskFilters is created, but for now use empty object
  const sectionExpansionInitial = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection: {},
  });

  // Determine if we should show mobile layout
  const showMobileLayout = isMobile;

  // Load completions on mount
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Cleanup and state management for recently completed tasks is now handled by completionHandlers hook

  // Keyboard shortcut: CMD+E (or CTRL+E) to open task dialog
  useEffect(() => {
    const handleKeyDown = e => {
      // Check for CMD+E (Mac) or CTRL+E (Windows/Linux)
      // Don't trigger if user is typing in an input/textarea/contenteditable
      const target = e.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && !isInput) {
        e.preventDefault();
        dialogState.openTaskDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogState]);

  // Extract task operations
  const taskOps = useTaskOperations({
    tasks,
    sections,
    updateTask,
    deleteTask,
    duplicateTask,
    saveTask,
    createTask,
    fetchTasks,
    batchUpdateTaskTags,
    toast,
    setEditingTask: dialogState.setEditingTask,
    setEditingWorkoutTask: dialogState.setEditingWorkoutTask,
    setDefaultSectionId: dialogState.setDefaultSectionId,
    setDefaultTime: dialogState.setDefaultTime,
    setDefaultDate: dialogState.setDefaultDate,
    openTaskDialog: dialogState.openTaskDialog,
    viewDate: viewState.viewDate,
  });

  // Destructure view state for easier access
  const {
    today,
    selectedDate,
    todayViewDate,
    viewDate,
    mainTabIndex,
    setMainTabIndex,
    todaySearchTerm,
    setTodaySearchTerm,
    todaySelectedTagIds,
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    mobileActiveView,
    setMobileActiveView,
  } = viewState;

  // Completion handlers are available via completionHandlers object
  // e.g., completionHandlers.handleToggleTask, completionHandlers.recentlyCompletedTasks

  // Initialize completion handlers early (before tasksBySection which uses recentlyCompletedTasks)

  const completionHandlers = useCompletionHandlers({
    tasks,
    sections,
    updateTask,
    createCompletion,
    deleteCompletion,
    batchCreateCompletions,
    batchDeleteCompletions,
    isCompletedOnDate,
    showCompletedTasks,
    today: viewState.today,
    viewDate: viewState.viewDate,
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    updateSection,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
    toast,
  });

  // Extract task filters
  const taskFilters = useTaskFilters({
    tasks,
    sections,
    viewDate: viewState.viewDate,
    today: viewState.today,
    todaySearchTerm: viewState.todaySearchTerm,
    todaySelectedTagIds: viewState.todaySelectedTagIds,
    showCompletedTasks,
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
    isCompletedOnDate,
    getOutcomeOnDate,
    hasRecordOnDate,
    hasAnyCompletion,
  });

  // Recreate section expansion with actual tasksBySection
  // Note: This creates a new hook instance, but the state is preserved via useState
  const sectionExpansion = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
  });

  // Extract status handlers
  const statusHandlers = useStatusHandlers({
    tasks,
    updateTask,
    createCompletion,
    showCompletedTasks,
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });

  // Extract section operations
  const sectionOps = useSectionOperations({
    sections,
    createSection,
    updateSection,
    deleteSection,
    editingSection: dialogState.editingSection,
    setEditingSection: dialogState.setEditingSection,
    openSectionDialog: dialogState.openSectionDialog,
    closeSectionDialog: dialogState.closeSectionDialog,
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
    toast,
  });

  // Extract auto-scroll
  const autoScroll = useAutoScroll({
    todayViewDate: viewState.todayViewDate,
    computedSections: sectionExpansion.computedSections,
    tasksBySection: taskFilters.tasksBySection,
    isMobile,
  });

  // Create a stable callback ref to avoid ESLint warning
  const todayScrollContainerRefCallback = useCallback(
    node => {
      autoScroll.setTodayScrollContainerRef(node);
    },
    [autoScroll]
  );

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon === "Sun" ? Sun : greeting.icon === "Sunset" ? Sunset : Moon;
  const todaysTasks = taskFilters.todaysTasks;
  const filteredTodaysTasks = taskFilters.filteredTodaysTasks;
  const tasksBySection = taskFilters.tasksBySection;
  const backlogTasks = taskFilters.backlogTasks;
  const noteTasks = taskFilters.noteTasks;

  // Extract drag and drop handlers (after taskFilters so backlogTasks and tasksBySection are available)
  const dragAndDrop = useDragAndDrop({
    tasks,
    sections,
    updateTask,
    reorderTask,
    reorderSections,
    today: viewState.today,
    viewDate: viewState.viewDate,
    selectedDate: viewState.selectedDate,
    calendarView: viewState.calendarView,
    backlogTasks,
    tasksBySection,
    batchReorderTasks,
    handleStatusChange: statusHandlers.handleStatusChange,
    toast,
  });

  // Legacy useMemo blocks removed - now using taskFilters hook

  // Progress calculation - check completion records for the selected date
  const totalTasks = filteredTodaysTasks.length;
  const completedTasks = filteredTodaysTasks.filter(t => {
    // Check if task is completed on the selected date via completion record
    const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
    // Also check subtasks completion
    const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
    return isCompletedOnViewDate || allSubtasksComplete;
  }).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Use statusHandlers.handleStatusChange instead of local handleStatusChange
  const handleStatusChange = statusHandlers.handleStatusChange;

  // Section handlers - now using sectionOps hook
  const handleEditSection = sectionOps.handleEditSection;
  const handleAddSection = sectionOps.handleAddSection;
  const handleSaveSection = sectionOps.handleSaveSection;
  const handleDeleteSection = sectionOps.handleDeleteSection;
  const handleToggleSectionExpand = sectionOps.handleToggleSectionExpand;

  // Calendar navigation - now using viewState helpers
  const navigateCalendar = viewState.navigateCalendar;
  const navigateTodayView = viewState.navigateTodayView;
  const handleTodayViewToday = viewState.handleTodayViewToday;
  const handleTodayViewDateChange = viewState.handleTodayViewDateChange;
  const getCalendarTitle = viewState.getCalendarTitle;

  // Computed sections - now using sectionExpansion hook
  const computedSections = sectionExpansion.computedSections;

  // Drag handlers are now in useDragAndDrop hook
  const handleDragOver = dragAndDrop.handleDragOver;
  const handleDragEndNew = dragAndDrop.handleDragEndNew;

  // This ensures we never show the login form while auth check is in progress
  if (!authInitialized || authLoading) {
    return <PageSkeleton showBacklog={false} showDashboard={false} showCalendar={false} />;
  }

  // Now auth is fully initialized - show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // User is authenticated - show loading while data/preferences load
  if (isLoading && tasks.length === 0 && sections.length === 0) {
    return <PageSkeleton showBacklog={false} showDashboard={false} showCalendar={false} />;
  }

  return (
    <Box
      h={{ base: "auto", md: "100vh" }}
      minH="100vh"
      display="flex"
      flexDirection="column"
      overflow={{ base: "auto", md: "hidden" }}
      bg={bgColor}
      color={textColor}
    >
      {/* Header */}
      <Box as="header" bg={headerBg} borderBottomWidth="1px" borderColor={borderColor} flexShrink={{ base: 1, md: 0 }}>
        <Box w="full" px={{ base: 3, md: 4 }} py={{ base: 2, md: 4 }}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={{ base: 2, md: 3 }}>
              <Box as="span" color={mode.status.warning}>
                <GreetingIcon size={20} stroke="currentColor" />
              </Box>
              <Box>
                <Heading as="h1" size={{ base: "md", md: "lg" }} fontWeight="semibold">
                  {greeting.text}
                </Heading>
                <Text fontSize={{ base: "xs", md: "sm" }} color={mutedText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </Box>
            </Flex>
            <HStack spacing={{ base: 1, md: 2 }}>
              <IconButton
                onClick={() => dialogState.setTagEditorOpen(true)}
                variant="ghost"
                size={{ base: "xs", md: "md" }}
                aria-label="Manage tags"
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  <TagIcon size={16} stroke="currentColor" />
                </Box>
              </IconButton>
              <IconButton
                onClick={toggleColorMode}
                variant="ghost"
                size={{ base: "xs", md: "md" }}
                aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  {colorMode === "dark" ? (
                    <Sun size={16} stroke="currentColor" />
                  ) : (
                    <Moon size={16} stroke="currentColor" />
                  )}
                </Box>
              </IconButton>
              <IconButton
                onClick={logout}
                variant="ghost"
                colorPalette="red"
                size={{ base: "xs", md: "md" }}
                aria-label="Logout"
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  <LogOut size={16} stroke="currentColor" />
                </Box>
              </IconButton>
            </HStack>
          </Flex>

          {/* Main Tabs */}
          <Box mt={{ base: 2, md: 4 }}>
            <Tabs.Root
              value={mainTabIndex.toString()}
              onValueChange={({ value }) => setMainTabIndex(parseInt(value))}
              variant="line"
            >
              <Tabs.List>
                <Tabs.Trigger
                  value="0"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <CheckSquare size={14} />
                    <Text>Tasks</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="1"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <Columns size={14} />
                    <Text>Kanban</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="2"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <StickyNote size={14} />
                    <Text>Notes</Text>
                    {noteTasks.length > 0 && (
                      <Badge
                        colorScheme="purple"
                        borderRadius="full"
                        fontSize={{ base: "2xs", md: "xs" }}
                        px={{ base: 1, md: 1.5 }}
                        py={0}
                      >
                        {noteTasks.length}
                      </Badge>
                    )}
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="3"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <Clock size={14} />
                    <Text>History</Text>
                  </HStack>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Box>

          {/* View toggles and calendar nav - only show in Tasks tab, hide on mobile */}
          {mainTabIndex === 0 && !isMobile && (
            <Box mt={4}>
              <Flex align="center" justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Box position="relative">
                    <Button
                      size="sm"
                      variant={backlogOpen ? "solid" : "outline"}
                      colorPalette={backlogOpen ? "blue" : "gray"}
                      onClick={() => setBacklogOpen(!backlogOpen)}
                    >
                      <Box as="span" color="currentColor">
                        <List size={14} stroke="currentColor" />
                      </Box>
                      Backlog
                    </Button>
                    {backlogTasks.length > 0 && (
                      <Badge
                        position="absolute"
                        top="-1"
                        right="-1"
                        bg={mode.status.error}
                        color="white"
                        fontSize="xs"
                        borderRadius="full"
                        w={5}
                        h={5}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {backlogTasks.length}
                      </Badge>
                    )}
                  </Box>
                  <Button
                    size="sm"
                    variant={showDashboard ? "solid" : "outline"}
                    colorPalette={showDashboard ? "blue" : "gray"}
                    onClick={() => setShowDashboard(!showDashboard)}
                  >
                    <Box as="span" color="currentColor">
                      <LayoutDashboard size={14} stroke="currentColor" />
                    </Box>
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={showCalendar ? "solid" : "outline"}
                    colorPalette={showCalendar ? "blue" : "gray"}
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <Box as="span" color="currentColor">
                      <Calendar size={14} stroke="currentColor" />
                    </Box>
                    Calendar
                  </Button>
                </HStack>
              </Flex>

              {/* Progress bar */}
              {showDashboard && (
                <Box>
                  <Flex justify="space-between" fontSize="sm" color={mutedText} mb={1}>
                    <Text>
                      {viewDate && viewDate.toDateString() === today.toDateString()
                        ? "Today's Progress"
                        : `${viewDate?.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })} Progress`}
                    </Text>
                    <Text>
                      {completedTasks}/{totalTasks} ({progressPercent}%)
                    </Text>
                  </Flex>
                  <Box h={2} bg={progressBarBg} borderRadius="full" overflow="hidden">
                    <Box
                      h="full"
                      bgGradient="to-r"
                      gradientFrom={colorMode === "dark" ? "#48BB78" : "#38A169"}
                      gradientTo={colorMode === "dark" ? "#4299E1" : "#3182CE"}
                      transition="width 0.3s ease-in-out"
                      width={`${progressPercent}%`}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Main content with DndContext */}
      <DndContext
        sensors={dragAndDrop.sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={dragAndDrop.handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndNew}
      >
        <Box as="main" flex={1} overflow={{ base: "visible", md: "hidden" }} display="flex" flexDirection="column">
          {showMobileLayout ? (
            /* ========== MOBILE LAYOUT ========== */
            <>
              {/* Mobile Tab Bar - Only show for Tasks tab */}
              {mainTabIndex === 0 && (
                <Box display="flex" borderBottomWidth="1px" borderColor={borderColor} bg={headerBg} flexShrink={0}>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "backlog" ? "2px" : "0"}
                    borderBottomColor={interactive.primary}
                    color={mobileActiveView === "backlog" ? interactive.primary : textColor}
                    onClick={() => setMobileActiveView("backlog")}
                    py={2}
                    position="relative"
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <List size={14} />
                      <Text>Backlog</Text>
                      {backlogTasks.length > 0 && (
                        <Badge colorPalette="red" borderRadius="full" fontSize="2xs" px={1.5} py={0}>
                          {backlogTasks.length}
                        </Badge>
                      )}
                    </HStack>
                  </Button>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "today" ? "2px" : "0"}
                    borderBottomColor={interactive.primary}
                    color={mobileActiveView === "today" ? interactive.primary : textColor}
                    onClick={() => setMobileActiveView("today")}
                    py={2}
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <LayoutDashboard size={14} />
                      <Text>Today</Text>
                    </HStack>
                  </Button>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "calendar" ? "2px" : "0"}
                    borderBottomColor="blue.500"
                    color={mobileActiveView === "calendar" ? "blue.500" : textColor}
                    onClick={() => setMobileActiveView("calendar")}
                    py={2}
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <Calendar size={16} />
                      <Text>Calendar</Text>
                    </HStack>
                  </Button>
                </Box>
              )}

              {/* Mobile Content Area */}
              <Box flex={1} overflow="hidden">
                {/* Kanban Tab - Mobile */}
                {mainTabIndex === 1 && (
                  <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                    <KanbanView
                      tasks={tasks}
                      onTaskClick={taskOps.handleEditTask}
                      onCreateTask={({ status }) => {
                        dialogState.setDefaultSectionId(sections[0]?.id);
                        dialogState.setEditingTask({ status });
                        dialogState.openTaskDialog();
                      }}
                      onCreateTaskInline={taskOps.handleCreateKanbanTaskInline}
                      createDraggableId={createDraggableId}
                      isCompletedOnDate={isCompletedOnDate}
                      getOutcomeOnDate={getOutcomeOnDate}
                      onOutcomeChange={completionHandlers.handleOutcomeChange}
                      onEdit={taskOps.handleEditTask}
                      onDuplicate={taskOps.handleDuplicateTask}
                      onDelete={taskOps.handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      tags={tags}
                      onTagsChange={taskOps.handleTaskTagsChange}
                      onCreateTag={createTag}
                      recentlyCompletedTasks={completionHandlers.recentlyCompletedTasks}
                      viewDate={viewDate}
                      selectedTaskIds={selectionState.selectedTaskIds}
                      onSelect={selectionState.handleTaskSelect}
                      onBulkEdit={selectionState.handleBulkEdit}
                      onBeginWorkout={dialogState.handleBeginWorkout}
                      onEditWorkout={taskOps.handleEditWorkout}
                    />
                  </Box>
                )}

                {/* Notes Tab - Mobile */}
                {mainTabIndex === 2 && (
                  <Box h="100%" overflow="hidden">
                    <NotesView
                      notes={noteTasks}
                      onCreateNote={() => {
                        createTask({
                          title: "Untitled Note",
                          sectionId: sections[0]?.id,
                          completionType: "note",
                          content: "",
                        });
                      }}
                      onDeleteNote={taskId => {
                        deleteTask(taskId);
                      }}
                      onUpdateNote={async (taskId, updates) => {
                        await updateTask(taskId, updates);
                      }}
                      sidebarOpen={notesSidebarOpen}
                      sidebarWidth={notesSidebarWidth}
                      onSidebarToggle={() => setNotesSidebarOpen(!notesSidebarOpen)}
                      onSidebarResize={setNotesSidebarWidth}
                      noteListOpen={notesListOpen}
                      noteListWidth={notesListWidth}
                      onNoteListToggle={() => setNotesListOpen(!notesListOpen)}
                      onNoteListResize={setNotesListWidth}
                    />
                  </Box>
                )}

                {/* History Tab - Mobile */}
                {mainTabIndex === 3 && (
                  <Box h="100%" overflow="hidden">
                    <RecurringTableView
                      tasks={tasks}
                      sections={sections}
                      completions={completions}
                      createCompletion={createCompletion}
                      deleteCompletion={deleteCompletion}
                      updateCompletion={updateCompletion}
                      getCompletionForDate={getCompletionForDate}
                      updateTask={updateTask}
                      onEdit={taskOps.handleEditTask}
                      onEditWorkout={taskOps.handleEditWorkout}
                      onDuplicate={taskOps.handleDuplicateTask}
                      onDelete={taskOps.handleDeleteTask}
                      tags={tags}
                      onTagsChange={taskOps.handleTaskTagsChange}
                      onCreateTag={createTag}
                    />
                  </Box>
                )}

                {/* Tasks Tab - Mobile */}
                {mainTabIndex === 0 && (
                  <>
                    {mobileActiveView === "backlog" && (
                      <Box h="100%" overflow="auto">
                        {isLoading ? (
                          <BacklogSkeleton />
                        ) : (
                          <BacklogDrawer
                            onClose={() => setMobileActiveView("today")}
                            backlogTasks={backlogTasks}
                            sections={sections}
                            onDeleteTask={taskOps.handleDeleteTask}
                            onEditTask={taskOps.handleEditTask}
                            onEditWorkout={taskOps.handleEditWorkout}
                            onUpdateTaskTitle={taskOps.handleUpdateTaskTitle}
                            onDuplicateTask={taskOps.handleDuplicateTask}
                            onAddTask={taskOps.handleAddTaskToBacklog}
                            onCreateBacklogTaskInline={taskOps.handleCreateBacklogTaskInline}
                            onCreateSubtask={taskOps.handleCreateSubtask}
                            onToggleExpand={taskOps.handleToggleExpand}
                            onToggleSubtask={completionHandlers.handleToggleSubtask}
                            onToggleTask={completionHandlers.handleToggleTask}
                            createDraggableId={createDraggableId}
                            viewDate={today}
                            tags={tags}
                            onTagsChange={taskOps.handleTaskTagsChange}
                            onCreateTag={createTag}
                            onOutcomeChange={completionHandlers.handleOutcomeChange}
                            getOutcomeOnDate={getOutcomeOnDate}
                            hasRecordOnDate={hasRecordOnDate}
                            onCompleteWithNote={completionHandlers.handleCompleteWithNote}
                            onSkipTask={completionHandlers.handleNotCompletedTask}
                            getCompletionForDate={getCompletionForDate}
                            selectedTaskIds={selectionState.selectedTaskIds}
                            onSelect={selectionState.handleTaskSelect}
                            onBulkEdit={selectionState.handleBulkEdit}
                            onBeginWorkout={dialogState.handleBeginWorkout}
                          />
                        )}
                      </Box>
                    )}

                    {mobileActiveView === "today" && (
                      <Box h="100%" overflow="auto" px={3} py={3}>
                        {/* Mobile Today View - Progress bar */}
                        <Box mb={3}>
                          <Flex justify="space-between" fontSize="xs" color={mutedText} mb={1}>
                            <Text>
                              {viewDate && viewDate.toDateString() === today.toDateString()
                                ? "Today's Progress"
                                : `${viewDate?.toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                  })} Progress`}
                            </Text>
                            <Text>
                              {completedTasks}/{totalTasks} ({progressPercent}%)
                            </Text>
                          </Flex>
                          <Box h={2} bg={progressBarBg} borderRadius="full" overflow="hidden">
                            <Box
                              h="full"
                              bgGradient="to-r"
                              gradientFrom="blue.500"
                              gradientTo="green.500"
                              transition="width 0.3s ease-in-out"
                              width={`${progressPercent}%`}
                            />
                          </Box>
                        </Box>

                        {/* Today View Header */}
                        <Flex align="center" justify="space-between" mb={3}>
                          <Heading size="sm">Today</Heading>
                          <HStack spacing={1}>
                            <Badge colorPalette="blue" fontSize="2xs" px={1.5} py={0}>
                              {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                            </Badge>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                              aria-label={showCompletedTasks ? "Hide Completed" : "Show Completed"}
                              minW="24px"
                              h="24px"
                              p={0}
                            >
                              {showCompletedTasks ? <Eye size={14} /> : <EyeOff size={14} />}
                            </IconButton>
                          </HStack>
                        </Flex>

                        {/* Date Navigation for Today View */}
                        {todayViewDate && (
                          <DateNavigation
                            selectedDate={todayViewDate}
                            onDateChange={handleTodayViewDateChange}
                            onPrevious={() => navigateTodayView(-1)}
                            onNext={() => navigateTodayView(1)}
                            onToday={handleTodayViewToday}
                          />
                        )}

                        {/* Search */}
                        <Box my={2}>
                          <HStack spacing={1} align="center" w="100%">
                            <Box flex={1} minW={0}>
                              <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                            </Box>
                            <TagFilter
                              tags={tags}
                              selectedTagIds={todaySelectedTagIds}
                              onTagSelect={viewState.handleTodayTagSelect}
                              onTagDeselect={viewState.handleTodayTagDeselect}
                              onCreateTag={createTag}
                            />
                          </HStack>
                        </Box>

                        {/* Sections */}
                        <Section
                          sections={computedSections}
                          tasksBySection={tasksBySection}
                          onToggleTask={completionHandlers.handleToggleTask}
                          onToggleSubtask={completionHandlers.handleToggleSubtask}
                          onToggleExpand={taskOps.handleToggleExpand}
                          onEditTask={taskOps.handleEditTask}
                          onEditWorkout={taskOps.handleEditWorkout}
                          onUpdateTaskTitle={taskOps.handleUpdateTaskTitle}
                          onDeleteTask={taskOps.handleDeleteTask}
                          onDuplicateTask={taskOps.handleDuplicateTask}
                          onAddTask={taskOps.handleAddTask}
                          onCreateTaskInline={taskOps.handleCreateTaskInline}
                          onCreateSubtask={taskOps.handleCreateSubtask}
                          onEditSection={handleEditSection}
                          onDeleteSection={handleDeleteSection}
                          onAddSection={handleAddSection}
                          onToggleSectionExpand={handleToggleSectionExpand}
                          createDroppableId={createDroppableId}
                          createDraggableId={createDraggableId}
                          viewDate={viewDate}
                          onOutcomeChange={completionHandlers.handleOutcomeChange}
                          getOutcomeOnDate={getOutcomeOnDate}
                          hasRecordOnDate={hasRecordOnDate}
                          onCompleteWithNote={completionHandlers.handleCompleteWithNote}
                          onSkipTask={completionHandlers.handleNotCompletedTask}
                          getCompletionForDate={getCompletionForDate}
                          selectedTaskIds={selectionState.selectedTaskIds}
                          onTaskSelect={selectionState.handleTaskSelect}
                          onBulkEdit={selectionState.handleBulkEdit}
                          onBeginWorkout={dialogState.handleBeginWorkout}
                          tags={tags}
                          onTagsChange={taskOps.handleTaskTagsChange}
                          onCreateTag={createTag}
                        />
                      </Box>
                    )}

                    {mobileActiveView === "calendar" && (
                      <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                        {/* Mobile Calendar Controls */}
                        <Box p={2} borderBottomWidth="1px" borderColor={borderColor} bg={headerBg}>
                          <DateNavigation
                            selectedDate={selectedDate}
                            onDateChange={date => {
                              const d = new Date(date);
                              d.setHours(0, 0, 0, 0);
                              viewState.setSelectedDate(d);
                            }}
                            onPrevious={() => navigateCalendar(-1)}
                            onNext={() => navigateCalendar(1)}
                            onToday={() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              viewState.setSelectedDate(today);
                            }}
                            title={getCalendarTitle()}
                            showDatePicker={false}
                            showDateDisplay={false}
                            rightContent={
                              <SelectDropdown
                                collection={calendarViewCollection}
                                value={[calendarView]}
                                onValueChange={({ value }) => setCalendarView(value[0])}
                                placeholder="View"
                                size="sm"
                                w={20}
                                showIndicator={true}
                              />
                            }
                          />
                          {/* Search and Tag Filter */}
                          <Box px={2} py={2} w="100%" maxW="100%">
                            <HStack spacing={1} align="center" w="100%" maxW="100%">
                              <Box flex={1} minW={0}>
                                <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                              </Box>
                              <TagFilter
                                tags={tags}
                                selectedTagIds={calendarSelectedTagIds}
                                onTagSelect={viewState.handleCalendarTagSelect}
                                onTagDeselect={viewState.handleCalendarTagDeselect}
                                onCreateTag={createTag}
                              />
                            </HStack>
                          </Box>
                        </Box>

                        {/* Calendar View */}
                        <Box flex={1} overflow="auto">
                          {(() => {
                            // Filter tasks based on recurring preference for current view
                            let filteredTasks = showRecurringTasks[calendarView]
                              ? tasks
                              : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

                            // Filter by search term
                            if (calendarSearchTerm.trim()) {
                              const lowerSearch = calendarSearchTerm.toLowerCase();
                              filteredTasks = filteredTasks.filter(task =>
                                task.title.toLowerCase().includes(lowerSearch)
                              );
                            }

                            // Filter by tags
                            if (calendarSelectedTagIds.length > 0) {
                              filteredTasks = filteredTasks.filter(task =>
                                task.tags?.some(tag => calendarSelectedTagIds.includes(tag.id))
                              );
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
                              <>
                                {calendarView === "day" && selectedDate && (
                                  <CalendarDayView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onTaskClick={taskOps.handleEditTask}
                                    onTaskTimeChange={taskOps.handleTaskTimeChange}
                                    onTaskDurationChange={taskOps.handleTaskDurationChange}
                                    onCreateTask={taskOps.handleCreateTaskFromCalendar}
                                    onDropTimeChange={time => {
                                      dragAndDrop.dropTimeRef.current = time;
                                    }}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    getCompletionForDate={getCompletionForDate}
                                    showCompleted={showCompletedTasksCalendar.day}
                                    tags={tags}
                                    onTagsChange={taskOps.handleTaskTagsChange}
                                    onCreateTag={createTag}
                                    showStatusTasks={_showStatusTasks.day}
                                    zoom={calendarZoom.day}
                                    onEdit={taskOps.handleEditTask}
                                    onEditWorkout={taskOps.handleEditWorkout}
                                    onOutcomeChange={completionHandlers.handleOutcomeChange}
                                    onDuplicate={taskOps.handleDuplicateTask}
                                    onDelete={taskOps.handleDeleteTask}
                                  />
                                )}
                                {calendarView === "week" && selectedDate && (
                                  <CalendarWeekView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onTaskClick={taskOps.handleEditTask}
                                    onDayClick={d => {
                                      viewState.setSelectedDate(d);
                                      setCalendarView("day");
                                    }}
                                    onTaskTimeChange={taskOps.handleTaskTimeChange}
                                    onTaskDurationChange={taskOps.handleTaskDurationChange}
                                    onCreateTask={taskOps.handleCreateTaskFromCalendar}
                                    onDropTimeChange={time => {
                                      dragAndDrop.dropTimeRef.current = time;
                                    }}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    tags={tags}
                                    onTagsChange={taskOps.handleTaskTagsChange}
                                    onCreateTag={createTag}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    getCompletionForDate={getCompletionForDate}
                                    showCompleted={showCompletedTasksCalendar.week}
                                    showStatusTasks={_showStatusTasks.week}
                                    zoom={calendarZoom.week}
                                    onEdit={taskOps.handleEditTask}
                                    onEditWorkout={taskOps.handleEditWorkout}
                                    onOutcomeChange={completionHandlers.handleOutcomeChange}
                                    onDuplicate={taskOps.handleDuplicateTask}
                                    onDelete={taskOps.handleDeleteTask}
                                  />
                                )}
                                {calendarView === "month" && selectedDate && (
                                  <CalendarMonthView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onDayClick={d => {
                                      viewState.setSelectedDate(d);
                                      setCalendarView("day");
                                    }}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    showCompleted={showCompletedTasksCalendar.month}
                                    zoom={calendarZoom.month}
                                    tags={tags}
                                    onCreateTag={createTag}
                                    onEdit={taskOps.handleEditTask}
                                    onEditWorkout={taskOps.handleEditWorkout}
                                    onOutcomeChange={completionHandlers.handleOutcomeChange}
                                    onDuplicate={taskOps.handleDuplicateTask}
                                    onDelete={taskOps.handleDeleteTask}
                                  />
                                )}
                                {calendarView === "year" && selectedDate && (
                                  <CalendarYearView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onDayClick={d => {
                                      viewState.setSelectedDate(d);
                                      setCalendarView("day");
                                    }}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    showCompleted={showCompletedTasksCalendar.year}
                                    zoom={calendarZoom.year}
                                    onEdit={taskOps.handleEditTask}
                                    onEditWorkout={taskOps.handleEditWorkout}
                                    onOutcomeChange={completionHandlers.handleOutcomeChange}
                                    onDuplicate={taskOps.handleDuplicateTask}
                                    onDelete={taskOps.handleDeleteTask}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </>
          ) : (
            /* ========== DESKTOP LAYOUT (existing code) ========== */
            <Box display="flex" flex={1} h="100%" minH={0} overflow="hidden">
              <Box flex={1} minH={0} h="100%" overflow={mainTabIndex === 2 ? "hidden" : "auto"}>
                {mainTabIndex === 1 ? (
                  /* Kanban Tab Content */
                  <Box
                    h="100%"
                    overflow="hidden"
                    display="flex"
                    flexDirection="column"
                    px={{ base: 2, md: 4 }}
                    py={{ base: 3, md: 6 }}
                  >
                    <KanbanView
                      tasks={tasks}
                      onTaskClick={taskOps.handleEditTask}
                      onCreateTask={({ status }) => {
                        dialogState.setDefaultSectionId(sections[0]?.id);
                        dialogState.setEditingTask({ status });
                        dialogState.openTaskDialog();
                      }}
                      onCreateTaskInline={taskOps.handleCreateKanbanTaskInline}
                      createDraggableId={createDraggableId}
                      isCompletedOnDate={isCompletedOnDate}
                      getOutcomeOnDate={getOutcomeOnDate}
                      onOutcomeChange={completionHandlers.handleOutcomeChange}
                      onEdit={taskOps.handleEditTask}
                      onDuplicate={taskOps.handleDuplicateTask}
                      onDelete={taskOps.handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      tags={tags}
                      onTagsChange={taskOps.handleTaskTagsChange}
                      onCreateTag={createTag}
                      recentlyCompletedTasks={completionHandlers.recentlyCompletedTasks}
                      viewDate={viewDate}
                      selectedTaskIds={selectionState.selectedTaskIds}
                      onSelect={selectionState.handleTaskSelect}
                      onBulkEdit={selectionState.handleBulkEdit}
                      onBeginWorkout={dialogState.handleBeginWorkout}
                      onEditWorkout={taskOps.handleEditWorkout}
                    />
                  </Box>
                ) : mainTabIndex === 2 ? (
                  /* Notes Tab Content */
                  <Box h="100%" overflow="hidden">
                    <NotesView
                      notes={noteTasks}
                      onCreateNote={() => {
                        // Create a new note task
                        createTask({
                          title: "Untitled Note",
                          sectionId: sections[0]?.id,
                          completionType: "note",
                          content: "",
                        });
                      }}
                      onDeleteNote={taskId => {
                        deleteTask(taskId);
                      }}
                      onUpdateNote={async (taskId, updates) => {
                        await updateTask(taskId, updates);
                      }}
                      sidebarOpen={notesSidebarOpen}
                      sidebarWidth={notesSidebarWidth}
                      onSidebarToggle={() => setNotesSidebarOpen(!notesSidebarOpen)}
                      onSidebarResize={setNotesSidebarWidth}
                      noteListOpen={notesListOpen}
                      noteListWidth={notesListWidth}
                      onNoteListToggle={() => setNotesListOpen(!notesListOpen)}
                      onNoteListResize={setNotesListWidth}
                    />
                  </Box>
                ) : mainTabIndex === 3 ? (
                  /* History Tab Content */
                  <RecurringTableView
                    tasks={tasks}
                    sections={sections}
                    completions={completions}
                    createCompletion={createCompletion}
                    deleteCompletion={deleteCompletion}
                    updateCompletion={updateCompletion}
                    getCompletionForDate={getCompletionForDate}
                    updateTask={updateTask}
                    onEdit={taskOps.handleEditTask}
                    onEditWorkout={taskOps.handleEditWorkout}
                    onDuplicate={taskOps.handleDuplicateTask}
                    onDelete={taskOps.handleDeleteTask}
                    tags={tags}
                    onTagsChange={taskOps.handleTaskTagsChange}
                    onCreateTag={createTag}
                  />
                ) : (
                  /* Tasks Tab Content (mainTabIndex === 0) */
                  <Box w="full" h="full" display="flex" maxW="100%" overflow="hidden">
                    {/* Backlog Section - only show on Tasks tab */}
                    {mainTabIndex === 0 && backlogOpen && (
                      <>
                        <Box
                          w={`${resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? resizeHandlers.localBacklogWidth : backlogWidth}px`}
                          h="100%"
                          transition={
                            resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "none" : "width 0.3s"
                          }
                          overflow="hidden"
                          borderRightWidth="1px"
                          borderColor={borderColor}
                          bg={bgColor}
                          flexShrink={0}
                          display="flex"
                          flexDirection="column"
                          position="relative"
                        >
                          {isLoading ? (
                            <BacklogSkeleton />
                          ) : (
                            <BacklogDrawer
                              onClose={null}
                              backlogTasks={backlogTasks}
                              sections={sections}
                              onDeleteTask={taskOps.handleDeleteTask}
                              onEditTask={taskOps.handleEditTask}
                              onEditWorkout={taskOps.handleEditWorkout}
                              onUpdateTaskTitle={taskOps.handleUpdateTaskTitle}
                              onDuplicateTask={taskOps.handleDuplicateTask}
                              onAddTask={taskOps.handleAddTaskToBacklog}
                              onCreateBacklogTaskInline={taskOps.handleCreateBacklogTaskInline}
                              onCreateSubtask={taskOps.handleCreateSubtask}
                              onToggleExpand={taskOps.handleToggleExpand}
                              onToggleSubtask={completionHandlers.handleToggleSubtask}
                              onToggleTask={completionHandlers.handleToggleTask}
                              createDraggableId={createDraggableId}
                              viewDate={today}
                              tags={tags}
                              onTagsChange={taskOps.handleTaskTagsChange}
                              onCreateTag={createTag}
                              onOutcomeChange={completionHandlers.handleOutcomeChange}
                              getOutcomeOnDate={getOutcomeOnDate}
                              hasRecordOnDate={hasRecordOnDate}
                              onCompleteWithNote={completionHandlers.handleCompleteWithNote}
                              onSkipTask={completionHandlers.handleNotCompletedTask}
                              getCompletionForDate={getCompletionForDate}
                              selectedTaskIds={selectionState.selectedTaskIds}
                              onSelect={selectionState.handleTaskSelect}
                              onBulkEdit={selectionState.handleBulkEdit}
                              onBeginWorkout={dialogState.handleBeginWorkout}
                            />
                          )}
                          {/* Resize handle between backlog and today */}
                          <Box
                            position="absolute"
                            right={0}
                            top={0}
                            bottom={0}
                            w="4px"
                            cursor="col-resize"
                            bg={
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                                ? "blue.400"
                                : "transparent"
                            }
                            _hover={{ bg: "blue.300" }}
                            transition="background-color 0.2s"
                            onMouseDown={resizeHandlers.handleBacklogResizeStart}
                            zIndex={10}
                            sx={{ userSelect: "none" }}
                            display={{ base: "none", md: "block" }}
                          />
                        </Box>
                      </>
                    )}

                    {/* Today and Calendar Section */}
                    <Box flex={1} overflow="hidden" display="flex" flexDirection="row" h="100%" minH={0} minW={0}>
                      {/* Today View */}
                      {showDashboard && (
                        <>
                          <Box
                            w={
                              showCalendar
                                ? `${resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? resizeHandlers.localTodayViewWidth : todayViewWidth}px`
                                : "100%"
                            }
                            h="100%"
                            transition={
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? "none" : "width 0.3s"
                            }
                            overflow="hidden"
                            borderRightWidth={showCalendar ? "1px" : "0"}
                            borderColor={borderColor}
                            flexShrink={0}
                            display="flex"
                            flexDirection="column"
                            position="relative"
                            px={{ base: 2, md: 4 }}
                            py={{ base: 3, md: 6 }}
                          >
                            {isLoading && sections.length === 0 ? (
                              <Box>
                                <SectionSkeleton />
                                <SectionSkeleton />
                                <SectionSkeleton />
                              </Box>
                            ) : (
                              <>
                                {/* Today View Header - Sticky */}
                                <Box
                                  position="sticky"
                                  top={0}
                                  zIndex={10}
                                  bg={bgColor}
                                  mb={4}
                                  pb={4}
                                  borderBottomWidth="1px"
                                  borderColor={borderColor}
                                  flexShrink={0}
                                  w="100%"
                                  maxW="100%"
                                  overflow="hidden"
                                >
                                  <Flex align="center" justify="space-between" mb={2} w="100%" maxW="100%" gap={2}>
                                    <Heading size="md" flexShrink={0}>
                                      Today
                                    </Heading>
                                    <Flex align="center" gap={2} flexShrink={0}>
                                      <Badge colorPalette="blue">
                                        {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                                        {todaySearchTerm &&
                                          filteredTodaysTasks.length !== todaysTasks.length &&
                                          ` of ${todaysTasks.length}`}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                        fontSize="sm"
                                        color={mutedText}
                                        _hover={{ color: textColor }}
                                      >
                                        <Box as="span" color="currentColor">
                                          {showCompletedTasks ? (
                                            <Eye size={16} stroke="currentColor" />
                                          ) : (
                                            <EyeOff size={16} stroke="currentColor" />
                                          )}
                                        </Box>
                                        {showCompletedTasks ? "Hide Completed" : "Show Completed"}
                                      </Button>
                                    </Flex>
                                  </Flex>
                                  {todayViewDate && (
                                    <DateNavigation
                                      selectedDate={todayViewDate}
                                      onDateChange={handleTodayViewDateChange}
                                      onPrevious={() => navigateTodayView(-1)}
                                      onNext={() => navigateTodayView(1)}
                                      onToday={handleTodayViewToday}
                                    />
                                  )}
                                  <Box mt={3} w="100%" maxW="100%">
                                    <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
                                      <Box flex={1} minW={0}>
                                        <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                      </Box>
                                      <TagFilter
                                        tags={tags}
                                        selectedTagIds={todaySelectedTagIds}
                                        onTagSelect={viewState.handleTodayTagSelect}
                                        onTagDeselect={viewState.handleTodayTagDeselect}
                                        onCreateTag={createTag}
                                      />
                                    </HStack>
                                  </Box>
                                </Box>
                                {/* Scrollable Sections Container */}
                                <Box
                                  ref={todayScrollContainerRefCallback}
                                  flex={1}
                                  overflowY="auto"
                                  minH={0}
                                  w="100%"
                                  maxW="100%"
                                >
                                  <Section
                                    sections={computedSections}
                                    tasksBySection={tasksBySection}
                                    onToggleTask={completionHandlers.handleToggleTask}
                                    onToggleSubtask={completionHandlers.handleToggleSubtask}
                                    onToggleExpand={taskOps.handleToggleExpand}
                                    onEditTask={taskOps.handleEditTask}
                                    onEditWorkout={taskOps.handleEditWorkout}
                                    onUpdateTaskTitle={taskOps.handleUpdateTaskTitle}
                                    onDeleteTask={taskOps.handleDeleteTask}
                                    onDuplicateTask={taskOps.handleDuplicateTask}
                                    onAddTask={taskOps.handleAddTask}
                                    onCreateTaskInline={taskOps.handleCreateTaskInline}
                                    onCreateSubtask={taskOps.handleCreateSubtask}
                                    onEditSection={handleEditSection}
                                    onDeleteSection={handleDeleteSection}
                                    onAddSection={handleAddSection}
                                    onToggleSectionExpand={handleToggleSectionExpand}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    viewDate={todayViewDate || today}
                                    onOutcomeChange={completionHandlers.handleOutcomeChange}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    hasRecordOnDate={hasRecordOnDate}
                                    onCompleteWithNote={completionHandlers.handleCompleteWithNote}
                                    onSkipTask={completionHandlers.handleNotCompletedTask}
                                    getCompletionForDate={getCompletionForDate}
                                    selectedTaskIds={selectionState.selectedTaskIds}
                                    onTaskSelect={selectionState.handleTaskSelect}
                                    onBulkEdit={selectionState.handleBulkEdit}
                                    onBeginWorkout={dialogState.handleBeginWorkout}
                                    tags={tags}
                                    onTagsChange={taskOps.handleTaskTagsChange}
                                    onCreateTag={createTag}
                                  />
                                </Box>
                              </>
                            )}
                            {/* Resize handle between today and calendar */}
                            {showCalendar && (
                              <Box
                                position="absolute"
                                right={0}
                                top={0}
                                bottom={0}
                                w="4px"
                                cursor="col-resize"
                                bg={
                                  resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                    ? "blue.400"
                                    : "transparent"
                                }
                                _hover={{ bg: "blue.300" }}
                                transition="background-color 0.2s"
                                onMouseDown={resizeHandlers.handleTodayResizeStart}
                                zIndex={10}
                                sx={{ userSelect: "none" }}
                                display={{ base: "none", md: "block" }}
                              />
                            )}
                          </Box>
                        </>
                      )}

                      {/* Calendar View */}
                      {showCalendar && (
                        <Box
                          flex={1}
                          minW={0}
                          w="auto"
                          maxW="100%"
                          display="flex"
                          flexDirection="column"
                          overflow="hidden"
                          h="full"
                        >
                          {/* Calendar Header */}
                          <Box
                            mb={4}
                            pb={4}
                            borderBottomWidth="1px"
                            borderColor={borderColor}
                            px={{ base: 2, md: 4 }}
                            pt={{ base: 3, md: 6 }}
                            w="100%"
                            maxW="100%"
                            overflow="hidden"
                            flexShrink={0}
                          >
                            <Flex align="center" justify="space-between" mb={2} w="100%" maxW="100%" gap={2}>
                              <Heading size="md" flexShrink={0}>
                                Calendar
                              </Heading>
                              <HStack spacing={2} flexShrink={0}>
                                <HStack spacing={1}>
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setCalendarZoom(prev => ({
                                        ...prev,
                                        [calendarView]: Math.max(0.25, prev[calendarView] - 0.25),
                                      }));
                                    }}
                                    aria-label="Zoom Out"
                                    fontSize="sm"
                                    color={mutedText}
                                    _hover={{ color: textColor }}
                                    isDisabled={calendarZoom[calendarView] <= 0.25}
                                  >
                                    <Box as="span" color="currentColor">
                                      <ZoomOut size={14} stroke="currentColor" />
                                    </Box>
                                  </IconButton>
                                  <Text fontSize="xs" color={mutedText} minW="40px" textAlign="center">
                                    {Math.round(calendarZoom[calendarView] * 100)}%
                                  </Text>
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setCalendarZoom(prev => ({
                                        ...prev,
                                        [calendarView]: Math.min(3.0, prev[calendarView] + 0.25),
                                      }));
                                    }}
                                    aria-label="Zoom In"
                                    fontSize="sm"
                                    color={mutedText}
                                    _hover={{ color: textColor }}
                                    isDisabled={calendarZoom[calendarView] >= 3.0}
                                  >
                                    <Box as="span" color="currentColor">
                                      <ZoomIn size={14} stroke="currentColor" />
                                    </Box>
                                  </IconButton>
                                </HStack>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowCompletedTasksCalendar(prev => ({
                                      ...prev,
                                      [calendarView]: !prev[calendarView],
                                    }));
                                  }}
                                  fontSize="sm"
                                  color={mutedText}
                                  _hover={{ color: textColor }}
                                >
                                  <Box as="span" color="currentColor">
                                    {showCompletedTasksCalendar[calendarView] ? (
                                      <Eye size={14} stroke="currentColor" />
                                    ) : (
                                      <EyeOff size={14} stroke="currentColor" />
                                    )}
                                  </Box>
                                  {showCompletedTasksCalendar[calendarView] ? "Hide Completed" : "Show Completed"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowRecurringTasks(prev => ({
                                      ...prev,
                                      [calendarView]: !prev[calendarView],
                                    }));
                                  }}
                                  fontSize="sm"
                                  color={mutedText}
                                  _hover={{ color: textColor }}
                                >
                                  <Box as="span" color="currentColor">
                                    {showRecurringTasks[calendarView] ? (
                                      <Repeat size={14} stroke="currentColor" />
                                    ) : (
                                      <X size={14} stroke="currentColor" />
                                    )}
                                  </Box>
                                  {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
                                </Button>
                              </HStack>
                            </Flex>
                            {/* Calendar Controls */}
                            <DateNavigation
                              selectedDate={selectedDate}
                              onDateChange={date => {
                                const d = new Date(date);
                                d.setHours(0, 0, 0, 0);
                                viewState.setSelectedDate(d);
                              }}
                              onPrevious={() => navigateCalendar(-1)}
                              onNext={() => navigateCalendar(1)}
                              onToday={() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                viewState.setSelectedDate(today);
                              }}
                              title={getCalendarTitle()}
                              showDatePicker={false}
                              showDateDisplay={false}
                              rightContent={
                                <Select.Root
                                  collection={calendarViewCollection}
                                  value={[calendarView]}
                                  onValueChange={({ value }) => setCalendarView(value[0])}
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
                                        {calendarViewCollection.items.map(item => (
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
                            {/* Search and Tag Filter */}
                            <Box mt={3} w="100%" maxW="100%">
                              <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
                                <Box flex={1} minW={0}>
                                  <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                </Box>
                                <TagFilter
                                  tags={tags}
                                  selectedTagIds={calendarSelectedTagIds}
                                  onTagSelect={viewState.handleCalendarTagSelect}
                                  onTagDeselect={viewState.handleCalendarTagDeselect}
                                  onCreateTag={createTag}
                                />
                              </HStack>
                            </Box>
                          </Box>
                          {isLoading && !selectedDate ? (
                            <CalendarSkeleton />
                          ) : (
                            <>
                              {/* Calendar content */}
                              <Box flex={1} overflow="hidden" display="flex" flexDirection="column" minH={0}>
                                {(() => {
                                  // Filter tasks based on recurring preference for current view
                                  let filteredTasks = showRecurringTasks[calendarView]
                                    ? tasks
                                    : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

                                  // Filter by search term
                                  if (calendarSearchTerm.trim()) {
                                    const lowerSearch = calendarSearchTerm.toLowerCase();
                                    filteredTasks = filteredTasks.filter(task =>
                                      task.title.toLowerCase().includes(lowerSearch)
                                    );
                                  }

                                  // Filter by tags
                                  if (calendarSelectedTagIds.length > 0) {
                                    filteredTasks = filteredTasks.filter(task =>
                                      task.tags?.some(tag => calendarSelectedTagIds.includes(tag.id))
                                    );
                                  }

                                  // Filter tasks based on completed preference for current view
                                  // For day view, filter here. For week/month views, filter per day in components
                                  if (
                                    !showCompletedTasksCalendar[calendarView] &&
                                    calendarView === "day" &&
                                    selectedDate
                                  ) {
                                    filteredTasks = filteredTasks.filter(task => {
                                      const isCompleted = isCompletedOnDate(task.id, selectedDate);
                                      const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, selectedDate) : null;
                                      const hasOutcome = outcome !== null && outcome !== undefined;
                                      return !isCompleted && !hasOutcome;
                                    });
                                  }

                                  return (
                                    <>
                                      {calendarView === "day" && selectedDate && (
                                        <CalendarDayView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onTaskClick={taskOps.handleEditTask}
                                          onTaskTimeChange={taskOps.handleTaskTimeChange}
                                          onTaskDurationChange={taskOps.handleTaskDurationChange}
                                          onCreateTask={taskOps.handleCreateTaskFromCalendar}
                                          onDropTimeChange={time => {
                                            dragAndDrop.dropTimeRef.current = time;
                                          }}
                                          createDroppableId={createDroppableId}
                                          createDraggableId={createDraggableId}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.day}
                                          zoom={calendarZoom.day}
                                          tags={tags}
                                          onTagsChange={taskOps.handleTaskTagsChange}
                                          onCreateTag={createTag}
                                          onEdit={taskOps.handleEditTask}
                                          onEditWorkout={taskOps.handleEditWorkout}
                                          onOutcomeChange={completionHandlers.handleOutcomeChange}
                                          onDuplicate={taskOps.handleDuplicateTask}
                                          onDelete={taskOps.handleDeleteTask}
                                        />
                                      )}
                                      {calendarView === "week" && selectedDate && (
                                        <CalendarWeekView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onTaskClick={taskOps.handleEditTask}
                                          onDayClick={d => {
                                            viewState.setSelectedDate(d);
                                            setCalendarView("day");
                                          }}
                                          onTaskTimeChange={taskOps.handleTaskTimeChange}
                                          onTaskDurationChange={taskOps.handleTaskDurationChange}
                                          onCreateTask={taskOps.handleCreateTaskFromCalendar}
                                          onDropTimeChange={time => {
                                            dragAndDrop.dropTimeRef.current = time;
                                          }}
                                          createDroppableId={createDroppableId}
                                          createDraggableId={createDraggableId}
                                          tags={tags}
                                          onTagsChange={taskOps.handleTaskTagsChange}
                                          onCreateTag={createTag}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.week}
                                          zoom={calendarZoom.week}
                                          onEdit={taskOps.handleEditTask}
                                          onEditWorkout={taskOps.handleEditWorkout}
                                          onOutcomeChange={completionHandlers.handleOutcomeChange}
                                          onDuplicate={taskOps.handleDuplicateTask}
                                          onDelete={taskOps.handleDeleteTask}
                                        />
                                      )}
                                      {calendarView === "month" && selectedDate && (
                                        <CalendarMonthView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onDayClick={d => {
                                            viewState.setSelectedDate(d);
                                            setCalendarView("day");
                                          }}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.month}
                                          zoom={calendarZoom.month}
                                          tags={tags}
                                          onCreateTag={createTag}
                                          onEdit={taskOps.handleEditTask}
                                          onEditWorkout={taskOps.handleEditWorkout}
                                          onOutcomeChange={completionHandlers.handleOutcomeChange}
                                          onDuplicate={taskOps.handleDuplicateTask}
                                          onDelete={taskOps.handleDeleteTask}
                                        />
                                      )}
                                      {calendarView === "year" && selectedDate && (
                                        <CalendarYearView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onDayClick={d => {
                                            viewState.setSelectedDate(d);
                                            setCalendarView("day");
                                          }}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.year}
                                          zoom={calendarZoom.year}
                                          onEdit={taskOps.handleEditTask}
                                          onEditWorkout={taskOps.handleEditWorkout}
                                          onOutcomeChange={completionHandlers.handleOutcomeChange}
                                          onDuplicate={taskOps.handleDuplicateTask}
                                          onDelete={taskOps.handleDeleteTask}
                                        />
                                      )}
                                    </>
                                  );
                                })()}
                              </Box>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Drag Overlay - dynamically offset based on click position */}
        <DragOverlay
          dropAnimation={null}
          style={{
            cursor: "grabbing",
            marginLeft: `${dragAndDrop.dragState.offset.x}px`,
            marginTop: `${dragAndDrop.dragState.offset.y}px`,
          }}
        >
          {dragAndDrop.dragState.activeTask ? (
            <Box
              px={4}
              py={2}
              borderRadius="lg"
              bg={dragOverlayBg}
              borderWidth="2px"
              borderColor={dragOverlayBorder}
              boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4)"
              w="180px"
              h="40px"
              opacity={0.9}
              transform="rotate(2deg)"
            >
              <Text fontSize="sm" fontWeight="semibold" color={dragOverlayText} isTruncated>
                {dragAndDrop.dragState.activeTask.title}
              </Text>
            </Box>
          ) : dragAndDrop.dragState.activeId?.startsWith("section-") ? (
            <Box
              px={4}
              py={3}
              borderRadius="lg"
              bg={dragOverlayBg}
              borderWidth="2px"
              borderColor={dragOverlayBorder}
              boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4)"
              opacity={0.9}
            >
              <Text fontSize="sm" fontWeight="semibold" color={dragOverlayText}>
                {sections.find(s => `section-${s.id}` === dragAndDrop.dragState.activeId)?.name || "Section"}
              </Text>
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <TaskDialog
        isOpen={dialogState.taskDialogOpen}
        onClose={() => {
          dialogState.closeTaskDialog();
          dialogState.setEditingTask(null);
          dialogState.setDefaultSectionId(null);
          dialogState.setDefaultTime(null);
          dialogState.setDefaultDate(null);
        }}
        task={dialogState.editingTask}
        sections={sections}
        onSave={taskOps.handleSaveTask}
        defaultSectionId={dialogState.defaultSectionId}
        defaultTime={dialogState.defaultTime}
        defaultDate={dialogState.defaultDate}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        allTasks={tasks}
      />
      <SectionDialog
        isOpen={dialogState.sectionDialogOpen}
        onClose={() => {
          dialogState.closeSectionDialog();
          dialogState.setEditingSection(null);
        }}
        section={dialogState.editingSection}
        onSave={handleSaveSection}
      />
      <TagEditor
        isOpen={dialogState.tagEditorOpen}
        onClose={() => dialogState.setTagEditorOpen(false)}
        tags={tags}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />
      <BulkEditDialog
        isOpen={selectionState.bulkEditDialogOpen}
        onClose={() => {
          selectionState.setBulkEditDialogOpen(false);
        }}
        onSave={selectionState.handleBulkEditSave}
        sections={sections}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        selectedCount={selectionState.selectedTaskIds.size}
        selectedTasks={tasks.filter(t => selectionState.selectedTaskIds.has(t.id))}
      />
      <WorkoutModal
        task={dialogState.workoutModalTask}
        isOpen={dialogState.workoutModalOpen}
        onClose={() => {
          dialogState.setWorkoutModalOpen(false);
          dialogState.setWorkoutModalTask(null);
        }}
        onCompleteTask={async (taskId, date) => {
          // When workout is 100% complete, create a TaskCompletion record
          await createCompletion(taskId, date, {
            outcome: "completed",
          });
        }}
        currentDate={viewDate}
      />
      <WorkoutBuilder
        key={dialogState.editingWorkoutTask?.id || "new"}
        isOpen={Boolean(dialogState.editingWorkoutTask)}
        onClose={() => dialogState.setEditingWorkoutTask(null)}
        taskId={dialogState.editingWorkoutTask?.id}
        onSaveComplete={() => {
          dialogState.setEditingWorkoutTask(null);
          // Refresh tasks to get updated workout program status
          fetchTasks(true);
        }}
      />
    </Box>
  );
}
