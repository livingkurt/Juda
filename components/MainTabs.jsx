"use client";

import { useState, useMemo, startTransition, useEffect } from "react";
import { Box, Badge, Tabs, Tab } from "@mui/material";
import {
  CheckBox as CheckSquare,
  ViewColumn as Columns,
  MenuBook as BookOpen,
  Note as StickyNote,
  AccessTime as Clock,
} from "@mui/icons-material";
import { useViewState } from "@/hooks/useViewState";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";

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

  // Get tasks directly from RTK Query
  const { data: tasks = [] } = useGetTasksQuery();

  // Compute journal tasks
  const journalTasks = useMemo(() => {
    const journalTagNames = ["daily journal", "yearly reflection", "monthly reflection", "weekly reflection"];

    return tasks.filter(task => {
      if (task.completionType !== "text") return false;
      return task.tags?.some(tag => {
        const tagName = (tag.name || "").toLowerCase();
        return journalTagNames.includes(tagName);
      });
    });
  }, [tasks]);

  // Compute note tasks
  const noteTasks = useMemo(() => {
    return tasks.filter(task => task.completionType === "note");
  }, [tasks]);

  const handleTabChange = (e, newValue) => {
    setMainTabIndex(newValue);
    setLoadingTab(newValue);
    startTransition(() => {
      setTimeout(() => setLoadingTab(null), 150);
    });
  };

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
          icon={<Columns fontSize="small" />}
          iconPosition="start"
          label="Kanban"
          sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
        />
        <Tab
          icon={<BookOpen fontSize="small" />}
          iconPosition="start"
          label={
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}>
              <Box component="span" sx={{ mr: 1 }}>
                Journal
              </Box>
              {journalTasks.length > 0 && (
                <Badge
                  badgeContent={journalTasks.length}
                  color="warning"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: { xs: "0.625rem", md: "0.75rem" },
                      height: { xs: 16, md: 18 },
                      minWidth: { xs: 16, md: 18 },
                    },
                  }}
                />
              )}
            </Box>
          }
          sx={{
            fontSize: { xs: "0.875rem", md: "1rem" },
            minHeight: { xs: 48, md: 64 },
            "& .MuiTab-wrapper": {
              width: "100%",
            },
          }}
        />
        <Tab
          icon={<StickyNote fontSize="small" />}
          iconPosition="start"
          label={
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}>
              <Box component="span" sx={{ mr: 1 }}>
                Notes
              </Box>
              {noteTasks.length > 0 && (
                <Badge
                  badgeContent={noteTasks.length}
                  color="secondary"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: { xs: "0.625rem", md: "0.75rem" },
                      height: { xs: 16, md: 18 },
                      minWidth: { xs: 16, md: 18 },
                    },
                  }}
                />
              )}
            </Box>
          }
          sx={{
            fontSize: { xs: "0.875rem", md: "1rem" },
            minHeight: { xs: 48, md: 64 },
            "& .MuiTab-wrapper": {
              width: "100%",
            },
          }}
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
