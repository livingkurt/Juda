export const formatTime = time => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const timeToMinutes = time => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = minutes => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h = Math.floor(clamped / 60) % 24;
  const m = Math.floor(clamped % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export const snapToIncrement = (minutes, increment = 15) =>
  Math.round(minutes / increment) * increment;

export const shouldShowOnDate = (task, date) => {
  // If task has no recurrence, it doesn't show on any date view
  if (!task.recurrence) {
    return false;
  }

  const { type, days, dayOfMonth, interval, startDate } = task.recurrence;

  // Handle one-time tasks (type === "none")
  if (type === "none") {
    if (!startDate) return false;

    const taskDate = new Date(startDate);
    taskDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return taskDate.getTime() === checkDate.getTime();
  }

  const dayOfWeek = date.getDay();
  const currentDayOfMonth = date.getDate();

  // Check startDate for all recurrence types
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate < start) return false;
  }

  switch (type) {
    case "daily":
      return true;
    case "weekly":
      return days?.includes(dayOfWeek);
    case "monthly":
      return dayOfMonth?.includes(currentDayOfMonth);
    case "interval":
      if (!startDate) return true;
      const start = new Date(startDate);
      const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    default:
      return true;
  }
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: "Sun" };
  if (hour < 17) return { text: "Good afternoon", icon: "Sunset" };
  return { text: "Good evening", icon: "Moon" };
};

/**
 * Get the full datetime for a task (combining date from recurrence and time)
 * Returns null if task has no date
 */
export const getTaskDateTime = task => {
  if (!task.recurrence?.startDate) return null;

  const taskDate = new Date(task.recurrence.startDate);

  // If task has a time, combine date + time
  if (task.time) {
    const [hours, minutes] = task.time.split(":").map(Number);
    taskDate.setHours(hours, minutes, 0, 0);
  } else {
    // If no time, set to start of day for date-only comparison
    taskDate.setHours(0, 0, 0, 0);
  }

  return taskDate;
};

/**
 * Check if a task has a future date/time
 * Returns true if task is scheduled for a future date/time
 * For tasks with date but no time, compares by date only
 */
export const hasFutureDateTime = task => {
  const taskDateTime = getTaskDateTime(task);
  if (!taskDateTime) return false;

  const now = new Date();

  // If task has no time, normalize now to start of day for date-only comparison
  if (!task.time) {
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    return taskDateTime > nowDateOnly;
  }

  // If task has time, compare full datetime
  return taskDateTime > now;
};

/**
 * Check if a task is overdue (has date/time in the past)
 * Returns true if task has a date/time that has already passed
 * For tasks with date but no time, compares by date only
 */
export const isOverdue = task => {
  const taskDateTime = getTaskDateTime(task);
  if (!taskDateTime) return false;

  const now = new Date();

  // If task has no time, normalize now to start of day for date-only comparison
  if (!task.time) {
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    return taskDateTime < nowDateOnly;
  }

  // If task has time, compare full datetime
  return taskDateTime < now;
};

// Group overlapping tasks and calculate positions for side-by-side display
export const calculateTaskPositions = (tasks, HOUR_HEIGHT) => {
  if (!tasks || tasks.length === 0) return [];

  // Convert tasks to minutes and calculate end times
  const taskMinutes = tasks.map(task => ({
    ...task,
    startMinutes: timeToMinutes(task.time),
    endMinutes: timeToMinutes(task.time) + (task.duration || 30),
  }));

  // Sort by start time
  taskMinutes.sort((a, b) => a.startMinutes - b.startMinutes);

  // Find overlapping groups using a more robust algorithm
  const positionedTasks = [];
  const columns = []; // Track end times of tasks in each column

  for (const task of taskMinutes) {
    // Find the first column where this task fits (no overlap)
    let columnIndex = columns.findIndex(
      endTime => task.startMinutes >= endTime
    );

    if (columnIndex === -1) {
      // No available column, create new one
      columnIndex = columns.length;
      columns.push(task.endMinutes);
    } else {
      // Update the column's end time
      columns[columnIndex] = task.endMinutes;
    }

    positionedTasks.push({
      ...task,
      column: columnIndex,
    });
  }

  // Calculate actual column count and widths for overlapping groups
  // Group tasks that overlap in time
  const groups = [];
  const processed = new Set();

  for (const task of positionedTasks) {
    if (processed.has(task.id)) continue;

    const group = [task];
    processed.add(task.id);

    // Find all tasks that overlap with any task in this group
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      for (const otherTask of positionedTasks) {
        if (processed.has(otherTask.id)) continue;

        // Check if otherTask overlaps with any task in the group
        const overlaps = group.some(
          groupTask =>
            otherTask.startMinutes < groupTask.endMinutes &&
            otherTask.endMinutes > groupTask.startMinutes
        );

        if (overlaps) {
          group.push(otherTask);
          processed.add(otherTask.id);
          foundNew = true;
        }
      }
    }

    groups.push(group);
  }

  // Calculate positions within each group
  const result = [];
  for (const group of groups) {
    const maxColumn = Math.max(...group.map(t => t.column)) + 1;
    const width = 100 / maxColumn;

    for (const task of group) {
      result.push({
        ...task,
        left: `${task.column * width}%`,
        width: `${width}%`,
      });
    }
  }

  return result;
};
