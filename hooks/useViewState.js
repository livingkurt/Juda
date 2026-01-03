"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setMainTabIndex as setMainTabIndexAction,
  setMobileActiveView as setMobileActiveViewAction,
  setSelectedDate as setSelectedDateAction,
  setTodayViewDate as setTodayViewDateAction,
  setCalendarView as setCalendarViewAction,
  setTodaySearchTerm as setTodaySearchTermAction,
  setTodaySelectedTagIds as setTodaySelectedTagIdsAction,
  addTodaySelectedTag,
  removeTodaySelectedTag,
  setCalendarSearchTerm as setCalendarSearchTermAction,
  setCalendarSelectedTagIds as setCalendarSelectedTagIdsAction,
  addCalendarSelectedTag,
  removeCalendarSelectedTag,
} from "@/lib/store/slices/uiSlice";

/**
 * Manages view state using Redux directly
 */
export function useViewState() {
  const dispatch = useDispatch();

  // Get state from Redux
  const mainTabIndex = useSelector(state => state.ui.mainTabIndex);
  const mobileActiveView = useSelector(state => state.ui.mobileActiveView);
  const selectedDateISO = useSelector(state => state.ui.selectedDate);
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const calendarView = useSelector(state => state.ui.calendarView);
  const todaySearchTerm = useSelector(state => state.ui.todaySearchTerm);
  const todaySelectedTagIds = useSelector(state => state.ui.todaySelectedTagIds);
  const calendarSearchTerm = useSelector(state => state.ui.calendarSearchTerm);
  const calendarSelectedTagIds = useSelector(state => state.ui.calendarSelectedTagIds);

  // Convert ISO strings to Date objects
  const selectedDate = useMemo(() => (selectedDateISO ? new Date(selectedDateISO) : null), [selectedDateISO]);
  const todayViewDate = useMemo(() => (todayViewDateISO ? new Date(todayViewDateISO) : null), [todayViewDateISO]);

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

  // Setter wrappers
  const setMainTabIndex = useCallback(index => dispatch(setMainTabIndexAction(index)), [dispatch]);
  const setMobileActiveView = useCallback(view => dispatch(setMobileActiveViewAction(view)), [dispatch]);
  const setSelectedDate = useCallback(date => dispatch(setSelectedDateAction(date)), [dispatch]);
  const setTodayViewDate = useCallback(date => dispatch(setTodayViewDateAction(date)), [dispatch]);
  const setCalendarView = useCallback(view => dispatch(setCalendarViewAction(view)), [dispatch]);
  const setTodaySearchTerm = useCallback(term => dispatch(setTodaySearchTermAction(term)), [dispatch]);
  const setTodaySelectedTagIds = useCallback(ids => dispatch(setTodaySelectedTagIdsAction(ids)), [dispatch]);
  const setCalendarSearchTerm = useCallback(term => dispatch(setCalendarSearchTermAction(term)), [dispatch]);
  const setCalendarSelectedTagIds = useCallback(ids => dispatch(setCalendarSelectedTagIdsAction(ids)), [dispatch]);

  // Navigation helpers
  const goToToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dispatch(setSelectedDateAction(now));
    dispatch(setTodayViewDateAction(now));
  }, [dispatch]);

  const goToPreviousDay = useCallback(() => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    dispatch(setSelectedDateAction(newDate));
  }, [dispatch, selectedDate]);

  const goToNextDay = useCallback(() => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    dispatch(setSelectedDateAction(newDate));
  }, [dispatch, selectedDate]);

  // Calendar navigation
  const navigateCalendar = useCallback(
    dir => {
      if (calendarView === "kanban") return;
      if (!selectedDate) return;
      const d = new Date(selectedDate);
      if (calendarView === "day") d.setDate(d.getDate() + dir);
      else if (calendarView === "week") d.setDate(d.getDate() + dir * 7);
      else if (calendarView === "month") d.setMonth(d.getMonth() + dir);
      else if (calendarView === "year") d.setFullYear(d.getFullYear() + dir);
      else d.setMonth(d.getMonth() + dir);
      d.setHours(0, 0, 0, 0);
      dispatch(setSelectedDateAction(d));
    },
    [dispatch, calendarView, selectedDate]
  );

  // Today View navigation
  const navigateTodayView = useCallback(
    dir => {
      const d = new Date(todayViewDate || today);
      d.setDate(d.getDate() + dir);
      d.setHours(0, 0, 0, 0);
      dispatch(setTodayViewDateAction(d));
    },
    [dispatch, todayViewDate, today]
  );

  const handleTodayViewToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dispatch(setTodayViewDateAction(now));
  }, [dispatch]);

  const handleTodayViewDateChange = useCallback(
    date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      dispatch(setTodayViewDateAction(d));
    },
    [dispatch]
  );

  // Tag filter helpers
  const handleTodayTagSelect = useCallback(tagId => dispatch(addTodaySelectedTag(tagId)), [dispatch]);
  const handleTodayTagDeselect = useCallback(tagId => dispatch(removeTodaySelectedTag(tagId)), [dispatch]);
  const handleCalendarTagSelect = useCallback(tagId => dispatch(addCalendarSelectedTag(tagId)), [dispatch]);
  const handleCalendarTagDeselect = useCallback(tagId => dispatch(removeCalendarSelectedTag(tagId)), [dispatch]);

  const clearTodayFilters = useCallback(() => {
    dispatch(setTodaySearchTermAction(""));
    dispatch(setTodaySelectedTagIdsAction([]));
  }, [dispatch]);

  const clearCalendarFilters = useCallback(() => {
    dispatch(setCalendarSearchTermAction(""));
    dispatch(setCalendarSelectedTagIdsAction([]));
  }, [dispatch]);

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
