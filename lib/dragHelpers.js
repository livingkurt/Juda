// Helper to parse droppable IDs consistently
export const parseDroppableId = droppableId => {
  if (droppableId === "backlog") {
    return { type: "backlog" };
  }

  // Calendar droppables use format: "calendar-{view}-{subtype}|{date}"
  // Using pipe instead of colon to avoid conflicts with ISO dates
  if (droppableId.startsWith("calendar-")) {
    const [prefix, dateStr] = droppableId.split("|");
    const parts = prefix.split("-");
    const view = parts[1]; // "day" or "week"
    const isUntimed = parts[2] === "untimed";

    return {
      type: "calendar",
      view,
      isUntimed,
      // Store the ISO date string directly to avoid timezone conversion issues
      dateStr: dateStr || null,
      // Also provide a Date object for compatibility, but callers should prefer dateStr
      date: dateStr ? new Date(dateStr) : null,
    };
  }

  // Today view sections use format: "today-section|{sectionId}"
  if (droppableId.startsWith("today-section|")) {
    const sectionId = droppableId.split("|")[1];
    return { type: "today-section", sectionId };
  }

  // Task as drop target (for combining tasks) - format: "task|{taskId}"
  if (droppableId.startsWith("task|")) {
    const taskId = droppableId.split("|")[1];
    return { type: "task-target", taskId };
  }

  // Subtask within a task (for reordering) - format: "subtask|{parentTaskId}|{subtaskId}"
  if (droppableId.startsWith("subtask|")) {
    const [, parentTaskId, subtaskId] = droppableId.split("|");
    return { type: "subtask", parentTaskId, subtaskId };
  }

  // Legacy: assume it's a section ID for backwards compatibility
  return { type: "today-section", sectionId: droppableId };
};

// Helper to create droppable IDs
// Uses local date components to avoid timezone conversion issues
const formatDateForDroppable = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

export const createDroppableId = {
  backlog: () => "backlog",
  todaySection: sectionId => `today-section|${sectionId}`,
  calendarDay: date => `calendar-day|${formatDateForDroppable(date)}`,
  calendarDayUntimed: date => `calendar-day-untimed|${formatDateForDroppable(date)}`,
  calendarWeek: date => `calendar-week|${formatDateForDroppable(date)}`,
  calendarWeekUntimed: date => `calendar-week-untimed|${formatDateForDroppable(date)}`,
  taskTarget: taskId => `task|${taskId}`,
  subtask: (parentTaskId, subtaskId) => `subtask|${parentTaskId}|${subtaskId}`,
  subtaskContainer: parentTaskId => `subtask-container|${parentTaskId}`,
};

// Helper to create context-aware draggable IDs
// This ensures each task instance has a unique ID based on its context
export const createDraggableId = {
  backlog: taskId => `task-${taskId}-backlog`,
  todaySection: (taskId, sectionId) => `task-${taskId}-today-section-${sectionId}`,
  calendarUntimed: (taskId, date) => `task-${taskId}-calendar-untimed-${date.toISOString()}`,
  calendarTimed: (taskId, date) => `task-${taskId}-calendar-timed-${date.toISOString()}`,
};

// Helper to extract task ID from context-aware draggable ID
export const extractTaskId = draggableId => {
  // Handle subtask draggable IDs: "subtask|{parentTaskId}|{subtaskId}"
  if (draggableId.startsWith("subtask|")) {
    const parts = draggableId.split("|");
    return parts[2]; // Return the subtask ID (which is a task ID)
  }

  // All task draggable IDs must be context-aware: "task-{taskId}-{context}"
  if (!draggableId.startsWith("task-")) {
    throw new Error(
      `Invalid draggableId format: ${draggableId}. Expected format: task-{taskId}-{context} or subtask|{parentId}|{subtaskId}`
    );
  }

  // Remove "task-" prefix
  const withoutPrefix = draggableId.substring(5);

  // Find the task ID by looking for known context suffixes
  // Format: {taskId}-{context}
  const suffixes = ["-backlog", "-today-section-", "-calendar-untimed-", "-calendar-timed-"];

  for (const suffix of suffixes) {
    const index = withoutPrefix.indexOf(suffix);
    if (index !== -1) {
      return withoutPrefix.substring(0, index);
    }
  }

  // If no known suffix found, this is an error
  throw new Error(`Could not extract task ID from draggableId: ${draggableId}. Unknown context format.`);
};
