"use client";

import { useMemo, useCallback, memo } from "react";
import { Box, Stack, Typography, IconButton, Chip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Droppable } from "@hello-pangea/dnd";
import { Add } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { BacklogTagSidebar, UNTAGGED_ID } from "./BacklogTagSidebar";
import { QuickTaskInput } from "./QuickTaskInput";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { getPriorityConfig } from "@/lib/constants";
import {
  setBacklogSearchTerm as setBacklogSearchTermAction,
  setBacklogSelectedTagIds,
  setBacklogSelectedPriorities,
  toggleBacklogSortByPriority,
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
  const selectedPriorities = useSelector(state => state.ui.backlogSelectedPriorities);
  const sortByPriority = useSelector(state => state.ui.backlogSortByPriority);
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

    // Filter by priority
    if (selectedPriorities.length > 0) {
      result = result.filter(task => selectedPriorities.includes(task.priority));
    }

    // Sort by priority, then by order
    if (sortByPriority) {
      result = [...result].sort((a, b) => {
        const priorityA = getPriorityConfig(a.priority).sortOrder;
        const priorityB = getPriorityConfig(b.priority).sortOrder;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return (a.order || 0) - (b.order || 0);
      });
    }

    return result;
  }, [backlogTasks, searchTerm, selectedTagIds, selectedPriorities, sortByPriority]);

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

  const handleCreateQuickTask = useCallback(
    async title => {
      // Filter out UNTAGGED_ID from tagIds (it's not a real tag)
      const regularTagIds = selectedTagIds.filter(id => id !== UNTAGGED_ID);

      // Use the first selected priority if any are selected
      const priority = selectedPriorities.length > 0 ? selectedPriorities[0] : null;

      await taskOps.handleCreateBacklogTaskInline(title, regularTagIds, priority);
    },
    [taskOps, selectedTagIds, selectedPriorities]
  );

  // Prepare tasks with draggable IDs - memoized to prevent recreation on every render
  const tasksWithIds = useMemo(
    () =>
      filteredTasks.map(task => ({
        ...task,
        draggableId: createDraggableId.backlog(task.id),
      })),
    [filteredTasks, createDraggableId]
  );

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

          <TaskSearchInput
            onSearchChange={term => dispatch(setBacklogSearchTermAction(term))}
            tags={backlogTags}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onCreateTag={async (name, color) => {
              return await createTagMutation({ name, color }).unwrap();
            }}
            selectedPriorities={selectedPriorities}
            onPrioritySelect={priority => {
              if (!selectedPriorities.includes(priority)) {
                dispatch(setBacklogSelectedPriorities([...selectedPriorities, priority]));
              }
            }}
            onPriorityDeselect={priority =>
              dispatch(setBacklogSelectedPriorities(selectedPriorities.filter(value => value !== priority)))
            }
            sortByPriority={sortByPriority}
            onSortToggle={() => dispatch(toggleBacklogSortByPriority())}
          />
          {/* New Task Input */}
          <Box sx={{ mt: 1, width: "100%", maxWidth: "100%" }}>
            <QuickTaskInput
              placeholder="New Task..."
              onCreate={handleCreateQuickTask}
              variant="standard"
              showUnderlineWhenActive={false}
            />
          </Box>
        </Box>

        {/* Droppable area for tasks */}
        <Droppable droppableId="backlog" type="TASK">
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: tasksWithIds.length === 0 ? { xs: 1.5, md: 2 } : { xs: 0.5, md: 1 },
                borderRadius: 1,
                transition: "background-color 0.2s, padding 0.2s",
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
                  <Stack spacing={1} sx={{ px: { xs: 0.5, md: 1 }, width: "100%", maxWidth: "100%" }}>
                    {tasksWithIds.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        variant="backlog"
                        index={index}
                        containerId="backlog"
                        draggableId={task.draggableId}
                        viewDate={viewDate}
                      />
                    ))}
                    {provided.placeholder}
                    <QuickTaskInput
                      placeholder="New task..."
                      onCreate={handleCreateQuickTask}
                      size="small"
                      variant="standard"
                    />
                  </Stack>
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
                    {snapshot.isDraggingOver ? "Drop here" : "No tasks"}
                  </Typography>
                  {provided.placeholder}
                  <QuickTaskInput
                    placeholder="New task..."
                    onCreate={handleCreateQuickTask}
                    size="small"
                    variant="standard"
                  />
                </Stack>
              )}
            </Box>
          )}
        </Droppable>
      </Box>
    </Box>
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent);

export default BacklogDrawer;
