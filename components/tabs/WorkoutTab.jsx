"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Grid,
  TextField,
  CircularProgress,
} from "@mui/material";
import { FitnessCenter, Edit } from "@mui/icons-material";
import { useWorkoutTasks } from "@/hooks/useWorkoutTasks";
import { useGetWorkoutHistoryQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useViewState } from "@/hooks/useViewState";
import {
  setSelectedWorkoutTaskId,
  setWorkoutViewMode,
  setWorkoutDateRange,
  setEditingWorkoutTask,
} from "@/lib/store/slices/uiSlice";
import { WorkoutProgressCalendar } from "@/components/WorkoutProgressCalendar";
import { WorkoutExerciseProgress } from "@/components/WorkoutExerciseProgress";

const getWeekFromStart = (startDate, checkDate, totalWeeks) => {
  if (!startDate) return 1;
  const start = dayjs(startDate);
  const current = dayjs(checkDate);
  const daysDiff = current.startOf("day").diff(start.startOf("day"), "day");
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  if (!totalWeeks) return Math.max(1, weekNumber);
  return Math.min(Math.max(1, weekNumber), totalWeeks);
};

const buildSummaryStats = (completions, task, totalWeeks) => {
  const today = dayjs();
  const currentWeek = getWeekFromStart(task?.recurrence?.startDate, today, totalWeeks);

  const sessionDays = completions.filter(day => day.totalSets > 0);
  const totalSessions = sessionDays.length;
  const averageCompletion = sessionDays.length
    ? Math.round(
        (sessionDays.reduce((sum, day) => {
          if (!day.totalSets) return sum;
          return sum + day.completedSets / day.totalSets;
        }, 0) /
          sessionDays.length) *
          100
      )
    : 0;

  const sortedDates = [...sessionDays].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = 0;
  let cursor = today.startOf("day");
  for (const day of sortedDates) {
    const dayDate = dayjs(day.date);
    if (dayDate.isAfter(cursor, "day")) continue;
    if (dayDate.isSame(cursor, "day")) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
      continue;
    }
    const diff = cursor.diff(dayDate, "day");
    if (diff === 1) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
      continue;
    }
    break;
  }

  return { currentWeek, totalSessions, averageCompletion, streak };
};

const getProgramStartDate = (task, startDate, completions) => {
  if (startDate) return startDate;
  if (task?.recurrence?.startDate) return task.recurrence.startDate;
  if (completions?.length) return completions[0].date;
  return null;
};

const buildCycleOptions = (program, programStartDate) => {
  if (!program?.cycles?.length) return [];
  let weekCursor = 1;
  return program.cycles.map(cycle => {
    const weeks = cycle.numberOfWeeks === 0 ? 1 : cycle.numberOfWeeks || 1;
    const startWeek = weekCursor;
    const endWeek = weekCursor + weeks - 1;
    const startDate = programStartDate ? dayjs(programStartDate).add((startWeek - 1) * 7, "day") : null;
    const endDate = programStartDate ? dayjs(programStartDate).add(endWeek * 7 - 1, "day") : null;
    weekCursor += cycle.numberOfWeeks === 0 ? 1 : weeks;
    return {
      id: cycle.id,
      name: cycle.name || `Cycle ${cycle.order + 1}`,
      order: cycle.order,
      numberOfWeeks: cycle.numberOfWeeks === 0 ? 0 : weeks,
      startWeek,
      endWeek,
      startDate,
      endDate,
    };
  });
};

const buildExerciseIndex = cycle => {
  const index = new Map();
  if (!cycle?.sections?.length) return index;
  cycle.sections.forEach(section => {
    section.days?.forEach(day => {
      day.exercises?.forEach(exercise => {
        index.set(exercise.id, {
          ...exercise,
          sectionName: section.name,
          dayName: day.name,
          daysOfWeek: Array.isArray(day.daysOfWeek) ? day.daysOfWeek : [],
          sectionOrder: section.order ?? 0,
          dayOrder: day.order ?? 0,
          exerciseOrder: exercise.order ?? 0,
        });
      });
    });
  });
  return index;
};

