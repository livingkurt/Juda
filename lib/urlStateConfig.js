/**
 * URL State Configuration
 *
 * Defines bidirectional mapping between URL params and Redux uiSlice state.
 */

export const TAB_NAMES = ["tasks", "kanban", "journal", "notes", "workout", "goals", "history"];
export const TAB_INDICES = { tasks: 0, kanban: 1, journal: 2, notes: 3, workout: 4, goals: 5, history: 6 };

const formatDateForUrl = isoString => {
  if (!isoString) return null;
  return isoString.split("T")[0];
};

const parseDateFromUrl = dateStr => {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
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
    activeTabs: [1],
  },

  kanbanSearch: {
    reduxKey: "kanbanSearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [1],
  },

  kanbanTags: {
    reduxKey: "kanbanSelectedTagIds",
    serialize: value => (value?.length ? value.join(",") : null),
    deserialize: value => (value ? value.split(",") : []),
    defaultValue: [],
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
    serialize: value => (value === "day" ? null : value),
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

  historyRange: {
    reduxKey: "historyRange",
    serialize: value => (value === "month" ? null : value),
    deserialize: value => value || "month",
    defaultValue: "month",
    activeTabs: [6],
  },

  historyPage: {
    reduxKey: "historyPage",
    serialize: value => (value === 0 ? null : String(value)),
    deserialize: value => (value ? parseInt(value, 10) : 0),
    defaultValue: 0,
    activeTabs: [6],
  },

  historySearch: {
    reduxKey: "historySearchTerm",
    serialize: value => value || null,
    deserialize: value => value || "",
    defaultValue: "",
    activeTabs: [6],
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
