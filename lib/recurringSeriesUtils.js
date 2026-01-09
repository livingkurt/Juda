/**
 * Utility functions for handling recurring task series splitting
 * Similar to Apple Calendar's "This occurrence only" vs "This and future occurrences"
 */

/**
 * Determines if the edit requires a scope decision
 * (only for date/time/recurrence changes, not title/color/etc)
 */
export const requiresSeriesScopeDecision = (originalTask, newValues) => {
  // Only recurring tasks with actual recurrence patterns need this
  if (!originalTask.recurrence || originalTask.recurrence.type === "none" || !originalTask.recurrence.type) {
    return false;
  }

  // Don't show dialog for non-recurring types
  if (originalTask.recurrence.type === "none") {
    return false;
  }

  // Check if date changed
  const originalDate = originalTask.recurrence.startDate?.split("T")[0];
  if (newValues.date && newValues.date !== originalDate) {
    return true;
  }

  // Check if time changed
  if (newValues.time !== undefined && newValues.time !== originalTask.time) {
    return true;
  }

  // Check if recurrence pattern changed
  if (newValues.recurrenceType && newValues.recurrenceType !== originalTask.recurrence.type) {
    return true;
  }

  // Check if days changed (for weekly)
  if (newValues.selectedDays) {
    const originalDays = originalTask.recurrence.days || [];
    const newDays = newValues.selectedDays;
    if (JSON.stringify(originalDays.sort()) !== JSON.stringify(newDays.sort())) {
      return true;
    }
  }

  // Check if monthly pattern changed
  if (newValues.monthlyMode) {
    const originalMode = originalTask.recurrence.weekPattern ? "weekPattern" : "dayOfMonth";
    if (newValues.monthlyMode !== originalMode) {
      return true;
    }
    if (newValues.monthlyMode === "dayOfMonth" && newValues.selectedDayOfMonth) {
      const originalDays = originalTask.recurrence.dayOfMonth || [];
      const newDays = newValues.selectedDayOfMonth;
      if (JSON.stringify(originalDays.sort()) !== JSON.stringify(newDays.sort())) {
        return true;
      }
    }
    if (newValues.monthlyMode === "weekPattern") {
      const originalOrdinal = originalTask.recurrence.weekPattern?.ordinal || 1;
      const originalDayOfWeek = originalTask.recurrence.weekPattern?.dayOfWeek || 0;
      if (newValues.monthlyOrdinal !== originalOrdinal || newValues.monthlyDayOfWeek !== originalDayOfWeek) {
        return true;
      }
    }
  }

  // Check if yearly pattern changed
  if (newValues.yearlyMode) {
    const originalMode = originalTask.recurrence.weekPattern ? "weekPattern" : "dayOfMonth";
    if (newValues.yearlyMode !== originalMode) {
      return true;
    }
    if (newValues.yearlyMonth !== originalTask.recurrence.month) {
      return true;
    }
    if (newValues.yearlyMode === "dayOfMonth" && newValues.yearlyDayOfMonth !== originalTask.recurrence.dayOfMonth) {
      return true;
    }
    if (newValues.yearlyMode === "weekPattern") {
      const originalOrdinal = originalTask.recurrence.weekPattern?.ordinal || 1;
      const originalDayOfWeek = originalTask.recurrence.weekPattern?.dayOfWeek || 0;
      if (newValues.yearlyOrdinal !== originalOrdinal || newValues.yearlyDayOfWeek !== originalDayOfWeek) {
        return true;
      }
    }
  }

  // Check if interval changed
  if (newValues.monthlyInterval && newValues.monthlyInterval !== (originalTask.recurrence.interval || 1)) {
    return true;
  }
  if (newValues.yearlyInterval && newValues.yearlyInterval !== (originalTask.recurrence.interval || 1)) {
    return true;
  }

  return false;
};

/**
 * Creates the exception date string from a Date object
 */
export const formatExceptionDate = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Adds an exception date to a task's recurrence
 */
export const addExceptionToRecurrence = (recurrence, exceptionDate) => {
  const exceptions = recurrence.exceptions || [];
  const dateStr = formatExceptionDate(exceptionDate);

  if (!exceptions.includes(dateStr)) {
    return {
      ...recurrence,
      exceptions: [...exceptions, dateStr],
    };
  }
  return recurrence;
};

/**
 * Sets the end date on a recurrence pattern
 */
