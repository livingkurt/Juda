// Default user preferences - used when user has no saved preferences
export const DEFAULT_PREFERENCES = {
  // Theme
  colorMode: "dark",
  themeId: "default",

  // Layout
  showDashboard: true,
  showCalendar: true,
  backlogOpen: true,
  backlogWidth: 500,
  todayViewWidth: 600,
  notesSidebarOpen: true,
  notesSidebarWidth: 280,
  notesListOpen: true,
  notesListWidth: 300,

  // Calendar
  calendarView: "week",
  calendarZoom: {
    day: 1.0,
    week: 1.0,
    month: 1.0,
    year: 1.0,
  },

  // Task visibility - Today view
  showCompletedTasks: true,

  // Task visibility - Calendar views
  showRecurringTasks: {
    day: true,
    week: true,
    month: true,
    year: true,
  },
  showCompletedTasksCalendar: {
    day: true,
    week: true,
    month: true,
    year: true,
  },
  showStatusTasks: {
    day: true,
    week: true,
    month: true,
    year: true,
  },
};

// Merge user preferences with defaults (handles missing/new preference keys)
export function mergeWithDefaults(userPrefs = {}) {
  return {
    ...DEFAULT_PREFERENCES,
    ...userPrefs,
    // Deep merge nested objects
    calendarZoom: {
      ...DEFAULT_PREFERENCES.calendarZoom,
      ...(userPrefs.calendarZoom || {}),
    },
    showRecurringTasks: {
      ...DEFAULT_PREFERENCES.showRecurringTasks,
      ...(userPrefs.showRecurringTasks || {}),
    },
    showCompletedTasksCalendar: {
      ...DEFAULT_PREFERENCES.showCompletedTasksCalendar,
      ...(userPrefs.showCompletedTasksCalendar || {}),
    },
    showStatusTasks: {
      ...DEFAULT_PREFERENCES.showStatusTasks,
      ...(userPrefs.showStatusTasks || {}),
    },
  };
}
