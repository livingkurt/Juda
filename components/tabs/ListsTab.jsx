"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { Add, PlaylistAdd } from "@mui/icons-material";
import { useGetListTasksQuery, useUseListTemplateMutation, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import { PRIORITY_LEVELS } from "@/lib/constants";
import { openTaskDialog, openEditTaskDialog } from "@/lib/store/slices/uiSlice";
import { TagSelector } from "@/components/TagSelector";

function buildRecurrence(dateValue) {
  if (!dateValue) return null;
  const dateStr = dayjs(dateValue).format("YYYY-MM-DD");
  return {
    type: "none",
    startDate: `${dateStr}T00:00:00.000Z`,
  };
}

function normalizeDate(task) {
  return task?.recurrence?.startDate ? dayjs(task.recurrence.startDate).format("MMM D, YYYY") : "No date";
}

export function ListsTab({ isLoading }) {
  const dispatch = useDispatch();
  const {
    data: listData,
    isLoading: isListsLoading,
    isFetching: isListsFetching,
    isError: isListsError,
    error: listsError,
    refetch,
  } = useGetListTasksQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  useGetTagsQuery();
  const [createListFromTemplate, { isLoading: isUsingTemplate }] = useUseListTemplateMutation();
  const [updateTask] = useUpdateTaskMutation();

  const templates = useMemo(() => listData?.templates || [], [listData]);
  const instances = useMemo(() => listData?.instances || [], [listData]);

  const [useModal, setUseModal] = useState({
    open: false,
    template: null,
    title: "",
    date: null,
    time: null,
    duration: 30,
    priority: "",
    tagIds: [],
  });

  const openUseModal = template => {
    setUseModal({
      open: true,
      template,
      title: template.title,
      date: null,
      time: null,
      duration: 30,
      priority: "",
      tagIds: (template.tags || []).map(tag => tag.id),
    });
  };

  const closeUseModal = () => {
    setUseModal(prev => ({ ...prev, open: false, template: null }));
  };

  const handleUseTemplate = async () => {
    if (!useModal.template || !useModal.title.trim()) return;

    await createListFromTemplate({
      templateId: useModal.template.id,
      title: useModal.title.trim(),
      time: useModal.time ? dayjs(useModal.time).format("HH:mm") : null,
      duration: Number(useModal.duration) || 30,
      priority: useModal.priority || null,
      recurrence: buildRecurrence(useModal.date),
      tagIds: useModal.tagIds,
      sectionId: null,
    }).unwrap();

    closeUseModal();
  };

  const handleCreateTemplate = () => {
    dispatch(
      openTaskDialog({
        completionType: "checkbox",
        taskKind: "list_template",
      })
    );
  };

  const sortedInstances = useMemo(() => {
    return [...instances].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }, [instances]);

  const toggleSubtaskStatus = async subtask => {
    await updateTask({
      id: subtask.id,
      status: subtask.status === "complete" ? "todo" : "complete",
    }).unwrap();
  };

  if (isLoading || isListsLoading || isListsFetching) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (isListsError) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error.main" variant="body2">
          Failed to load lists.
        </Typography>
        <Typography color="text.secondary" variant="caption" sx={{ display: "block", mt: 0.5 }}>
          {listsError?.data?.error || listsError?.error || "Unknown error"}
        </Typography>
        <Button sx={{ mt: 1 }} size="small" variant="outlined" onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, overflow: "auto", height: "100%", minHeight: 0 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Lists</Typography>
          <Button startIcon={<Add />} variant="contained" onClick={handleCreateTemplate}>
            New List Template
          </Button>
        </Stack>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Templates
          </Typography>
          <Stack spacing={1.5}>
            {templates.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No list templates yet.
              </Typography>
            )}
            {templates.map(template => (
              <Card key={template.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography fontWeight={600}>{template.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.subtasks?.length || 0} items
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        onClick={() =>
                          dispatch(
                            openEditTaskDialog({
                              task: template,
                              defaultDate: null,
                              clickedRecurringDate: null,
                            })
                          )
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlaylistAdd />}
                        onClick={() => openUseModal(template)}
                      >
                        Use
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            In Use
          </Typography>
          <Stack spacing={1.5}>
            {sortedInstances.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No active lists yet.
              </Typography>
            )}
            {sortedInstances.map(instance => (
              <Card key={instance.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight={600}>{instance.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {normalizeDate(instance)} {instance.time ? `at ${instance.time}` : ""}
                        </Typography>
                      </Box>
                      {instance.priority && <Chip size="small" label={instance.priority} />}
                    </Stack>
                    <Stack spacing={0.5}>
                      {(instance.subtasks || []).map(subtask => (
                        <Stack key={subtask.id} direction="row" alignItems="center" spacing={1}>
                          <Checkbox
                            size="small"
                            checked={subtask.status === "complete"}
                            onChange={() => toggleSubtaskStatus(subtask)}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              textDecoration: subtask.status === "complete" ? "line-through" : "none",
                              opacity: subtask.status === "complete" ? 0.6 : 1,
                            }}
                          >
                            {subtask.title}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      </Stack>

      <Dialog open={useModal.open} onClose={closeUseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Use List Template</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="List Name"
              value={useModal.title}
              onChange={e => setUseModal(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              size="small"
            />
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Tags
              </Typography>
              <TagSelector
                selectedTagIds={useModal.tagIds}
                onSelectionChange={value => setUseModal(prev => ({ ...prev, tagIds: value }))}
              />
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DatePicker
                label="Date"
                value={useModal.date}
                onChange={value => setUseModal(prev => ({ ...prev, date: value }))}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <TimePicker
                label="Time"
                value={useModal.time}
                onChange={value => setUseModal(prev => ({ ...prev, time: value }))}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                size="small"
                label="Duration (minutes)"
                type="number"
                value={useModal.duration}
                onChange={e => setUseModal(prev => ({ ...prev, duration: e.target.value }))}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  label="Priority"
                  value={useModal.priority}
                  onChange={e => setUseModal(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {PRIORITY_LEVELS.filter(level => level.value).map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUseModal}>Cancel</Button>
          <Button onClick={handleUseTemplate} variant="contained" disabled={isUsingTemplate || !useModal.title.trim()}>
            {isUsingTemplate ? "Using..." : "Use List"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
