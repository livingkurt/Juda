"use client";

import { useMemo, useCallback, memo, useRef, useState } from "react";
import { Box, Stack, Typography, IconButton, Chip, TextField, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Add } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";
import { BacklogTagSidebar, UNTAGGED_ID } from "./BacklogTagSidebar";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import {
  setBacklogSearchTerm as setBacklogSearchTermAction,
  setBacklogSelectedTagIds,
  toggleBacklogTagSidebarOpen,
} from "@/lib/store/slices/uiSlice";

const BacklogDrawerComponent = ({ createDraggableId }) => {
  const dispatch = useDispatch();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Get Redux state directly
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Get search/filter state from Redux
  const searchTerm = useSelector(state => state.ui.backlogSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.backlogSelectedTagIds);
  const sidebarOpen = useSelector(state => state.ui.backlogTagSidebarOpen);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const backlogTasks = taskFilters.backlogTasks;

  // Filter tags to only show those used by backlog tasks
  const backlogTags = useMemo(() => {
    // Extract all tag IDs used by backlog tasks
    const tagIdsInBacklog = new Set();
    backlogTasks.forEach(task => {
      task.tags?.forEach(tag => {
        tagIdsInBacklog.add(tag.id);
      });
    });

    // Filter tags to only include those used in backlog
    return tags.filter(tag => tagIdsInBacklog.has(tag.id));
  }, [tags, backlogTasks]);

  // Local UI state (not shared)
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [inlineInputValue, setInlineInputValue] = useState("");
  const [isInlineInputActive, setIsInlineInputActive] = useState(false);
  const inlineInputRef = useRef(null);

  // Filter tasks by search term and tags
  const filteredTasks = useMemo(() => {
    let result = backlogTasks;

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(task => task.title.toLowerCase().includes(lowerSearch));
    }

    // Filter by tags
    if (selectedTagIds.length > 0) {
      const hasUntaggedFilter = selectedTagIds.includes(UNTAGGED_ID);
      const regularTagIds = selectedTagIds.filter(id => id !== UNTAGGED_ID);

      if (hasUntaggedFilter && regularTagIds.length > 0) {
        // Show tasks that are untagged OR have one of the selected tags
        result = result.filter(
          task => !task.tags || task.tags.length === 0 || task.tags.some(tag => regularTagIds.includes(tag.id))
        );
      } else if (hasUntaggedFilter) {
        // Show only untagged tasks
        result = result.filter(task => !task.tags || task.tags.length === 0);
      } else if (regularTagIds.length > 0) {
        // Show only tasks with selected tags
        result = result.filter(task => task.tags?.some(tag => regularTagIds.includes(tag.id)));
      }
    }

    return result;
  }, [backlogTasks, searchTerm, selectedTagIds]);

  const handleTagSelect = useCallback(
    tagId => {
      if (!selectedTagIds.includes(tagId)) {
        dispatch(setBacklogSelectedTagIds([...selectedTagIds, tagId]));
      }
    },
    [dispatch, selectedTagIds]
  );

  const handleTagDeselect = useCallback(
    tagId => {
      dispatch(setBacklogSelectedTagIds(selectedTagIds.filter(id => id !== tagId)));
    },
    [dispatch, selectedTagIds]
  );

  const handleSidebarToggle = useCallback(() => {
    dispatch(toggleBacklogTagSidebarOpen());
  }, [dispatch]);

  const handleInlineInputClick = () => {
    setIsInlineInputActive(true);
    setTimeout(() => {
      inlineInputRef.current?.focus();
    }, 0);
  };

  const handleInlineInputBlur = async () => {
    if (inlineInputValue.trim()) {
      await taskOps.handleCreateBacklogTaskInline(inlineInputValue, selectedTagIds);
      setInlineInputValue("");
    }
    setIsInlineInputActive(false);
  };

  const handleInlineInputKeyDown = async e => {
    if (e.key === "Enter" && inlineInputValue.trim()) {
      e.preventDefault();
      await taskOps.handleCreateBacklogTaskInline(inlineInputValue, selectedTagIds);
      setInlineInputValue("");
      setIsInlineInputActive(false);
    } else if (e.key === "Escape") {
      setInlineInputValue("");
      setIsInlineInputActive(false);
      inlineInputRef.current?.blur();
    }
  };

  // Use droppable hook for backlog area
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog",
  });

  // Prepare tasks with draggable IDs
  const tasksWithIds = filteredTasks.map(task => ({
    ...task,
    draggableId: createDraggableId.backlog(task.id),
  }));

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "row",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* Tag Sidebar - Desktop Only */}
      {!isMobile && (
        <BacklogTagSidebar
          tags={backlogTags}
          selectedTagIds={selectedTagIds}
          onTagSelect={handleTagSelect}
          onTagDeselect={handleTagDeselect}
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
        />
      )}

      {/* Main Content */}
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: { xs: 1, md: 2 },
            pt: { xs: 1.5, md: 2 },
            pb: 1.5,
            mb: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ flexShrink: 0, fontWeight: 600 }}>
              Backlog
            </Typography>
            <Box display="flex" alignItems="center">
              <Chip
                label={`${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""}${
                  (searchTerm || selectedTagIds.length > 0) && filteredTasks.length !== backlogTasks.length
                    ? ` of ${backlogTasks.length}`
                    : ""
                }`}
                size="small"
                color="primary"
              />
              <IconButton onClick={taskOps.handleAddTaskToBacklog} size="small" aria-label="Add task to backlog">
                <Add fontSize="small" />
              </IconButton>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2 }}
            alignItems="center"
            sx={{ width: "100%", maxWidth: "100%" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TaskSearchInput onSearchChange={term => dispatch(setBacklogSearchTermAction(term))} />
            </Box>
            {/* TagFilter - Mobile Only */}
            {isMobile && (
              <TagFilter
                tags={backlogTags}
                selectedTagIds={selectedTagIds}
                onTagSelect={handleTagSelect}
                onTagDeselect={handleTagDeselect}
                onCreateTag={async (name, color) => {
                  return await createTagMutation({ name, color }).unwrap();
                }}
                compact
              />
            )}
          </Stack>
          {/* New Task Input */}
          <Box sx={{ mt: 1, width: "100%", maxWidth: "100%" }}>
            <TextField
              fullWidth
              placeholder="New Task..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  e.preventDefault();
                  taskOps.handleCreateBacklogTaskInline(newTaskTitle.trim(), selectedTagIds);
                  setNewTaskTitle("");
                }
              }}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "0.875rem",
                },
              }}
            />
          </Box>
        </Box>

        {/* Droppable area for tasks */}
        <Box
          ref={setNodeRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: tasksWithIds.length === 0 ? { xs: 1.5, md: 2 } : { xs: 0.5, md: 1 },
            bgcolor: isOver ? "action.hover" : "transparent",
            borderRadius: 1,
            transition: "background-color 0.2s, padding 0.2s",
            borderWidth: isOver ? 2 : 0,
            borderColor: isOver ? "primary.main" : "transparent",
            borderStyle: "dashed",
            mx: isOver ? { xs: 0.5, md: 1 } : 0,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {/* Unscheduled Tasks */}
          {tasksWithIds.length > 0 ? (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  mb: 1,
                  ml: 1,
                  textTransform: "uppercase",
                }}
              >
                Unscheduled Tasks
              </Typography>
              <SortableContext
                id="backlog"
                items={tasksWithIds.map(t => t.draggableId)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1} sx={{ px: { xs: 0.5, md: 1 }, width: "100%", maxWidth: "100%" }}>
                  {tasksWithIds.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="backlog"
                      containerId="backlog"
                      draggableId={task.draggableId}
                      viewDate={viewDate}
                    />
                  ))}
                  <TextField
                    inputRef={inlineInputRef}
                    fullWidth
                    size="small"
                    variant="standard"
                    placeholder="New task..."
                    value={inlineInputValue}
                    onChange={e => setInlineInputValue(e.target.value)}
                    onBlur={handleInlineInputBlur}
                    onKeyDown={handleInlineInputKeyDown}
                    onClick={handleInlineInputClick}
                    InputProps={{
                      disableUnderline: !isInlineInputActive,
                      sx: {
                        fontSize: "0.875rem",
                        color: isInlineInputActive ? "text.primary" : "text.secondary",
                      },
                    }}
                  />
                </Stack>
              </SortableContext>
            </Box>
          ) : (
            <Stack spacing={1}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                  textAlign: "center",
                  py: { xs: 2, md: 4 },
                  color: "text.secondary",
                }}
              >
                {isOver ? "Drop here" : "No tasks"}
              </Typography>
              <TextField
                inputRef={inlineInputRef}
                fullWidth
                size="small"
                variant="standard"
                placeholder="New task..."
                value={inlineInputValue}
                onChange={e => setInlineInputValue(e.target.value)}
                onBlur={handleInlineInputBlur}
                onKeyDown={handleInlineInputKeyDown}
                onClick={handleInlineInputClick}
                InputProps={{
                  disableUnderline: !isInlineInputActive,
                  sx: {
                    fontSize: "0.875rem",
                    color: isInlineInputActive ? "text.primary" : "text.secondary",
                  },
                }}
              />
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent);

export default BacklogDrawer;
