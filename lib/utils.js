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
  // If task has no recurrence, it's a one-time task
  if (!task.recurrence) {
    // One-time tasks need a time to show up
    if (!task.time) return false;
    // One-time tasks without recurrence don't show in calendar/today views
    // They only show in backlog
    return false;
  }

  const { type, days, dayOfMonth, interval, startDate } = task.recurrence;

  // Handle one-time tasks (type === "none")
  if (type === "none") {
    // One-time task: only show on the specific date if time is set
    if (!task.time) return false;
    if (!startDate) return false; // Need a date to show

    const taskDate = new Date(startDate);
    taskDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Show only on the exact date
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

// Group overlapping tasks and calculate positions for side-by-side display
export const calculateTaskPositions = (tasks, HOUR_HEIGHT) => {
  if (!tasks || tasks.length === 0) return [];

  // Convert tasks to minutes and group by overlapping time ranges
  const taskMinutes = tasks.map(task => ({
    ...task,
    startMinutes: timeToMinutes(task.time),
    endMinutes: timeToMinutes(task.time) + (task.duration || 30),
  }));

  // Sort by start time
  taskMinutes.sort((a, b) => a.startMinutes - b.startMinutes);

  // Group overlapping tasks
  const groups = [];
  const processed = new Set();

  taskMinutes.forEach((task, index) => {
    if (processed.has(task.id)) return;

    const group = [task];
    processed.add(task.id);

    // Find all tasks that overlap with this one
    taskMinutes.forEach((otherTask, otherIndex) => {
      if (
        otherIndex !== index &&
        !processed.has(otherTask.id) &&
        task.startMinutes < otherTask.endMinutes &&
        task.endMinutes > otherTask.startMinutes
      ) {
        group.push(otherTask);
        processed.add(otherTask.id);
      }
    });

    // Sort group by start time
    group.sort((a, b) => a.startMinutes - b.startMinutes);
    groups.push(group);
  });

  // Calculate positions for each group
  const positionedTasks = [];
  groups.forEach(group => {
    const width = 100 / group.length;
    group.forEach((task, index) => {
      positionedTasks.push({
        ...task,
        left: `${index * width}%`,
        width: `${width}%`,
      });
    });
  });

  return positionedTasks;
};
