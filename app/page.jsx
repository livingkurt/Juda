"use client";

import { useEffect, useCallback, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { AuthPage } from "@/components/AuthPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { AppHeader } from "@/components/AppHeader";
import { DragOverlayContent } from "@/components/DragOverlayContent";
import { DndContext, DragOverlay, pointerWithin, closestCenter } from "@dnd-kit/core";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useUpdateCompletionMutation,
} from "@/lib/store/api/completionsApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useDispatch, useSelector } from "react-redux";
import {
  setBacklogOpen,
  setShowDashboard,
  setShowCalendar,
  setBacklogWidth,
  setBacklogTagSidebarOpen,
  setTodayViewWidth,
  openTaskDialog,
} from "@/lib/store/slices/uiSlice";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useViewState } from "@/hooks/useViewState";
import { useDialogState } from "@/hooks/useDialogState";
import { createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { ViewTogglesAndProgress } from "@/components/ViewTogglesAndProgress";
import { MainTabs, useLoadingTab } from "@/components/MainTabs";
import dynamic from "next/dynamic";

// Lazy load heavy components
const BulkEditDialog = dynamic(
  () => import("@/components/BulkEditDialog").then(mod => ({ default: mod.BulkEditDialog })),
  {
    loading: () => (
      <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    ),
    ssr: false,
  }
);

const TagEditor = dynamic(() => import("@/components/TagEditor").then(mod => ({ default: mod.TagEditor })), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const WorkoutModal = dynamic(() => import("@/components/WorkoutModal"), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const WorkoutBuilder = dynamic(() => import("@/components/WorkoutBuilder"), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

// Lazy load tab components
const TasksTab = dynamic(() => import("@/components/tabs/TasksTab").then(mod => ({ default: mod.TasksTab })), {
  loading: () => (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={48} />
    </Box>
  ),
  ssr: false,
});

const KanbanTab = dynamic(() => import("@/components/tabs/KanbanTab").then(mod => ({ default: mod.KanbanTab })), {
  loading: () => (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={48} />
    </Box>
  ),
  ssr: false,
});

const JournalTab = dynamic(() => import("@/components/tabs/JournalTab").then(mod => ({ default: mod.JournalTab })), {
  loading: () => (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={48} />
    </Box>
  ),
  ssr: false,
});

const NotesTab = dynamic(() => import("@/components/tabs/NotesTab").then(mod => ({ default: mod.NotesTab })), {
  loading: () => (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={48} />
    </Box>
  ),
  ssr: false,
});

const HistoryTab = dynamic(() => import("@/components/tabs/HistoryTab").then(mod => ({ default: mod.HistoryTab })), {
  loading: () => (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={48} />
    </Box>
  ),
  ssr: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

// Custom collision detection that prioritizes sortable reordering
const customCollisionDetection = args => {
  const activeData = args.active?.data?.current;
  const isSortable = activeData?.type === "TASK" || activeData?.type === "SUBTASK" || activeData?.type === "SECTION";

  if (isSortable) {
    const closestCollisions = closestCenter(args);
    if (closestCollisions.length > 0) {
      return closestCollisions;
    }
  }

  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : [];
};

export default function DailyTasksApp() {
  const { isAuthenticated, loading: authLoading, initialized: authInitialized } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redux RTK Query hooks
  const { data: tasks = [], isLoading: tasksLoading } = useGetTasksQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [_createTaskMutation] = useCreateTaskMutation();
  const [_updateTaskMutation] = useUpdateTaskMutation();
  const [_deleteTaskMutation] = useDeleteTaskMutation();
  const [reorderTaskMutation] = useReorderTaskMutation();

  const { data: sections = [], isLoading: sectionsLoading } = useGetSectionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { isLoading: tagsLoading } = useGetTagsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [_createCompletionMutation] = useCreateCompletionMutation();
  const [_deleteCompletionMutation] = useDeleteCompletionMutation();
  const [_updateCompletionMutation] = useUpdateCompletionMutation();

  // Completion helpers
  const { loading: completionsLoading } = useCompletionHelpers();

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

  const fetchCompletions = useCallback(() => {
    return Promise.resolve();
  }, []);

  // Get preferences from context
  const { preferences, initialized: prefsInitialized, updatePreference } = usePreferencesContext();

  // Get UI state from Redux
  const dispatch = useDispatch();

  // Use state hooks
  const viewState = useViewState();
  const dialogState = useDialogState();

  // Panel visibility and width from Redux
  const backlogOpen = useSelector(state => state.ui.backlogOpen);
  const backlogTagSidebarOpen = useSelector(state => state.ui.backlogTagSidebarOpen);
  const showDashboard = useSelector(state => state.ui.showDashboard);
  const showCalendar = useSelector(state => state.ui.showCalendar);
  const backlogWidth = useSelector(state => state.ui.backlogWidth);
  const todayViewWidth = useSelector(state => state.ui.todayViewWidth);
  const isLoading = tasksLoading || sectionsLoading || tagsLoading || completionsLoading || !prefsInitialized;

  // Get loadingTab state from MainTabs component
  const { loadingTab } = useLoadingTab();

  // Extract commonly used values from viewState
  const { mainTabIndex, viewDate } = viewState;

  // Initialize section expansion state
  const sectionExpansionInitial = useSectionExpansion({
    sections,
    showCompletedTasks: preferences.showCompletedTasks,
    tasksBySection: {},
    viewDate,
  });

  // Sync Redux UI state with preferences on mount
  useEffect(() => {
    if (prefsInitialized) {
      dispatch(setBacklogOpen(preferences.backlogOpen ?? true));
      dispatch(setBacklogTagSidebarOpen(preferences.backlogTagSidebarOpen ?? true));
      dispatch(setShowDashboard(preferences.showDashboard ?? true));
      dispatch(setShowCalendar(preferences.showCalendar ?? true));
      dispatch(setBacklogWidth(preferences.backlogWidth ?? 500));
      dispatch(setTodayViewWidth(preferences.todayViewWidth ?? 600));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsInitialized, dispatch]);

  // Sync Redux UI state changes back to preferences
  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogOpen", backlogOpen);
    }
  }, [backlogOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogTagSidebarOpen", backlogTagSidebarOpen);
    }
  }, [backlogTagSidebarOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("showDashboard", showDashboard);
    }
  }, [showDashboard, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("showCalendar", showCalendar);
    }
  }, [showCalendar, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogWidth", backlogWidth);
    }
  }, [backlogWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("todayViewWidth", todayViewWidth);
    }
  }, [todayViewWidth, prefsInitialized, updatePreference]);

  // Load completions on mount
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Keyboard shortcut: CMD+E (or CTRL+E) to open task dialog
  useEffect(() => {
    const handleKeyDown = e => {
      const target = e.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && !isInput) {
        e.preventDefault();
        dispatch(openTaskDialog());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch]);

  // Initialize completion handlers
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
  });

  // Extract task filters
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Extract status handlers
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });

  const tasksBySection = taskFilters.tasksBySection;
  const backlogTasks = taskFilters.backlogTasks;

  // Extract drag and drop handlers
  const dragAndDrop = useDragAndDrop({
    backlogTasks,
    tasksBySection,
    handleStatusChange: statusHandlers.handleStatusChange,
    reorderTask,
  });

  // Drag handlers
  const handleDragOver = dragAndDrop.handleDragOver;
  const handleDragEndNew = dragAndDrop.handleDragEndNew;

  // Auth checks - only show loading after mount to prevent hydration mismatch
  if (!mounted || !authInitialized || authLoading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const hasData = tasks.length > 0 || sections.length > 0;
  if (isLoading || !hasData) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: { xs: "auto", md: "100vh" },
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "auto", md: "hidden" },
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: { xs: 1, md: 0 },
          p: { xs: 1, md: 2 },
        }}
      >
        <AppHeader />

        {/* Main Tabs */}
        <MainTabs />

        {/* View toggles and progress bar - only show in Tasks tab, hide on mobile */}
        <ViewTogglesAndProgress />
      </Box>

      {/* Main content with DndContext */}
      <DndContext
        sensors={dragAndDrop.sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={dragAndDrop.handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndNew}
      >
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: { xs: "visible", md: "hidden" },
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {(mainTabIndex === 0 || loadingTab === 0) && <TasksTab />}

            {(mainTabIndex === 1 || loadingTab === 1) && (
              <KanbanTab createDraggableId={createDraggableId} isLoading={loadingTab === 1} />
            )}

            {(mainTabIndex === 2 || loadingTab === 2) && <JournalTab isLoading={loadingTab === 2} />}

            {(mainTabIndex === 3 || loadingTab === 3) && <NotesTab isLoading={loadingTab === 3} />}

            {(mainTabIndex === 4 || loadingTab === 4) && <HistoryTab isLoading={loadingTab === 4} />}
          </Box>
        </Box>

        {/* Drag Overlay */}
        <DragOverlay
          dropAnimation={null}
          style={{
            cursor: "grabbing",
            marginLeft: `${dragAndDrop.dragState.offset.x}px`,
            marginTop: `${dragAndDrop.dragState.offset.y}px`,
          }}
        >
          <DragOverlayContent dragState={dragAndDrop.dragState} />
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <TaskDialog />
      <SectionDialog />
      <TagEditor />
      <BulkEditDialog />
      <WorkoutModal />
      <WorkoutBuilder key={dialogState.editingWorkoutTask?.id || "new"} />
      <OfflineIndicator />
      <SyncStatusIndicator />
    </Box>
  );
}
