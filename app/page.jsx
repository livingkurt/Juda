"use client";

import { useEffect, useCallback, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { AuthPage } from "@/components/AuthPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { AppHeader } from "@/components/AppHeader";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { useTasksWithDeferred } from "@/hooks/useTasksWithDeferred";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useDispatch, useSelector } from "react-redux";
import {
  setBacklogOpen,
  setBacklogWidth,
  setBacklogTagSidebarOpen,
  setNotesSidebarOpen,
  setNotesListOpen,
  setNotesSidebarWidth,
  setNotesListWidth,
  openTaskDialog,
  setMainContentView,
} from "@/lib/store/slices/uiSlice";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useViewState } from "@/hooks/useViewState";
import { useDialogState } from "@/hooks/useDialogState";
import { createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { ViewTogglesAndProgress } from "@/components/ViewTogglesAndProgress";
import { MainTabs, useLoadingTab } from "@/components/MainTabs";
import dynamic from "next/dynamic";

// Lazy load heavy components
const BulkEditDialog = dynamic(() =>
  import("@/components/BulkEditDialog").then(mod => ({ default: mod.BulkEditDialog }))
);

const TagEditor = dynamic(() => import("@/components/TagEditor").then(mod => ({ default: mod.TagEditor })));

const WorkoutModal = dynamic(() => import("@/components/WorkoutModal"));

const WorkoutBuilder = dynamic(() => import("@/components/WorkoutBuilder"));

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

const GoalsTab = dynamic(() => import("@/components/tabs/GoalsTab").then(mod => ({ default: mod.GoalsTab })), {
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

const WorkoutTab = dynamic(() => import("@/components/tabs/WorkoutTab").then(mod => ({ default: mod.WorkoutTab })), {
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

export default function DailyTasksApp() {
  const { isAuthenticated, loading: authLoading, initialized: authInitialized } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redux RTK Query hooks
  const { data: tasks = [], isLoading: tasksLoading } = useTasksWithDeferred(undefined, {
    skip: !isAuthenticated,
  });

  const { data: sections = [], isLoading: sectionsLoading } = useGetSectionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { isLoading: tagsLoading } = useGetTagsQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Completion helpers
  const { loading: completionsLoading } = useCompletionHelpers();

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
  const mainContentView = useSelector(state => state.ui.mainContentView);
  const backlogWidth = useSelector(state => state.ui.backlogWidth);
  const notesSidebarOpen = useSelector(state => state.ui.notesSidebarOpen);
  const notesListOpen = useSelector(state => state.ui.notesListOpen);
  const notesSidebarWidth = useSelector(state => state.ui.notesSidebarWidth);
  const notesListWidth = useSelector(state => state.ui.notesListWidth);
  const isLoading = tasksLoading || sectionsLoading || tagsLoading || completionsLoading || !prefsInitialized;

  // Get loadingTab state from MainTabs component
  const { loadingTab } = useLoadingTab();

  // Extract commonly used values from viewState
  const { mainTabIndex, viewDate } = viewState;

  // Initialize section expansion state (empty initial state)
  const sectionExpansionInitial = useSectionExpansion({
    sections,
    showCompletedTasks: preferences.showCompletedTasks,
    tasksBySection: {},
    viewDate,
    todaysTasks: [],
  });

  // Initialize completion handlers (for section expansion callbacks)
  const _completionHandlers = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
  });

  // Sync Redux UI state with preferences on mount
  useEffect(() => {
    if (prefsInitialized) {
      dispatch(setBacklogOpen(preferences.backlogOpen ?? true));
      dispatch(setBacklogTagSidebarOpen(preferences.backlogTagSidebarOpen ?? true));
      const derivedMainContentView =
        preferences.mainContentView ?? (preferences.showCalendar && !preferences.showDashboard ? "calendar" : "today");
      dispatch(setMainContentView(derivedMainContentView));
      dispatch(setBacklogWidth(preferences.backlogWidth ?? 500));
      dispatch(setNotesSidebarOpen(preferences.notesSidebarOpen ?? true));
      dispatch(setNotesListOpen(preferences.notesListOpen ?? true));
      dispatch(setNotesSidebarWidth(preferences.notesSidebarWidth ?? 280));
      dispatch(setNotesListWidth(preferences.notesListWidth ?? 300));
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
      updatePreference("mainContentView", mainContentView);
    }
  }, [mainContentView, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogWidth", backlogWidth);
    }
  }, [backlogWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesSidebarOpen", notesSidebarOpen);
    }
  }, [notesSidebarOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesListOpen", notesListOpen);
    }
  }, [notesListOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesSidebarWidth", notesSidebarWidth);
    }
  }, [notesSidebarWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesListWidth", notesListWidth);
    }
  }, [notesListWidth, prefsInitialized, updatePreference]);

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

      {/* Main content */}
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

          {(mainTabIndex === 1 || loadingTab === 1) && <GoalsTab isLoading={loadingTab === 1} />}

          {(mainTabIndex === 2 || loadingTab === 2) && <JournalTab isLoading={loadingTab === 2} />}

          {(mainTabIndex === 3 || loadingTab === 3) && <NotesTab isLoading={loadingTab === 3} />}

          {(mainTabIndex === 4 || loadingTab === 4) && <WorkoutTab isLoading={loadingTab === 4} />}

          {(mainTabIndex === 5 || loadingTab === 5) && <KanbanTab isLoading={loadingTab === 5} />}

          {(mainTabIndex === 6 || loadingTab === 6) && <HistoryTab isLoading={loadingTab === 6} />}
        </Box>
      </Box>

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