const getTargetForWeek = (exercise, cycleWeek) => {
  if (!exercise) return { targetValue: "", targetUnit: "" };
  const progression = exercise.weeklyProgression?.find(item => item.week === cycleWeek);
  const targetValue = progression?.targetValue ?? exercise.targetValue ?? "";
  return { targetValue, targetUnit: exercise.unit || "" };
};

const formatValueWithUnit = (value, unit) => {
  if (value === null || value === undefined || value === "") return "";
  return unit ? `${value} ${unit}` : `${value}`;
};

const formatActualValue = set => {
  const parts = [];
  if (set.actualValue !== null && set.actualValue !== undefined) {
    parts.push(formatValueWithUnit(set.actualValue, set.unit));
  }
  if (set.time) parts.push(`time ${set.time}`);
  if (set.distance !== null && set.distance !== undefined) {
    parts.push(`distance ${formatValueWithUnit(set.distance, set.unit)}`);
  }
  if (set.pace) parts.push(`pace ${set.pace}`);
  return parts.join(" | ");
};

const toCsvValue = value => {
  if (value === null || value === undefined) return "";
  const stringValue = `${value}`;
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCycleCsv = ({ program, cycleOption, completions, programStartDate, totalWeeks }) => {
  const rows = [];
  const cycle = program?.cycles?.find(item => item.id === cycleOption.id);
  const exerciseIndex = buildExerciseIndex(cycle);

  const rangeStart = cycleOption.startDate ? cycleOption.startDate.startOf("day") : null;
  const rangeEnd = cycleOption.endDate ? cycleOption.endDate.endOf("day") : null;

  const cycleCompletions = completions.filter(day => {
    if (!rangeStart || !rangeEnd) return true;
    const current = dayjs(day.date);
    return (
      (current.isAfter(rangeStart) || current.isSame(rangeStart, "day")) &&
      (current.isBefore(rangeEnd) || current.isSame(rangeEnd, "day"))
    );
  });

  rows.push(["Cycle", cycleOption.name]);
  rows.push(["Cycle Weeks", `${cycleOption.startWeek}-${cycleOption.endWeek}`]);
  rows.push([
    "Cycle Dates",
    cycleOption.startDate && cycleOption.endDate
      ? `${cycleOption.startDate.format("YYYY-MM-DD")} to ${cycleOption.endDate.format("YYYY-MM-DD")}`
      : "Unknown",
  ]);
  rows.push(["Total Sessions", `${cycleCompletions.length}`]);
  rows.push([]);

  rows.push([
    "Cycle",
    "Cycle Week",
    "Date",
    "Session Outcome",
    "Section",
    "Day",
    "Days of Week",
    "Exercise",
    "Set #",
    "Target",
    "Actual",
    "Set Outcome",
    "Session Note",
    "Both Sides",
  ]);

  if (!cycleCompletions.length) {
    rows.push([cycleOption.name, "", "", "No completion data for this cycle", "", "", "", "", "", "", "", "", "", ""]);
  }

  cycleCompletions.forEach(day => {
    const overallWeek = programStartDate ? getWeekFromStart(programStartDate, day.date, totalWeeks) : null;
    const cycleWeek = overallWeek ? overallWeek - cycleOption.startWeek + 1 : "";
    if (day.exercises?.length) {
      const sortedExercises = [...day.exercises].sort((a, b) => {
        const detailsA = exerciseIndex.get(a.exerciseId);
        const detailsB = exerciseIndex.get(b.exerciseId);

        const sectionOrderA = detailsA?.sectionOrder ?? Number.MAX_SAFE_INTEGER;
        const sectionOrderB = detailsB?.sectionOrder ?? Number.MAX_SAFE_INTEGER;
        if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;

        const dayOrderA = detailsA?.dayOrder ?? Number.MAX_SAFE_INTEGER;
        const dayOrderB = detailsB?.dayOrder ?? Number.MAX_SAFE_INTEGER;
        if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;

        const exerciseOrderA = detailsA?.exerciseOrder ?? Number.MAX_SAFE_INTEGER;
        const exerciseOrderB = detailsB?.exerciseOrder ?? Number.MAX_SAFE_INTEGER;
        if (exerciseOrderA !== exerciseOrderB) return exerciseOrderA - exerciseOrderB;

        return (detailsA?.name || a.exerciseName || "").localeCompare(detailsB?.name || b.exerciseName || "");
      });

      sortedExercises.forEach(exercise => {
        const details = exerciseIndex.get(exercise.exerciseId);
        const target = getTargetForWeek(details, cycleWeek);
        const targetLabel = formatValueWithUnit(target.targetValue, target.targetUnit);
        const bothSidesValue = details?.bothSides ? "true" : "";
        const daysOfWeekValue = Array.isArray(details?.daysOfWeek) ? details.daysOfWeek.join("|") : "";
        if (exercise.sets?.length) {
          exercise.sets.forEach(set => {
            rows.push([
              cycleOption.name,
              cycleWeek,
              day.date,
              day.outcome || "",
              details?.sectionName || "",
              details?.dayName || "",
              daysOfWeekValue,
              details?.name || exercise.exerciseName || "Unknown exercise",
              set.setNumber,
              targetLabel,
              formatActualValue(set),
              set.outcome || "",
              day.note || "",
              bothSidesValue,
            ]);
          });
        } else {
          rows.push([
            cycleOption.name,
            cycleWeek,
            day.date,
            day.outcome || "",
            details?.sectionName || "",
            details?.dayName || "",
            daysOfWeekValue,
            details?.name || exercise.exerciseName || "Unknown exercise",
            "",
            targetLabel,
            "",
            "",
            day.note || "",
            bothSidesValue,
          ]);
        }
      });
    } else {
      rows.push([
        cycleOption.name,
        cycleWeek,
        day.date,
        day.outcome || "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        day.note || "",
        "",
      ]);
    }
  });

  return rows.map(row => row.map(toCsvValue).join(",")).join("\n");
};

const parseCsvText = csvText => {
  const rows = [];
  let current = "";
  let insideQuotes = false;
  let row = [];

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(current);
      const hasValues = row.some(value => value && value.trim() !== "");
      if (hasValues) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    const hasValues = row.some(value => value && value.trim() !== "");
    if (hasValues) rows.push(row);
  }

  return rows;
};

