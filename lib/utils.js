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
  if (!task.recurrence) return false;
  const { type, days, dayOfMonth, interval, startDate } = task.recurrence;
  const dayOfWeek = date.getDay();
  const currentDayOfMonth = date.getDate();
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
