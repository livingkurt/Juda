import { LightMode, WbTwilight, DarkMode, AccessTime, CalendarToday, Check } from "@mui/icons-material";

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", short: "S" },
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
];

export const DURATION_OPTIONS = [
  { value: 0, label: "No duration (reminder)" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

export const SECTION_ICONS = [
  { value: "sun", Icon: LightMode },
  { value: "sunset", Icon: WbTwilight },
  { value: "moon", Icon: DarkMode },
  { value: "clock", Icon: AccessTime },
  { value: "calendar", Icon: CalendarToday },
  { value: "check", Icon: Check },
];

// Tag color palette - these are the "canonical" colors stored in the database
// When displayed, they are mapped to the active theme's palette
// NOTE: Must match defaultTagColors in themes.js
export const TASK_COLORS = [
  "#6366f1", // 0: Indigo
  "#8b5cf6", // 1: Purple
  "#ec4899", // 2: Pink
  "#ef4444", // 3: Red
  "#f97316", // 4: Orange
  "#f59e0b", // 5: Amber
  "#eab308", // 6: Yellow
  "#84cc16", // 7: Lime
  "#22c55e", // 8: Green
  "#14b8a6", // 9: Teal
  "#06b6d4", // 10: Cyan
  "#3b82f6", // 11: Blue
];

export const PRIORITY_LEVELS = [
  { value: null, label: "None", color: null, icon: null, sortOrder: 5 },
  { value: "low", label: "Low", color: "#22c55e", icon: "KeyboardArrowDown", sortOrder: 4 },
  { value: "medium", label: "Medium", color: "#f59e0b", icon: "Remove", sortOrder: 3 },
  { value: "high", label: "High", color: "#ef4444", icon: "KeyboardArrowUp", sortOrder: 2 },
  { value: "urgent", label: "Urgent", color: "#dc2626", icon: "PriorityHigh", sortOrder: 1 },
];

export const getPriorityConfig = priority => {
  return PRIORITY_LEVELS.find(level => level.value === priority) || PRIORITY_LEVELS[0];
};

// Helper for ordinal suffixes
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export const ORDINAL_OPTIONS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: 5, label: "Last" },
];

export const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

export const COMPLETION_TYPES = [
  { label: "Checkbox", value: "checkbox" },
  { label: "Text Input", value: "text" },
  { label: "Selection", value: "selection" },
  { label: "Note", value: "note" },
  { label: "Workout", value: "workout" },
  { label: "Goal", value: "goal" },
  { label: "Reflection", value: "reflection" },
  { label: "Sleep", value: "sleep" },
];

export const EXERCISE_TYPES = [
  { label: "Reps", value: "reps", unit: "reps" },
  { label: "Time (seconds)", value: "time_secs", unit: "secs" },
  { label: "Time (minutes)", value: "time_mins", unit: "mins" },
  { label: "Distance (miles)", value: "distance", unit: "miles" },
];

export const WORKOUT_SECTION_TYPES = [
  { label: "Warmup", value: "warmup" },
  { label: "Main Workout", value: "workout" },
  { label: "Cool Down", value: "cooldown" },
  { label: "Stretches", value: "stretches" },
];

export const GOAL_INTERVALS = [
  { label: "Yearly", value: "yearly" },
  { label: "Monthly", value: "monthly" },
];

export const REFLECTION_INTERVALS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

// Pre-defined reflection templates
export const REFLECTION_TEMPLATES = {
  weekly: [
    { question: "Highlight of the week", order: 0 },
    { question: "Something I'm grateful for", order: 1 },
    { question: "Progress on current monthly goals", order: 2, linkedGoalType: "monthly" },
    { question: "Challenge I faced and how I handled it", order: 3 },
    { question: "One thing I want to focus on next week", order: 4 },
  ],
  monthly: [
    { question: "Highlight of the month", order: 0 },
    { question: "Something I'm grateful for this month", order: 1 },
    { question: "Progress on yearly goals (pick 2-3 most relevant)", order: 2, linkedGoalType: "yearly" },
    { question: "Challenge I faced last month and how I handled it", order: 3 },
    { question: "What behaviors moved me forward last month?", order: 4 },
    {
      question: "Goals for next month (2-4 specific things tied to yearly goals)",
      order: 5,
      allowGoalCreation: true,
      goalCreationType: "next_month",
    },
    { question: "What would your ideal month look like this month?", order: 6 },
  ],
  yearly: [
    { question: "Favorite song of the year", order: 0 },
    { question: "Favorite album of the year", order: 1 },
    { question: "Favorite new music discovered", order: 2 },
    { question: "Favorite TV show watched", order: 3 },
    { question: "Favorite purchase that made life better", order: 4 },
    { question: "Favorite food", order: 5 },
    { question: "Favorite place we ate", order: 6 },
    { question: "Favorite new/old people you got to know/reconnect with", order: 7 },
    { question: "Most memorable pop culture moment", order: 8 },
    { question: "Favorite new slang", order: 9 },
    { question: "Favorite event attended", order: 10 },
    { question: "Favorite place visited", order: 11 },
    { question: "New skill you learned", order: 12 },
    { question: "New interest or hobby", order: 13 },
    { question: "Biggest challenge", order: 14 },
    { question: "Biggest accomplishment", order: 15 },
    { question: "Favorite memory", order: 16 },
    { question: "Word of the Year", order: 17 },
    {
      question: "Goals for next year",
      order: 18,
      allowGoalCreation: true,
      goalCreationType: "next_year",
    },
    { question: "What did I constantly avoid this year? And what was the cost?", order: 19 },
    { question: "What am I really proud of this past year?", order: 20 },
    { question: "What behaviors quietly moved my life forward?", order: 21 },
    { question: "What labels about myself did I act as if they were facts?", order: 22 },
    { question: "If next year was the same as this one, what would disappoint me most?", order: 23 },
    { question: "What would your ideal year look like this year?", order: 24 },
  ],
};
