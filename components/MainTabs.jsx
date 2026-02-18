"use client";

import { useState, startTransition, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import {
  CheckBox as CheckSquare,
  ViewColumn as Columns,
  Flag as FlagIcon,
  MenuBook as BookOpen,
  Note as StickyNote,
  FitnessCenter,
  AccessTime as Clock,
  TrendingUp,
  Hotel,
} from "@mui/icons-material";
import { useViewState } from "@/hooks/useViewState";

// Module-level state to share loadingTab without prop drilling
let loadingTabState = null;
const loadingTabListeners = new Set();

function setLoadingTabState(value) {
  loadingTabState = value;
  loadingTabListeners.forEach(listener => listener(value));
}

/**
 * Hook to access loadingTab state
 * Used by parent component for conditional rendering
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLoadingTab() {
  const [loadingTab, setLoadingTab] = useState(loadingTabState);

  useEffect(() => {
    const listener = value => setLoadingTab(value);
    loadingTabListeners.add(listener);
    return () => {
      loadingTabListeners.delete(listener);
    };
  }, []);

  return { loadingTab, setLoadingTab: setLoadingTabState };
}

export function MainTabs() {
  const { mainTabIndex, setMainTabIndex } = useViewState();
  const [loadingTab, setLoadingTab] = useState(null);

  // Sync local state with module-level state
  useEffect(() => {
    setLoadingTabState(loadingTab);
  }, [loadingTab]);

  const handleTabChange = (e, newValue) => {
    setMainTabIndex(newValue);
    setLoadingTab(newValue);
    startTransition(() => {
      setTimeout(() => setLoadingTab(null), 150);
    });
  };

  // Tab indices:
  // 0 = Tasks, 1 = Goals, 2 = Journal, 3 = Notes, 4 = Progress, 5 = Workout, 6 = Sleep, 7 = Kanban, 8 = History

  return (
    <Box>
      <Tabs value={mainTabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
        <Tab
          icon={<CheckSquare fontSize="small" />}
          iconPosition="start"
          label="Tasks"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<FlagIcon fontSize="small" />}
          iconPosition="start"
          label="Goals"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<BookOpen fontSize="small" />}
          iconPosition="start"
          label="Journal"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<StickyNote fontSize="small" />}
          iconPosition="start"
          label="Notes"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<TrendingUp fontSize="small" />}
          iconPosition="start"
          label="Progress"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<FitnessCenter fontSize="small" />}
          iconPosition="start"
          label="Workout"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<Hotel fontSize="small" />}
          iconPosition="start"
          label="Sleep"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<Columns fontSize="small" />}
          iconPosition="start"
          label="Kanban"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<Clock fontSize="small" />}
          iconPosition="start"
          label="History"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
      </Tabs>
    </Box>
  );
}