const parseDaysOfWeek = (value, fallbackDayName) => {
  if (value && `${value}`.trim()) {
    const parsed = `${value}`
      .split(/[|,]/)
      .map(part => Number(part.trim()))
      .filter(part => Number.isInteger(part) && part >= 0 && part <= 6);
    if (parsed.length) {
      return Array.from(new Set(parsed)).sort((a, b) => a - b);
    }
  }

  const dayLabel = fallbackDayName?.split("-")[0] || fallbackDayName || "";
  const fallbackDay = getDayOfWeekIndex(dayLabel);
  return fallbackDay === null ? [1] : [fallbackDay];
};

const buildBothSidesMap = csvText => {
  const rows = parseCsvText(csvText);
  const headerRowIndex = rows.findIndex(row => row[0]?.trim() === "Cycle" && row[1]?.trim() === "Cycle Week");
  if (headerRowIndex === -1) {
    return { error: "CSV header row not found. Please export from Juda or match the documented format." };
  }

  const headerRow = rows[headerRowIndex].map(value => value.trim());
  const headerIndex = {};
  headerRow.forEach((label, idx) => {
    headerIndex[label] = idx;
  });

  if (headerIndex["Both Sides"] === undefined) {
    return { error: "CSV is missing the Both Sides column." };
  }

  const dataRows = rows.slice(headerRowIndex + 1);
  const map = new Map();

  dataRows.forEach(row => {
    const sectionName = row[headerIndex.Section]?.trim();
    const dayName = row[headerIndex.Day]?.trim();
    const exerciseName = row[headerIndex.Exercise]?.trim();
    const bothSidesRaw = row[headerIndex["Both Sides"]] || "";
    const bothSidesValue = `${bothSidesRaw}`.trim().toLowerCase();

    if (!sectionName || !dayName || !exerciseName) return;
    const isBothSides =
      bothSidesValue === "true" || bothSidesValue === "yes" || bothSidesValue === "1" || bothSidesValue === "y";
    if (!isBothSides) return;
    const key = `${sectionName}|${dayName}|${exerciseName}`;
    map.set(key, true);
  });

  return { map };
};