export const setRecurrenceEndDate = (recurrence, endDate) => {
  const d = new Date(endDate);
  return {
    ...recurrence,
    endDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00.000Z`,
  };
};

/**
 * Gets the day before a given date
 */
export const getDayBefore = date => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
};

/**
 * Prepares data for "this occurrence only" edit
 * Returns: { originalTaskUpdate, newTask }
 */
export const prepareThisOccurrenceEdit = (originalTask, newValues, editDate) => {
  // Add exception to original task
  const updatedRecurrence = addExceptionToRecurrence(originalTask.recurrence, editDate);

  // Create new one-time task
  const newTask = {
    title: newValues.title || originalTask.title,
    sectionId: newValues.sectionId !== undefined ? newValues.sectionId : originalTask.sectionId,
    time: newValues.time !== undefined ? newValues.time : originalTask.time,
    duration: newValues.duration !== undefined ? newValues.duration : originalTask.duration,
    completionType: originalTask.completionType,
    content: originalTask.content,
    recurrence: {
      type: "none",
      startDate: `${formatExceptionDate(editDate)}T00:00:00.000Z`,
    },
    sourceTaskId: originalTask.id, // Track lineage (reusing existing field)
  };

  return {
    originalTaskUpdate: {
      recurrence: updatedRecurrence,
    },
    newTask,
  };
};

/**
 * Prepares data for "this and future occurrences" edit
 * Returns: { originalTaskUpdate, newTask }
 */
export const prepareFutureOccurrencesEdit = (originalTask, newValues, editDate) => {
  const dayBefore = getDayBefore(editDate);

  // End the original series the day before
  const updatedRecurrence = setRecurrenceEndDate(originalTask.recurrence, dayBefore);

  // Build new recurrence for the new task
  let newRecurrence = {
    type: newValues.recurrenceType || originalTask.recurrence.type,
    startDate: `${formatExceptionDate(editDate)}T00:00:00.000Z`,
  };

  // Copy over recurrence-specific fields based on type
  const recType = newRecurrence.type;

  if (recType === "weekly") {
    newRecurrence.days = newValues.selectedDays || originalTask.recurrence.days || [];
  } else if (recType === "monthly") {
    if (newValues.monthlyMode === "dayOfMonth") {
      newRecurrence.dayOfMonth = newValues.selectedDayOfMonth || originalTask.recurrence.dayOfMonth || [];
    } else if (newValues.monthlyMode === "weekPattern") {
      newRecurrence.weekPattern = {
        ordinal: newValues.monthlyOrdinal || originalTask.recurrence.weekPattern?.ordinal || 1,
        dayOfWeek: newValues.monthlyDayOfWeek || originalTask.recurrence.weekPattern?.dayOfWeek || 0,
      };
    }
    if (newValues.monthlyInterval || originalTask.recurrence.interval) {
      newRecurrence.interval = newValues.monthlyInterval || originalTask.recurrence.interval || 1;
    }
  } else if (recType === "yearly") {
    newRecurrence.month = newValues.yearlyMonth || originalTask.recurrence.month;
    if (newValues.yearlyMode === "dayOfMonth") {
      newRecurrence.dayOfMonth = newValues.yearlyDayOfMonth || originalTask.recurrence.dayOfMonth;
    } else if (newValues.yearlyMode === "weekPattern") {
      newRecurrence.weekPattern = {
        ordinal: newValues.yearlyOrdinal || originalTask.recurrence.weekPattern?.ordinal || 1,
        dayOfWeek: newValues.yearlyDayOfWeek || originalTask.recurrence.weekPattern?.dayOfWeek || 0,
      };
    }
    if (newValues.yearlyInterval || originalTask.recurrence.interval) {
      newRecurrence.interval = newValues.yearlyInterval || originalTask.recurrence.interval || 1;
    }
  } else if (recType === "interval") {
    newRecurrence.interval = newValues.interval || originalTask.recurrence.interval;
  }

  // Add endDate if it was in the original
  if (originalTask.recurrence.endDate) {
    newRecurrence.endDate = originalTask.recurrence.endDate;
  }

  // Create new recurring task
  const newTask = {
    title: newValues.title || originalTask.title,
    sectionId: newValues.sectionId !== undefined ? newValues.sectionId : originalTask.sectionId,
    time: newValues.time !== undefined ? newValues.time : originalTask.time,
    duration: newValues.duration !== undefined ? newValues.duration : originalTask.duration,
    completionType: originalTask.completionType,
    content: originalTask.content,
    recurrence: newRecurrence,
    sourceTaskId: originalTask.id, // Track lineage (reusing existing field)
  };

  return {
    originalTaskUpdate: {
      recurrence: updatedRecurrence,
    },
    newTask,
  };
};
