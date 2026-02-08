"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { TagChip } from "./TagChip";
import { TagSelector } from "./TagSelector";
import { DAYS_OF_WEEK, DURATION_OPTIONS, PRIORITY_LEVELS } from "@/lib/constants";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export const BulkEditDialog = () => {
  const selectionState = useSelectionState();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const { tasks: allTasks = [] } = useTaskOperations();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isOpen = selectionState.bulkEditDialogOpen;
  const selectedCount = selectionState.selectedTaskIds.size;
  const selectedTasks = useMemo(() => {
    return allTasks.filter(t => selectionState.selectedTaskIds.has(t.id));
  }, [allTasks, selectionState.selectedTaskIds]);

  const handleClose = () => {
    selectionState.setBulkEditDialogOpen(false);
  };

  // Calculate common values across all selected tasks
  const commonValues = useMemo(() => {
    if (!selectedTasks || selectedTasks.length === 0) {
      return {
        sectionId: "",
        time: "",
        date: "",
        duration: "",
        recurrenceType: "",
        selectedDays: [],
        endDate: "",
        tagIds: [],
        status: "",
        priority: "",
      };
    }

    const first = selectedTasks[0];
    const common = {
      sectionId: selectedTasks.every(t => t.sectionId === first.sectionId) ? first.sectionId || "" : "",
      time: selectedTasks.every(t => t.time === first.time) ? first.time || "" : "",
      duration: selectedTasks.every(t => t.duration === first.duration) ? first.duration.toString() : "",
      status: selectedTasks.every(t => t.status === first.status) ? first.status || "" : "",
      priority: selectedTasks.every(t => t.priority === first.priority) ? first.priority || "" : "",
    };

    // Handle date from recurrence
    if (first.recurrence?.startDate) {
      const firstDate = first.recurrence.startDate.split("T")[0];
      common.date = selectedTasks.every(t => t.recurrence?.startDate?.split("T")[0] === firstDate) ? firstDate : "";
    } else {
      common.date = "";
    }

    // Handle recurrence type
    const firstRecType = first.recurrence?.type || "none";
    common.recurrenceType = selectedTasks.every(t => (t.recurrence?.type || "none") === firstRecType)
      ? firstRecType
      : "";

    // Handle weekly days
    if (firstRecType === "weekly" && first.recurrence?.days) {
      const firstDays = JSON.stringify(first.recurrence.days.sort());
      common.selectedDays = selectedTasks.every(
        t => t.recurrence?.type === "weekly" && JSON.stringify((t.recurrence.days || []).sort()) === firstDays
      )
        ? first.recurrence.days
        : [];
    } else {
      common.selectedDays = [];
    }

    // Handle end date
    if (first.recurrence?.endDate) {
      const firstEndDate = first.recurrence.endDate.split("T")[0];
      common.endDate = selectedTasks.every(t => t.recurrence?.endDate?.split("T")[0] === firstEndDate)
        ? firstEndDate
        : "";
    } else {
      common.endDate = "";
    }

    // Handle tags - find tags that ALL selected tasks have in common
    const allTaskTags = selectedTasks.map(t => (t.tags || []).map(tag => tag.id));
    if (allTaskTags.length > 0) {
      const commonTagIds = allTaskTags[0].filter(tagId => allTaskTags.every(taskTagIds => taskTagIds.includes(tagId)));
      common.tagIds = commonTagIds;
    } else {
      common.tagIds = [];
    }

    return common;
  }, [selectedTasks]);

  // Track which fields have been edited
  const [editedFields, setEditedFields] = useState(new Set());

  // Field states - use common values directly (will update when commonValues changes)
  const [sectionId, setSectionId] = useState(commonValues.sectionId);
  const [time, setTime] = useState(commonValues.time);
  const [date, setDate] = useState(commonValues.date);
  const [duration, setDuration] = useState(commonValues.duration);
  const [recurrenceType, setRecurrenceType] = useState(commonValues.recurrenceType);
  const [selectedDays, setSelectedDays] = useState(commonValues.selectedDays);
  const [endDate, setEndDate] = useState(commonValues.endDate);
  const [selectedTagIds, setSelectedTagIds] = useState(commonValues.tagIds);
  const [status, setStatus] = useState(commonValues.status);
  const [priority, setPriority] = useState(commonValues.priority);

  // Reset to common values when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset all fields to common values
      setSectionId(commonValues.sectionId);
      setTime(commonValues.time);
      setDate(commonValues.date);
      setDuration(commonValues.duration);
      setRecurrenceType(commonValues.recurrenceType);
      setSelectedDays(commonValues.selectedDays);
      setEndDate(commonValues.endDate);
      setSelectedTagIds(commonValues.tagIds);
      setStatus(commonValues.status);
      setPriority(commonValues.priority);
      setEditedFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const markFieldEdited = fieldName => {
    setEditedFields(prev => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
  };

  const handleSave = () => {
    // Only include fields that were actually edited
    const updates = {};

    if (editedFields.has("sectionId")) {
      // Handle "null" string value (No Section option)
      updates.sectionId = sectionId === "null" ? null : sectionId || null;
    }
    if (editedFields.has("time")) {
      updates.time = time || null;
    }
    if (editedFields.has("date")) {
      if (date) {
        updates.recurrence = {
          type: "none",
          startDate: `${date}T00:00:00.000Z`,
        };
      }
    }
    if (editedFields.has("duration") && duration) {
      updates.duration = parseInt(duration);
    }
    if (editedFields.has("recurrenceType") && recurrenceType) {
      if (recurrenceType === "none") {
        updates.recurrence = null;
      } else if (recurrenceType === "daily") {
        updates.recurrence = {
          type: "daily",
          ...(date && { startDate: `${date}T00:00:00.000Z` }),
          ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
        };
      } else if (recurrenceType === "weekly") {
        updates.recurrence = {
          type: "weekly",
          days: selectedDays,
          ...(date && { startDate: `${date}T00:00:00.000Z` }),
          ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
        };
      }
    }
    if (editedFields.has("endDate")) {
      if (updates.recurrence) {
        updates.recurrence.endDate = endDate ? `${endDate}T00:00:00.000Z` : null;
      }
    }
    if (editedFields.has("tags")) {
      updates.tagIds = selectedTagIds;
    }
    if (editedFields.has("status") && status) {
      updates.status = status;
    }
    if (editedFields.has("priority")) {
      // Handle "null" string value (None option)
      updates.priority = priority === "null" ? null : priority || null;
    }

    selectionState.handleBulkEditSave(updates);

    // Reset state
    setEditedFields(new Set());
    setSectionId("");
    setTime("");
    setDate("");
    setDuration("");
    setRecurrenceType("");
    setSelectedDays([]);
    setEndDate("");
    setSelectedTagIds([]);
    setStatus("");
    setPriority("");
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    handleSave();
  };

  // Convert date strings to dayjs objects for DatePicker
  const dateValue = date ? dayjs(date) : null;
  const timeValue = time ? dayjs(time, "HH:mm") : null;
  const endDateValue = endDate ? dayjs(endDate) : null;

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={isMobile ? undefined : "md"}
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: "100vh", md: "90vh" },
          maxHeight: { xs: "100vh", md: "90vh" },
          m: { xs: 0, md: "auto" },
          width: { xs: "100%", md: "600px" },
          borderRadius: { xs: 0, md: 1 },
        },
      }}
    >
      <form onSubmit={handleFormSubmit}>
        <DialogTitle>
          Bulk Edit ({selectedCount} tasks)
          <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Fields show common values across all selected tasks. Only fields you change will be updated. Fields
              showing &quot;...&quot; have different values or are empty.
            </Alert>

            {/* Section */}
            <FormControl fullWidth size="small">
              <InputLabel>Section</InputLabel>
              <Select
                value={sectionId}
                onChange={e => {
                  setSectionId(e.target.value);
                  markFieldEdited("sectionId");
                }}
                label="Section"
              >
                <MenuItem value="">
                  <em>No change</em>
                </MenuItem>
                <MenuItem value="null">
                  <em>No Section</em>
                </MenuItem>
                {sections.map(section => (
                  <MenuItem key={section.id} value={section.id}>
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date & Time */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={dateValue}
                  onChange={newDate => {
                    const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
                    setDate(dateStr);
                    markFieldEdited("date");
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Time"
                  value={timeValue}
                  onChange={newTime => {
                    const timeStr = newTime ? newTime.format("HH:mm") : "";
                    setTime(timeStr);
                    markFieldEdited("time");
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </Grid>
            </Grid>

            {/* Duration */}
            <FormControl fullWidth size="small">
              <InputLabel>Duration</InputLabel>
              <Select
                value={duration}
                onChange={e => {
                  setDuration(e.target.value);
                  markFieldEdited("duration");
                }}
                label="Duration"
              >
                <MenuItem value="">
                  <em>No change</em>
                </MenuItem>
                {DURATION_OPTIONS.map(d => (
                  <MenuItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={e => {
                  setStatus(e.target.value);
                  markFieldEdited("status");
                }}
                label="Status"
              >
                <MenuItem value="">
                  <em>No change</em>
                </MenuItem>
                <MenuItem value="todo">Todo</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="complete">Complete</MenuItem>
              </Select>
            </FormControl>

            {/* Priority */}
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                onChange={e => {
                  setPriority(e.target.value);
                  markFieldEdited("priority");
                }}
                label="Priority"
              >
                <MenuItem value="">
                  <em>No change</em>
                </MenuItem>
                {PRIORITY_LEVELS.map(level => (
                  <MenuItem key={level.value ?? "none"} value={level.value === null ? "null" : (level.value ?? "")}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Recurrence */}
            <FormControl fullWidth size="small">
              <InputLabel>Recurrence</InputLabel>
              <Select
                value={recurrenceType}
                onChange={e => {
                  setRecurrenceType(e.target.value);
                  markFieldEdited("recurrenceType");
                }}
                label="Recurrence"
              >
                <MenuItem value="">
                  <em>No change</em>
                </MenuItem>
                <MenuItem value="none">None (One-time task)</MenuItem>
                <MenuItem value="daily">Every day</MenuItem>
                <MenuItem value="weekly">Specific days</MenuItem>
              </Select>
            </FormControl>

            {/* Weekly days selector */}
            {recurrenceType === "weekly" && (
              <Box>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  Days of Week
                </Typography>
                <ToggleButtonGroup
                  value={selectedDays}
                  onChange={(e, newDays) => {
                    if (newDays !== null) {
                      setSelectedDays(newDays);
                      markFieldEdited("recurrenceType");
                    }
                  }}
                  size="small"
                  sx={{ flexWrap: "wrap", gap: 0.5 }}
                >
                  {DAYS_OF_WEEK.map(day => (
                    <ToggleButton key={day.value} value={day.value} sx={{ minWidth: 36, height: 36 }}>
                      {day.short}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            )}

            {/* End Date */}
            {recurrenceType !== "" && recurrenceType !== "none" && (
              <DatePicker
                label="End Date (Optional)"
                value={endDateValue}
                onChange={newDate => {
                  const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
                  setEndDate(dateStr);
                  markFieldEdited("endDate");
                }}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
            )}

            {/* Tags */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Tags
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  minHeight: 48,
                  cursor: "pointer",
                }}
                onClick={() => markFieldEdited("tags")}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {/* Tags - clickable to open selector */}
                  <TagSelector
                    selectedTagIds={selectedTagIds}
                    onSelectionChange={newTagIds => {
                      setSelectedTagIds(newTagIds);
                      markFieldEdited("tags");
                    }}
                    showManageButton
                    renderTrigger={handleMenuOpen =>
                      selectedTagIds.length > 0 ? (
                        <>
                          {Array.isArray(tags) &&
                            tags
                              .filter(t => selectedTagIds.includes(t.id))
                              .map(tag => (
                                <Box
                                  key={tag.id}
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMenuOpen(e);
                                  }}
                                  sx={{ cursor: "pointer" }}
                                >
                                  <TagChip tag={tag} size="sm" />
                                </Box>
                              ))}
                        </>
                      ) : null
                    }
                  />
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Common tags are shown. Add more tags to apply them to all selected tasks.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={editedFields.size === 0}>
            Update {selectedCount} Task(s)
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BulkEditDialog;
