import { Sun, Sunset, Moon, Clock, Calendar, Check } from "lucide-react";

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
  { value: "sun", Icon: Sun },
  { value: "sunset", Icon: Sunset },
  { value: "moon", Icon: Moon },
  { value: "clock", Icon: Clock },
  { value: "calendar", Icon: Calendar },
  { value: "check", Icon: Check },
];

// Rainbow order: Red, Orange, Yellow, Green, Cyan, Blue, Indigo, Purple, Violet, Pink
export const TASK_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#10b981", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#a855f7", // Violet
  "#ec4899", // Pink
];
