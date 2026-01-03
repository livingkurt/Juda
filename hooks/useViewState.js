"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * Manages view state: active tabs, dates, zoom, filters
 */
export function useViewState(preferences = {}) {
  const {
    showCompletedTasks = true,
    calendarView: defaultCalendarView = "day",
    calendarZoom: defaultZoom = 1.0,
  } = preferences;

  // Tab state
  const [mainTabIndex, setMainTabIndex] = useState(0); // 0 = Tasks, 1 = Kanban, 2 = Notes, 3 = History

  // Date state - use lazy initializer to avoid hydration mismatch
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window === "undefined") return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [todayViewDate, setTodayViewDate] = useState(() => {
    if (typeof window === "undefined") return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  // Calendar view state
  const [calendarView, setCalendarView] = useState(defaultCalendarView);
  const [zoom, setZoom] = useState(defaultZoom);
  const [showCompleted, setShowCompleted] = useState(showCompletedTasks);

  // Search and filter state
  const [todaySearchTerm, setTodaySearchTerm] = useState("");
  const [todaySelectedTagIds, setTodaySelectedTagIds] = useState([]);
  const [calendarSearchTerm, setCalendarSearchTerm] = useState("");
  const [calendarSelectedTagIds, setCalendarSelectedTagIds] = useState([]);

  // Mobile view state
  const [mobileActiveView, setMobileActiveView] = useState("today");

  // Today reference (stable)
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  // View date (todayViewDate or today)
  const viewDate = useMemo(() => {
    return todayViewDate || today;
  }, [todayViewDate, today]);

  // Navigation helpers
  const goToToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setSelectedDate(now);
    setTodayViewDate(now);
  }, []);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      if (!prev) return prev;
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      if (!prev) return prev;
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  // Calendar navigation
  const navigateCalendar = useCallback(
    dir => {
      if (calendarView === "kanban") return; // Kanban view doesn't have date navigation
      setSelectedDate(prev => {
        if (!prev) return prev;
        const d = new Date(prev);
        if (calendarView === "day") d.setDate(d.getDate() + dir);
        else if (calendarView === "week") d.setDate(d.getDate() + dir * 7);
        else if (calendarView === "month") d.setMonth(d.getMonth() + dir);
        else if (calendarView === "year") d.setFullYear(d.getFullYear() + dir);
        else d.setMonth(d.getMonth() + dir);
        d.setHours(0, 0, 0, 0);
        return d;
      });
    },
    [calendarView]
  );

  // Today View navigation
  const navigateTodayView = useCallback(dir => {
    setTodayViewDate(prev => {
      if (!prev) return prev;
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  const handleTodayViewToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setTodayViewDate(now);
  }, []);

  const handleTodayViewDateChange = useCallback(date => {
    setTodayViewDate(date);
  }, []);

  // Zoom helpers
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 2.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  // Tag filter helpers
  const handleTodayTagSelect = useCallback(tagId => {
    setTodaySelectedTagIds(prev => [...prev, tagId]);
  }, []);

  const handleTodayTagDeselect = useCallback(tagId => {
    setTodaySelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  const handleCalendarTagSelect = useCallback(tagId => {
    setCalendarSelectedTagIds(prev => [...prev, tagId]);
  }, []);

  const handleCalendarTagDeselect = useCallback(tagId => {
    setCalendarSelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  const clearTodayFilters = useCallback(() => {
    setTodaySearchTerm("");
    setTodaySelectedTagIds([]);
  }, []);

  const clearCalendarFilters = useCallback(() => {
    setCalendarSearchTerm("");
    setCalendarSelectedTagIds([]);
  }, []);

  // Get calendar title based on current view and date
  const getCalendarTitle = useCallback(() => {
    if (!selectedDate) return "";
    if (calendarView === "kanban") return "Kanban";
    if (calendarView === "day")
      return selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    if (calendarView === "week") {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
    if (calendarView === "year") {
      return selectedDate.getFullYear().toString();
    }
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, calendarView]);

  return {
    // Tab state
    mainTabIndex,
    setMainTabIndex,

    // Date state
    today,
    selectedDate,
    setSelectedDate,
    todayViewDate,
    setTodayViewDate,
    viewDate,

    // Navigation
    goToToday,
    goToPreviousDay,
    goToNextDay,
    navigateCalendar,
    navigateTodayView,
    handleTodayViewToday,
    handleTodayViewDateChange,

    // Calendar view
    calendarView,
    setCalendarView,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    showCompleted,
    setShowCompleted,

    // Search/filter - Today
    todaySearchTerm,
    setTodaySearchTerm,
    todaySelectedTagIds,
    setTodaySelectedTagIds,
    handleTodayTagSelect,
    handleTodayTagDeselect,
    clearTodayFilters,

    // Search/filter - Calendar
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    setCalendarSelectedTagIds,
    handleCalendarTagSelect,
    handleCalendarTagDeselect,
    clearCalendarFilters,

    // Mobile
    mobileActiveView,
    setMobileActiveView,

    // Calendar title
    getCalendarTitle,
  };
}
