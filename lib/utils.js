export const formatTime = time => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Format date for display in table view (e.g., "Mon, Jan 1")
 */
export const formatDateDisplay = date => {
  const d = new Date(date);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Format a date as YYYY-MM-DD using local timezone (not UTC)
 * This ensures the date matches what the user sees in their calendar
 */
export const formatLocalDate = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export const snapToIncrement = (minutes, increment = 15) => Math.round(minutes / increment) * increment;

/**
 * Get the ordinal week of a day in its month (1st, 2nd, 3rd, 4th, or 5/Last)
 * @param {Date} date - The date to check
 * @returns {number} 1-5 where 5 represents "last"
 */
export const getOrdinalWeekOfMonth = date => {
  const dayOfMonth = date.getDate();
  const ordinal = Math.ceil(dayOfMonth / 7);

  // Check if this is the last occurrence of this weekday in the month
  const nextWeek = new Date(date);
  nextWeek.setDate(dayOfMonth + 7);
  if (nextWeek.getMonth() !== date.getMonth()) {
    return 5; // "Last" occurrence
  }

  return ordinal;
};

/**
 * Calculate month difference between two dates
 * @param {Date} startDate
 * @param {Date} checkDate
 * @returns {number} Number of months between dates
 */
export const getMonthsDifference = (startDate, checkDate) => {
  return (checkDate.getFullYear() - startDate.getFullYear()) * 12 + (checkDate.getMonth() - startDate.getMonth());
};

/**
 * Calculate year difference between two dates
 * @param {Date} startDate
 * @param {Date} checkDate
 * @returns {number} Number of years between dates
 */
export const getYearsDifference = (startDate, checkDate) => {
  return checkDate.getFullYear() - startDate.getFullYear();
};

export const shouldShowOnDate = (task, date) => {
  // If task has no recurrence, it doesn't show on any date view
  if (!task.recurrence) {
    return false;
  }

  const { type, days, dayOfMonth, interval, startDate, endDate, additionalDates } = task.recurrence;

  // Build checkDateStr once for reuse
  const checkDate = new Date(date);
  const checkYear = checkDate.getFullYear();
  const checkMonth = String(checkDate.getMonth() + 1).padStart(2, "0");
  const checkDay = String(checkDate.getDate()).padStart(2, "0");
  const checkDateStr = `${checkYear}-${checkMonth}-${checkDay}`;

  // Check if this date is in additionalDates (for off-schedule completions)
  if (additionalDates && Array.isArray(additionalDates)) {
    const hasAdditionalDate = additionalDates.some(additionalDate => {
      const additionalDateStr = additionalDate.split("T")[0];
      return additionalDateStr === checkDateStr;
    });
    if (hasAdditionalDate) return true;
  }

  // Handle one-time tasks (type === "none")
  if (type === "none") {
    if (!startDate) return false;

    // Extract date portion from ISO string (YYYY-MM-DD)
    const taskDateStr = startDate.split("T")[0];
    return taskDateStr === checkDateStr;
  }

  const dayOfWeek = date.getDay();
  const currentDayOfMonth = date.getDate();

  // Check startDate for all recurrence types
  if (startDate) {
    // Extract date portion from ISO string (YYYY-MM-DD)
    const startDateStr = startDate.split("T")[0];
    if (checkDateStr < startDateStr) return false;
  }

  // Check endDate for recurring tasks (not applicable for one-time tasks)
  if (endDate) {
    const endDateStr = endDate.split("T")[0];
    if (checkDateStr > endDateStr) return false;
  }

  switch (type) {
    case "daily":
      return true;
    case "weekly":
      return days?.includes(dayOfWeek);
    case "monthly": {
      // Handle weekday pattern (e.g., "2nd Tuesday")
      if (task.recurrence.weekPattern) {
        const { ordinal, dayOfWeek: patternDayOfWeek } = task.recurrence.weekPattern;
        if (dayOfWeek !== patternDayOfWeek) return false;

        const dateOrdinal = getOrdinalWeekOfMonth(date);
        // ordinal 5 means "last", so check if this is the last occurrence
        if (ordinal === 5) {
          if (dateOrdinal !== 5) return false;
        } else if (dateOrdinal !== ordinal) {
          return false;
        }
      } else {
        // Handle day-of-month pattern (e.g., "15th of every month")
        if (!dayOfMonth?.includes(currentDayOfMonth)) return false;
      }

      // Handle interval (e.g., "every 3 months")
      if (task.recurrence.interval && startDate) {
        const startParts = startDate.split("T")[0].split("-").map(Number);
        const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const monthsDiff = getMonthsDifference(start, date);
        if (monthsDiff < 0 || monthsDiff % task.recurrence.interval !== 0) return false;
      }

      return true;
    }
    case "yearly": {
      const targetMonth = task.recurrence.month; // 1-12
      if (date.getMonth() + 1 !== targetMonth) return false;

      // Handle weekday pattern (e.g., "2nd Monday of March")
      if (task.recurrence.weekPattern) {
        const { ordinal, dayOfWeek: patternDayOfWeek } = task.recurrence.weekPattern;
        if (dayOfWeek !== patternDayOfWeek) return false;

        const dateOrdinal = getOrdinalWeekOfMonth(date);
        if (ordinal === 5) {
          if (dateOrdinal !== 5) return false;
        } else if (dateOrdinal !== ordinal) {
          return false;
        }
      } else {
        // Handle specific day (e.g., "March 15")
        if (date.getDate() !== task.recurrence.dayOfMonth) return false;
      }

      // Handle interval (e.g., "every 2 years")
      if (task.recurrence.interval && startDate) {
        const startParts = startDate.split("T")[0].split("-").map(Number);
        const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const yearsDiff = getYearsDifference(start, date);
        if (yearsDiff < 0 || yearsDiff % task.recurrence.interval !== 0) return false;
      }

      return true;
    }
    case "interval": {
      if (!startDate) return true;
      // Extract date portion from ISO string (YYYY-MM-DD)
      const startDateStr = startDate.split("T")[0];
      // Reuse checkDateStr from above

      // Parse dates to compare (using UTC to avoid timezone issues)
      const startParts = startDateStr.split("-").map(Number);
      const checkParts = checkDateStr.split("-").map(Number);
      const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
      const check = new Date(Date.UTC(checkParts[0], checkParts[1] - 1, checkParts[2]));
      const diffDays = Math.floor((check - start) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    }
    default:
      return true;
  }
};

/**
 * Generate human-readable label for recurrence pattern
 * @param {Object} recurrence - The recurrence object
 * @returns {string|null} Human-readable label or null if not recurring
 */
export const getRecurrenceLabel = recurrence => {
  if (!recurrence) return null;

  switch (recurrence.type) {
    case "none":
      return null;
    case "daily":
      return "Daily";
    case "weekly": {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return recurrence.days?.map(d => dayNames[d]).join(", ") || "Weekly";
    }
    case "monthly": {
      if (recurrence.weekPattern) {
        const ordinals = ["", "1st", "2nd", "3rd", "4th", "Last"];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const prefix = recurrence.interval > 1 ? `Every ${recurrence.interval} mo, ` : "";
        return `${prefix}${ordinals[recurrence.weekPattern.ordinal]} ${dayNames[recurrence.weekPattern.dayOfWeek]}`;
      }
      const prefix = recurrence.interval > 1 ? `Every ${recurrence.interval} mo, ` : "";
      return `${prefix}${recurrence.dayOfMonth?.join(", ") || "Monthly"}`;
    }
    case "yearly": {
      const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const yearPrefix = recurrence.interval > 1 ? `Every ${recurrence.interval} yr, ` : "";
      if (recurrence.weekPattern) {
        const ordinals = ["", "1st", "2nd", "3rd", "4th", "Last"];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${yearPrefix}${ordinals[recurrence.weekPattern.ordinal]} ${dayNames[recurrence.weekPattern.dayOfWeek]} of ${monthNames[recurrence.month]}`;
      }
      return `${yearPrefix}${monthNames[recurrence.month]} ${recurrence.dayOfMonth}`;
    }
    case "interval":
      return `Every ${recurrence.interval} days`;
    default:
      return null;
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
 * Check if a task is overdue for a specific date
 * Returns true only if:
 * - Task has a time
 * - Task has NO record on that date (completed or not completed both clear overdue)
 * - The time has passed on that specific date
 * Tasks without a time are never overdue (can always be done)
 *
 * @param {Object} task - The task to check
 * @param {Date} date - The date to check overdue status for (defaults to today)
 * @param {boolean} hasRecord - Whether ANY record exists for this task on that date
 */
export const isOverdue = (task, date = null, hasRecord = false) => {
  // Tasks without a time are never overdue - they can always be done
  if (!task.time) return false;

  // If task has ANY record on this date, it's not overdue
  if (hasRecord) return false;

  // Use provided date or default to today
  const checkDate = date || new Date();
  checkDate.setHours(0, 0, 0, 0);

  // For recurring tasks, we need to calculate the datetime for the specific date being viewed
  // For non-recurring tasks, use the original startDate
  let taskDate;
  if (!task.recurrence || !task.recurrence.startDate) {
    // No recurrence - can't be overdue
    return false;
  }

  if (task.recurrence.type === "none") {
    // For one-time tasks, use the original startDate
    taskDate = new Date(task.recurrence.startDate);
  } else {
    // For recurring tasks (daily, weekly, etc.), use the checkDate (the date we're viewing)
    // The task should appear on this date based on its recurrence pattern
    taskDate = new Date(checkDate);
  }

  // Set the time on the task date
  const [hours, minutes] = task.time.split(":").map(Number);
  taskDate.setHours(hours, minutes, 0, 0);

  const now = new Date();

  // Check if the time has passed on the specific date
  return taskDate < now;
};

// Group overlapping tasks and calculate positions for side-by-side display
export const calculateTaskPositions = tasks => {
  if (!tasks || tasks.length === 0) return [];

  // Convert tasks to minutes and calculate end times
  const taskMinutes = tasks.map(task => ({
    ...task,
    startMinutes: timeToMinutes(task.time),
    endMinutes: timeToMinutes(task.time) + (task.duration ?? 30),
  }));

  // Sort by start time
  taskMinutes.sort((a, b) => a.startMinutes - b.startMinutes);

  // Find overlapping groups using a more robust algorithm
  const positionedTasks = [];
  const columns = []; // Track end times of tasks in each column

  for (const task of taskMinutes) {
    // Find the first column where this task fits (no overlap)
    let columnIndex = columns.findIndex(endTime => task.startMinutes >= endTime);

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
          groupTask => otherTask.startMinutes < groupTask.endMinutes && otherTask.endMinutes > groupTask.startMinutes
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

/**
 * Get display color for a task based on its first tag.
 * Returns null if task has no tags (component should handle as neutral/no color).
 */
export function getTaskDisplayColor(task) {
  if (task.tags && task.tags.length > 0) {
    return task.tags[0].color;
  }
  return null; // No tag = no color
}