const getDayOfWeekIndex = dayLabel => {
  const normalized = dayLabel.trim().toLowerCase();
  if (normalized.startsWith("sunday")) return 0;
  if (normalized.startsWith("monday")) return 1;
  if (normalized.startsWith("tuesday")) return 2;
  if (normalized.startsWith("wednesday")) return 3;
  if (normalized.startsWith("thursday")) return 4;
  if (normalized.startsWith("friday")) return 5;
  if (normalized.startsWith("saturday")) return 6;
  return null;
};

const parseTarget = targetText => {
  const trimmed = `${targetText || ""}`.trim();
  if (!trimmed) return { value: "", unit: "" };
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("MAX")) {
    const unitText = upper.replace("MAX", "").trim();
    const unit = unitText ? unitText.toLowerCase() : "";
    return { value: "MAX", unit };
  }
  const match = trimmed.match(/^([0-9.]+)\s*(.*)$/);
  if (!match) return { value: trimmed, unit: "" };
  const value = match[1];
  const unit = match[2]?.trim()?.toLowerCase() || "";
  return { value, unit };
};

const normalizeUnit = unit => {
  if (!unit) return "";
  if (unit === "rep" || unit === "reps") return "reps";
  if (unit === "sec" || unit === "secs" || unit === "seconds") return "secs";
  if (unit === "min" || unit === "mins" || unit === "minutes") return "mins";
  if (unit === "mile" || unit === "miles") return "miles";
  return unit;
};

const getExerciseType = unit => {
  if (unit === "miles") return "distance";
  if (unit === "secs" || unit === "mins") return "time";
  return "reps";
};

const getSectionType = sectionName => {
  const name = sectionName.toLowerCase();
  if (name.includes("warm")) return "warmup";
  if (name.includes("cool")) return "cooldown";
  if (name.includes("stretch")) return "stretches";
  return "workout";
};

