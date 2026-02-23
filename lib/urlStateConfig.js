/**
 * URL State Configuration
 *
 * Defines bidirectional mapping between URL params and Redux uiSlice state.
 */

export const TAB_NAMES = ["tasks", "goals", "journal", "notes", "progress", "workout", "sleep", "kanban", "history"];
export const TAB_INDICES = {
  tasks: 0,
  goals: 1,
  journal: 2,
  notes: 3,
  progress: 4,
  workout: 5,
  sleep: 6,
  kanban: 7,
  history: 8,
};

const formatDateForUrl = isoString => {
  if (!isoString) return null;
  return isoString.split("T")[0];
};

const parseDateFromUrl = dateStr => {
  if (!dateStr) return null;
  // Parse as UTC to avoid timezone shifts (e.g., "2026-01-22" -> "2026-01-22T00:00:00.000Z")
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toISOString();
};

export const URL_STATE_CONFIG = {
  tab: {
    reduxKey: "mainTabIndex",
    serialize: index => TAB_NAMES[index] || "tasks",
    deserialize: tab => {
      const index = TAB_NAMES.indexOf(tab);
      return index >= 0 ? index : 0;
    },
    defaultValue: 0,
  },

  view: {
    reduxKey: "mainContentView",
    serialize: value => value || null,
    deserialize: value => value || "today",
    defaultValue: "today",
    activeTabs: [0],
  },

  date: {
    reduxKey: "selectedDate",
    serialize: formatDateForUrl,
    deserialize: parseDateFromUrl,
    defaultValue: null,
    activeTabs: [0],
  },

  calendarView: {
    reduxKey: "calendarView",
    serialize: value => (value === "day" ? null : value),
    deserialize: value => value || "day",
    defaultValue: "day",
    activeTabs: [0],
  },

  backlog: {
    reduxKey: "backlogOpen",
    serialize: open => (open ? "open" : null),
    deserialize: value => value === "open",
    defaultValue: false,
    activeTabs: [0],
  },

  search: {
    reduxKey: "todaySearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [0],
  },

  tags: {
    reduxKey: "todaySelectedTagIds",
    serialize: value => (value?.length ? value.join(",") : null),
    deserialize: value => (value ? value.split(",") : []),
    defaultValue: [],
    activeTabs: [0],
  },

  calendarSearch: {
    reduxKey: "calendarSearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [0],
  },

  calendarTags: {
    reduxKey: "calendarSelectedTagIds",
    serialize: value => (value?.length ? value.join(",") : null),
    deserialize: value => (value ? value.split(",") : []),
    defaultValue: [],
    activeTabs: [0],
  },

  kanbanDate: {
    reduxKey: "kanbanViewDate",
    serialize: formatDateForUrl,
    deserialize: parseDateFromUrl,
    defaultValue: null,
    activeTabs: [7],
  },

  kanbanSearch: {
    reduxKey: "kanbanSearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [7],
  },

  kanbanTags: {
    reduxKey: "kanbanSelectedTagIds",
    serialize: value => (value?.length ? value.join(",") : null),
    deserialize: value => (value ? value.split(",") : []),
    defaultValue: [],
    activeTabs: [7],
  },

  goalYear: {
    reduxKey: "goalsSelectedYear",
    serialize: value => (value?.toString() === new Date().getFullYear().toString() ? null : value?.toString()),
    deserialize: value => (value ? parseInt(value, 10) : new Date().getFullYear()),
    defaultValue: new Date().getFullYear(),
    activeTabs: [1],
  },

  journalDate: {
    reduxKey: "journalSelectedDate",
    serialize: formatDateForUrl,
    deserialize: parseDateFromUrl,
    defaultValue: null,
    activeTabs: [2],
  },

  journalView: {
    reduxKey: "journalView",
    serialize: value => {
      if (!value || value === "day") return null;
      return value;
    },
    deserialize: value => value || "day",
    defaultValue: "day",
    activeTabs: [2],
  },

  noteId: {
    reduxKey: "selectedNoteId",
    serialize: value => value || null,
    deserialize: value => value || null,
    defaultValue: null,
    activeTabs: [3],
  },

  folderId: {
    reduxKey: "selectedFolderId",
    serialize: value => value || null,
    deserialize: value => value || null,
    defaultValue: null,
    activeTabs: [3],
  },

  smartFolderId: {
    reduxKey: "selectedSmartFolderId",
    serialize: value => value || null,
    deserialize: value => value || null,
    defaultValue: null,
    activeTabs: [3],
  },

  progressDate: {
    reduxKey: "progressSelectedDate",
    serialize: formatDateForUrl,
    deserialize: parseDateFromUrl,
    defaultValue: null,
    activeTabs: [4],
  },

  progressView: {
    reduxKey: "progressView",
    serialize: value => {
      if (!value || value === "daily") return null;
      return value;
    },
    deserialize: value => value || "daily",
    defaultValue: "daily",
    activeTabs: [4],
  },

  historyRange: {
    reduxKey: "historyRange",
    serialize: value => (value === "month" ? null : value),
    deserialize: value => value || "month",
    defaultValue: "month",
    activeTabs: [8],
  },

  historyPage: {
    reduxKey: "historyPage",
    serialize: value => (value === 0 ? null : String(value)),
    deserialize: value => (value ? parseInt(value, 10) : 0),
    defaultValue: 0,
    activeTabs: [8],
  },

  historySearch: {
    reduxKey: "historySearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [8],
  },
};

export function getActiveParamsForTab(tabIndex) {
  return Object.entries(URL_STATE_CONFIG).filter(([key, config]) => {
    if (key === "tab") return true;
    if (!config.activeTabs) return true;
    return config.activeTabs.includes(tabIndex);
  });
}

export function isDefaultValue(config, value) {
  const defaultVal = config.defaultValue;

  if (Array.isArray(defaultVal) && Array.isArray(value)) {
    return defaultVal.length === 0 && value.length === 0;
  }

  if (defaultVal === null || defaultVal === undefined) {
    return value === null || value === undefined;
  }

  return value === defaultVal;
}