const buildImportCycleFromCsv = csvText => {
  const rows = parseCsvText(csvText);
  const headerRowIndex = rows.findIndex(row => row[0]?.trim() === "Cycle" && row[1]?.trim() === "Cycle Week");

  if (headerRowIndex === -1) {
    return { error: "CSV header row not found. Please export from Juda or match the documented format." };
  }

  const metaRows = rows.slice(0, headerRowIndex);
  const dataRows = rows.slice(headerRowIndex + 1);
  const headerRow = rows[headerRowIndex].map(value => value.trim());
  const headerIndex = {};
  headerRow.forEach((label, idx) => {
    headerIndex[label] = idx;
  });

  const meta = {};
  metaRows.forEach(row => {
    const key = row[0]?.trim();
    const value = row[1]?.trim() || "";
    if (!key) return;
    if (key.toLowerCase().startsWith("cycle weeks")) {
      meta.cycleWeeks = value;
      return;
    }
    if (key.toLowerCase().startsWith("cycle")) {
      meta.cycleName = value || key;
    }
  });

  const sectionsMap = new Map();
  let sectionInsertIndex = 0;
  let maxWeek = 1;

  dataRows.forEach(row => {
    const cycleWeek = Number(row[headerIndex["Cycle Week"]] || 0);
    if (cycleWeek) maxWeek = Math.max(maxWeek, cycleWeek);

    const sectionName = row[headerIndex.Section]?.trim();
    const dayName = row[headerIndex.Day]?.trim();
    const daysOfWeekRaw = headerIndex["Days of Week"] !== undefined ? row[headerIndex["Days of Week"]] : "";
    const exerciseName = row[headerIndex.Exercise]?.trim();
    const setNumber = Number(row[headerIndex["Set #"]] || 1);
    const targetText = row[headerIndex.Target]?.trim() || "";
    const bothSidesRaw = row[headerIndex["Both Sides"]] || "";
    const bothSidesValue = `${bothSidesRaw}`.trim().toLowerCase();

    if (!sectionName || !dayName || !exerciseName) return;

    if (!sectionsMap.has(sectionName)) {
      sectionsMap.set(sectionName, {
        name: sectionName,
        type: getSectionType(sectionName),
        days: new Map(),
        createdIndex: sectionInsertIndex,
      });
      sectionInsertIndex += 1;
    }

    const sectionEntry = sectionsMap.get(sectionName);
    if (!sectionEntry.days.has(dayName)) {
      const parsedDaysOfWeek = parseDaysOfWeek(daysOfWeekRaw, dayName);
      sectionEntry.days.set(dayName, {
        name: dayName,
        daysOfWeek: parsedDaysOfWeek,
        exercises: new Map(),
      });
    }

    const dayEntry = sectionEntry.days.get(dayName);
    if (!dayEntry.exercises.has(exerciseName)) {
      dayEntry.exercises.set(exerciseName, {
        name: exerciseName,
        sets: setNumber || 1,
        unit: "",
        type: "reps",
        weeklyTargets: new Map(),
        bothSides:
          bothSidesValue === "true" || bothSidesValue === "yes" || bothSidesValue === "1" || bothSidesValue === "y",
      });
    }

    const exerciseEntry = dayEntry.exercises.get(exerciseName);
    exerciseEntry.sets = Math.max(exerciseEntry.sets, setNumber || 1);

    const parsedTarget = parseTarget(targetText);
    if (parsedTarget.value) {
      const normalizedUnit = normalizeUnit(parsedTarget.unit);
      if (normalizedUnit) {
        exerciseEntry.unit = normalizedUnit;
        exerciseEntry.type = getExerciseType(normalizedUnit);
      }
      if (cycleWeek) {
        exerciseEntry.weeklyTargets.set(cycleWeek, parsedTarget.value);
      }
    }
  });

  const numberOfWeeks = meta.cycleWeeks ? Number(meta.cycleWeeks.split("-").pop()) || maxWeek || 1 : maxWeek || 1;

  const sectionOrder = {
    warmup: 0,
    workout: 1,
    cooldown: 2,
    stretches: 3,
  };

  const sections = Array.from(sectionsMap.values())
    .sort((a, b) => {
      const aOrder = sectionOrder[a.type] ?? 99;
      const bOrder = sectionOrder[b.type] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.createdIndex - b.createdIndex;
    })
    .map((section, sectionIndex) => ({
      name: section.name,
      type: section.type,
      order: sectionIndex,
      days: Array.from(section.days.values())
        .sort((a, b) => {
          const aDays = a.daysOfWeek.join("|");
          const bDays = b.daysOfWeek.join("|");
          if (aDays !== bDays) return aDays.localeCompare(bDays);
          return a.name.localeCompare(b.name);
        })
        .map((day, dayIndex) => ({
          name: day.name,
          daysOfWeek: day.daysOfWeek,
          order: dayIndex,
          exercises: Array.from(day.exercises.values()).map((exercise, exerciseIndex) => {
            const weeklyProgression = Array.from(exercise.weeklyTargets.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([week, value]) => {
                if (`${value}`.toUpperCase() === "MAX") {
                  return {
                    week,
                    targetValue: null,
                    isDeload: false,
                    isTest: true,
                  };
                }
                return {
                  week,
                  targetValue: value,
                  isDeload: false,
                  isTest: false,
                };
              });
            const defaultTargetValue = weeklyProgression.length ? weeklyProgression[0].targetValue : "";
            return {
              name: exercise.name,
              type: exercise.type,
              sets: exercise.sets,
              targetValue: defaultTargetValue,
              unit: exercise.unit || "reps",
              bothSides: exercise.bothSides || false,
              order: exerciseIndex,
              weeklyProgression,
            };
          }),
        })),
    }));

  return {
    cycleName: meta.cycleName || "",
    numberOfWeeks,
    sections,
  };
};

// Removed WorkoutOption - using inline MenuItems instead

export function WorkoutTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();
  const dialogState = useDialogState();
  const viewState = useViewState();
  // Use dedicated workout endpoint (much faster - pre-filtered by API)
  const { data: workoutTasks = [] } = useWorkoutTasks();

  const selectedWorkoutTaskId = useSelector(state => state.ui.selectedWorkoutTaskId);
  const workoutViewMode = useSelector(state => state.ui.workoutViewMode);
  const workoutDateRange = useSelector(state => state.ui.workoutDateRange);
  const selectedTask = workoutTasks.find(task => task.id === selectedWorkoutTaskId) || workoutTasks[0] || null;
  const hasInitializedRef = useRef(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCycleId, setImportCycleId] = useState("");
  const [importCsvText, setImportCsvText] = useState("");
  const [importCsvName, setImportCsvName] = useState("");
  const [importError, setImportError] = useState("");
  const [bothSidesDialogOpen, setBothSidesDialogOpen] = useState(false);
  const [bothSidesCycleId, setBothSidesCycleId] = useState("");
  const [bothSidesCsvText, setBothSidesCsvText] = useState("");
  const [bothSidesCsvName, setBothSidesCsvName] = useState("");
  const [bothSidesError, setBothSidesError] = useState("");
  const [saveWorkoutProgramMutation, { isLoading: isSavingProgram }] = useSaveWorkoutProgramMutation();

  // Only set default selection once when workoutTasks first loads
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (workoutTasks.length > 0) {
      if (!selectedWorkoutTaskId) {
        dispatch(setSelectedWorkoutTaskId(workoutTasks[0].id));
      }
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selectedWorkoutTaskId, workoutTasks.length]);

  const startDate = workoutDateRange?.start || null;
  const endDate = workoutDateRange?.end || null;

  const { data: workoutHistory, isLoading: historyLoading } = useGetWorkoutHistoryQuery(
    { taskId: selectedWorkoutTaskId, startDate, endDate },
    { skip: !selectedWorkoutTaskId }
  );

  const completions = workoutHistory?.completions || [];
  const program = workoutHistory?.program || null;
  const totalWeeks = program?.cycles
    ? program.cycles.reduce((sum, cycle) => sum + (cycle.numberOfWeeks === 0 ? 0 : cycle.numberOfWeeks || 1), 0)
    : program?.numberOfWeeks || 1;
  const stats = buildSummaryStats(completions, selectedTask, totalWeeks);
  const programStartDate = getProgramStartDate(selectedTask, startDate, completions);
  const cycleOptions = buildCycleOptions(program, programStartDate);
  const importTargetCycle = program?.cycles?.find(cycle => cycle.id === importCycleId) || null;
  const importTargetHasContent = Boolean(importTargetCycle?.sections?.length);

  const handleStartWorkout = () => {
    if (!selectedTask) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    viewState.setTodayViewDate(today);
    dialogState.handleBeginWorkout(selectedTask);
  };

  const handleEditWorkout = () => {
    if (!selectedTask) return;
    dispatch(setEditingWorkoutTask(selectedTask));
  };

  const handleOpenExport = () => {
    setExportDialogOpen(true);
    const hasSelection = cycleOptions.some(cycle => cycle.id === selectedCycleId);
    if ((!selectedCycleId || !hasSelection) && cycleOptions.length) {
      setSelectedCycleId(cycleOptions[0].id);
    }
  };

  const handleExport = () => {
    const cycleOption = cycleOptions.find(cycle => cycle.id === selectedCycleId);
    if (!cycleOption) return;
    const csvContent = buildCycleCsv({
      program,
      cycleOption,
      completions,
      programStartDate,
      totalWeeks,
    });
    const fileNameBase = `${selectedTask?.title || "workout"}-${cycleOption.name}-cycle`.replace(/[^a-z0-9_-]+/gi, "_");
    const filename = `${fileNameBase}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  const handleOpenImport = () => {
    setImportDialogOpen(true);
    const hasSelection = cycleOptions.some(cycle => cycle.id === importCycleId);
    if ((!importCycleId || !hasSelection) && cycleOptions.length) {
      setImportCycleId(cycleOptions[0].id);
    }
  };

  const handleImportFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImportCsvText(e.target?.result || "");
      setImportCsvName(file.name);
      setImportError("");
    };
    reader.readAsText(file);
  };

  const handleOpenBothSides = () => {
    setBothSidesDialogOpen(true);
    const hasSelection = cycleOptions.some(cycle => cycle.id === bothSidesCycleId);
    if ((!bothSidesCycleId || !hasSelection) && cycleOptions.length) {
      setBothSidesCycleId(cycleOptions[0].id);
    }
  };

  const handleBothSidesFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setBothSidesCsvText(e.target?.result || "");
      setBothSidesCsvName(file.name);
      setBothSidesError("");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImportError("");
    if (!importCsvText) {
      setImportError("Please choose a CSV file to import.");
      return;
    }
    if (!importCycleId) {
      setImportError("Please select a cycle to import into.");
      return;
    }

    const parsed = buildImportCycleFromCsv(importCsvText);
    if (parsed.error) {
      setImportError(parsed.error);
      return;
    }

    const existingCycles = program?.cycles || [];
    const isNewCycle = importCycleId === "__new__";
    const cycleName = (isNewCycle ? parsed.cycleName : "") || (isNewCycle ? `Cycle ${existingCycles.length + 1}` : "");

    const updatedCycles = isNewCycle
      ? [
          ...existingCycles.map(cycle => ({
            ...cycle,
            sections: cycle.sections || [],
          })),
          {
            name: cycleName,
            numberOfWeeks: parsed.numberOfWeeks,
            order: existingCycles.length,
            sections: parsed.sections,
          },
        ]
      : existingCycles.map((cycle, index) =>
          cycle.id === importCycleId
            ? {
                ...cycle,
                numberOfWeeks: parsed.numberOfWeeks,
                order: index,
                sections: parsed.sections,
              }
            : {
                ...cycle,
                order: index,
                sections: cycle.sections || [],
              }
        );

    const programName = program?.name || selectedTask?.title || "Workout Program";

    try {
      await saveWorkoutProgramMutation({ taskId: selectedTask.id, name: programName, cycles: updatedCycles }).unwrap();
      setImportDialogOpen(false);
      setImportCsvText("");
      setImportCsvName("");
    } catch (error) {
      setImportError("Failed to import cycle. Please try again.");
      console.error("Failed to import workout cycle:", error);
    }
  };

  const handleApplyBothSides = async () => {
    setBothSidesError("");
    if (!bothSidesCsvText) {
      setBothSidesError("Please choose a CSV file with Both Sides data.");
      return;
    }
    if (!bothSidesCycleId) {
      setBothSidesError("Please select a cycle to update.");
      return;
    }

    const parsed = buildBothSidesMap(bothSidesCsvText);
    if (parsed.error) {
      setBothSidesError(parsed.error);
      return;
    }
    if (!parsed.map?.size) {
      setBothSidesError("No Both Sides flags found in the CSV.");
      return;
    }

    const updatedCycles = (program?.cycles || []).map(cycle => {
      if (cycle.id !== bothSidesCycleId) return cycle;
      return {
        ...cycle,
        sections: (cycle.sections || []).map(section => ({
          ...section,
          days: (section.days || []).map(day => ({
            ...day,
            exercises: (day.exercises || []).map(exercise => {
              const key = `${section.name}|${day.name}|${exercise.name}`;
              if (!parsed.map.has(key)) return exercise;
              return { ...exercise, bothSides: true };
            }),
          })),
        })),
      };
    });

    const programName = program?.name || selectedTask?.title || "Workout Program";

    try {
      await saveWorkoutProgramMutation({ taskId: selectedTask.id, name: programName, cycles: updatedCycles }).unwrap();
      setBothSidesDialogOpen(false);
      setBothSidesCsvText("");
      setBothSidesCsvName("");
    } catch (error) {
      setBothSidesError("Failed to apply Both Sides. Please try again.");
      console.error("Failed to apply bothSides flags:", error);
    }
  };

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!workoutTasks.length) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <Stack spacing={2} alignItems="center">
          <FitnessCenter sx={{ fontSize: 48, color: "text.secondary" }} />
          <Typography variant="h6">No workout tasks found</Typography>
          <Typography variant="body2" color="text.secondary">
            Create a workout task to see progress here.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Stack direction="column" spacing={2} alignItems="stretch" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="workout-select-label">Workout</InputLabel>
            <Select
              labelId="workout-select-label"
              label="Workout"
              value={selectedWorkoutTaskId || ""}
              onChange={e => {
                dispatch(setSelectedWorkoutTaskId(e.target.value));
              }}
            >
              {workoutTasks.map(task => (
                <MenuItem key={task.id} value={task.id}>
                  {task.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Edit />} onClick={handleEditWorkout}>
              Edit Workout
            </Button>
            <Button variant="outlined" onClick={handleOpenExport}>
              Export Cycle
            </Button>
            <Button variant="outlined" onClick={handleOpenImport}>
              Import Cycle
            </Button>
            <Button variant="outlined" onClick={handleOpenBothSides}>
              Apply Both Sides
            </Button>
            <Button variant="contained" startIcon={<FitnessCenter />} onClick={handleStartWorkout}>
              Start Today&apos;s Workout
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate || ""}
            onChange={event =>
              dispatch(
                setWorkoutDateRange({
                  start: event.target.value || null,
                  end: endDate || null,
                })
              )
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate || ""}
            onChange={event =>
              dispatch(
                setWorkoutDateRange({
                  start: startDate || null,
                  end: event.target.value || null,
                })
              )
            }
            InputLabelProps={{ shrink: true }}
          />
          <ToggleButtonGroup
            value={workoutViewMode}
            exclusive
            onChange={(event, value) => {
              if (value) dispatch(setWorkoutViewMode(value));
            }}
            size="small"
          >
            <ToggleButton value="calendar">Calendar</ToggleButton>
            <ToggleButton value="exercises">Exercises</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Summary */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Current Week
                </Typography>
                <Typography variant="h6">Week {stats.currentWeek}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Total Sessions
                </Typography>
                <Typography variant="h6">{stats.totalSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Avg Completion
                </Typography>
                <Typography variant="h6">{stats.averageCompletion}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Current Streak
                </Typography>
                <Typography variant="h6">{stats.streak} days</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {historyLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : workoutViewMode === "calendar" ? (
          <WorkoutProgressCalendar
            completions={completions}
            task={selectedTask}
            program={program}
            startDate={startDate}
            endDate={endDate}
            onDateSelect={date => {
              viewState.setTodayViewDate(date);
              dialogState.handleBeginWorkout(selectedTask);
            }}
          />
        ) : (
          <WorkoutExerciseProgress
            program={program}
            completions={completions}
            task={selectedTask}
            startDate={startDate}
          />
        )}
      </Box>

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Cycle</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Choose which cycle you want to export.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="cycle-select-label">Cycle</InputLabel>
            <Select
              labelId="cycle-select-label"
              label="Cycle"
              value={selectedCycleId}
              onChange={event => setSelectedCycleId(event.target.value)}
              disabled={!cycleOptions.length}
            >
              {cycleOptions.map(cycle => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name} · Weeks {cycle.startWeek}-{cycle.endWeek}
                  {cycle.startDate && cycle.endDate
                    ? ` (${cycle.startDate.format("MMM D")} - ${cycle.endDate.format("MMM D")})`
                    : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!cycleOptions.length && (
            <Typography variant="body2" color="text.secondary">
              No cycles available to export for this workout.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleExport} disabled={!selectedCycleId || !cycleOptions.length}>
            Export
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Cycle</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Choose a cycle to import into and select the CSV file.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="cycle-import-select-label">Cycle</InputLabel>
            <Select
              labelId="cycle-import-select-label"
              label="Cycle"
              value={importCycleId}
              onChange={event => setImportCycleId(event.target.value)}
            >
              {cycleOptions.map(cycle => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name} · Weeks {cycle.startWeek}-{cycle.endWeek}
                </MenuItem>
              ))}
              <MenuItem value="__new__">Create next cycle</MenuItem>
            </Select>
          </FormControl>
          {importCycleId !== "__new__" && importTargetHasContent && (
            <Alert severity="warning">Importing will replace all sections, days, and exercises in this cycle.</Alert>
          )}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" component="label">
              Choose CSV
              <input type="file" accept=".csv" hidden onChange={handleImportFile} />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {importCsvName || "No file selected"}
            </Typography>
          </Stack>
          {importError && <Alert severity="error">{importError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!importCycleId || !importCsvText || isSavingProgram}
            startIcon={isSavingProgram ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isSavingProgram ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bothSidesDialogOpen} onClose={() => setBothSidesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Both Sides</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Upload a CSV that includes the Both Sides column and choose which cycle to update.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="both-sides-cycle-select-label">Cycle</InputLabel>
            <Select
              labelId="both-sides-cycle-select-label"
              label="Cycle"
              value={bothSidesCycleId}
              onChange={event => setBothSidesCycleId(event.target.value)}
            >
              {cycleOptions.map(cycle => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name} · Weeks {cycle.startWeek}-{cycle.endWeek}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" component="label">
              Choose CSV
              <input type="file" accept=".csv" hidden onChange={handleBothSidesFile} />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {bothSidesCsvName || "No file selected"}
            </Typography>
          </Stack>
          {bothSidesError && <Alert severity="error">{bothSidesError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBothSidesDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyBothSides}
            disabled={!bothSidesCycleId || !bothSidesCsvText || isSavingProgram}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
