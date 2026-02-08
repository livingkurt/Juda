"use client";

import { useMemo, useCallback, memo, useDeferredValue, useState, useRef } from "react";
import { Box, Stack, Typography, IconButton, Chip, useMediaQuery, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Droppable } from "@hello-pangea/dnd";
import { Add } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { BacklogTagSidebar, UNTAGGED_ID } from "./BacklogTagSidebar";
import { QuickTaskInput } from "./QuickTaskInput";
import { TaskSkeleton } from "./TaskSkeleton";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { getPriorityConfig, PRIORITY_LEVELS } from "@/lib/constants";
import { KeyboardArrowDown, KeyboardArrowUp, Remove, PriorityHigh } from "@mui/icons-material";
import { createDroppableId } from "@/lib/dragHelpers";
import {
  setBacklogSearchTerm as setBacklogSearchTermAction,
  setBacklogSelectedTagIds,
  setBacklogSelectedPriorities,
  toggleBacklogSortByPriority,
  toggleBacklogSortByTag,
  toggleBacklogTagSidebarOpen,
} from "@/lib/store/slices/uiSlice";

const TASK_HEIGHT = 72; // Approximate height of TaskItem in backlog variant
const TASK_SPACING = 8; // spacing={1} = 8px in MUI

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
  const sortByTag = useSelector(state => state.ui.backlogSortByTag);
  const sidebarOpen = useSelector(state => state.ui.backlogTagSidebarOpen);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const taskFilters = useTaskFilters();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  const backlogTasks = taskFilters.backlogTasks;
  const backlogLoading = taskFilters.backlogLoading;
  const backlogFetching = taskFilters.backlogFetching;
  const backlogRawTasks = taskFilters.backlogRawTasks;
  // Show loading state when:
  // 1. We're fetching AND have no raw data yet, OR
  // 2. Raw data arrived but deferred data hasn't caught up yet
  const backlogIsLoading =
    ((backlogLoading || backlogFetching) && backlogRawTasks.length === 0) ||
    (backlogRawTasks.length > 0 && backlogTasks.length === 0);

  // Defer expensive filtering when removing filters (going from filtered to unfiltered)
  // This keeps the UI responsive when removing filters
  const deferredSelectedTagIds = useDeferredValue(selectedTagIds);
  const deferredSelectedPriorities = useDeferredValue(selectedPriorities);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const INITIAL_RENDER_COUNT = 100;

  // Filter tasks by search term and tags
  const filteredTasks = useMemo(() => {
    let result = backlogTasks;

    // Filter by search term
    if (deferredSearchTerm.trim()) {
      const lowerSearch = deferredSearchTerm.toLowerCase();
      result = result.filter(task => task.title.toLowerCase().includes(lowerSearch));
    }

    // Filter by tags
    if (deferredSelectedTagIds.length > 0) {
      const hasUntaggedFilter = deferredSelectedTagIds.includes(UNTAGGED_ID);
      const regularTagIds = deferredSelectedTagIds.filter(id => id !== UNTAGGED_ID);

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
    if (deferredSelectedPriorities.length > 0) {
      result = result.filter(task => deferredSelectedPriorities.includes(task.priority));
    }

    // Sort by priority and/or tag, then by order
    if (sortByPriority || sortByTag) {
      result = [...result].sort((a, b) => {
        // Sort by priority first if enabled
        if (sortByPriority) {
          const priorityA = getPriorityConfig(a.priority).sortOrder;
          const priorityB = getPriorityConfig(b.priority).sortOrder;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        // Then sort by tag if enabled
        if (sortByTag) {
          const tagA = a.tags && a.tags.length > 0 ? a.tags[0].name : "";
          const tagB = b.tags && b.tags.length > 0 ? b.tags[0].name : "";
          if (tagA !== tagB) {
            if (!tagA) return 1; // Untagged goes to end
            if (!tagB) return -1;
            return tagA.localeCompare(tagB);
          }
        }

        // Finally sort by order
        return (a.order || 0) - (b.order || 0);
      });
    }

    return result;
  }, [backlogTasks, deferredSearchTerm, deferredSelectedTagIds, deferredSelectedPriorities, sortByPriority, sortByTag]);

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

  const handlePrioritySelect = useCallback(
    priority => {
      if (!selectedPriorities.includes(priority)) {
        dispatch(setBacklogSelectedPriorities([...selectedPriorities, priority]));
      }
    },
    [dispatch, selectedPriorities]
  );

  const handlePriorityDeselect = useCallback(
    priority => {
      dispatch(setBacklogSelectedPriorities(selectedPriorities.filter(value => value !== priority)));
    },
    [dispatch, selectedPriorities]
  );

  const handleSortToggle = useCallback(() => {
    dispatch(toggleBacklogSortByPriority());
  }, [dispatch]);

  const handleTagSortToggle = useCallback(() => {
    dispatch(toggleBacklogSortByTag());
  }, [dispatch]);

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

  const handleCreateQuickTaskWithPriority = useCallback(
    async (title, priority) => {
      // Filter out UNTAGGED_ID from tagIds (it's not a real tag)
      const regularTagIds = selectedTagIds.filter(id => id !== UNTAGGED_ID);

      await taskOps.handleCreateBacklogTaskInline(title, regularTagIds, priority);
    },
    [taskOps, selectedTagIds]
  );

  // Prepare tasks with draggable IDs - memoized to prevent recreation on every render
  const [extraCount, setExtraCount] = useState(0);
  const visibleCount = Math.min(filteredTasks.length, INITIAL_RENDER_COUNT + extraCount);
  const visibleTasks = useMemo(() => filteredTasks.slice(0, visibleCount), [filteredTasks, visibleCount]);

  const tasksWithIds = useMemo(
    () =>
      visibleTasks.map(task => ({
        ...task,
        draggableId: createDraggableId.backlog(task.id),
      })),
    [visibleTasks, createDraggableId]
  );

  // Group tasks by priority and/or tag when sorting is enabled
  const tasksGrouped = useMemo(() => {
    if (!sortByPriority && !sortByTag) {
      return null; // Don't group when neither sort is enabled
    }

    // Group by priority first if enabled
    if (sortByPriority && !sortByTag) {
      const groups = {};
      tasksWithIds.forEach((task, index) => {
        const priority = task.priority || null;
        if (!groups[priority]) {
          groups[priority] = [];
        }
        groups[priority].push({ ...task, originalIndex: index });
      });

      // Show all priority levels, even if they have no tasks
      const sortedGroups = PRIORITY_LEVELS.sort((a, b) => a.sortOrder - b.sortOrder).map(level => ({
        type: "priority",
        priority: level.value,
        label: level.label,
        tasks: groups[level.value] || [],
      }));

      return sortedGroups;
    }

    // Group by tag if only tag sort is enabled
    if (sortByTag && !sortByPriority) {
      const groups = {};
      const untaggedGroup = [];

      tasksWithIds.forEach((task, index) => {
        if (!task.tags || task.tags.length === 0) {
          untaggedGroup.push({ ...task, originalIndex: index });
        } else {
          // Use the first tag (since we sort by first tag)
          const tagName = task.tags[0].name;
          if (!groups[tagName]) {
            groups[tagName] = [];
          }
          groups[tagName].push({ ...task, originalIndex: index });
        }
      });

      const sortedGroups = [];
      // Always show Untagged section (even if empty) so users can add untagged tasks
      sortedGroups.push({
        type: "tag",
        tagName: "Untagged",
        label: "Untagged",
        tasks: untaggedGroup,
      });

      // Sort tag names alphabetically
      const sortedTagNames = Object.keys(groups).sort();
      sortedTagNames.forEach(tagName => {
        sortedGroups.push({
          type: "tag",
          tagName,
          label: tagName,
          tasks: groups[tagName],
        });
      });

      return sortedGroups;
    }

    // Group by tag first, then by priority within each tag
    if (sortByPriority && sortByTag) {
      const tagGroups = {};
      tasksWithIds.forEach((task, index) => {
        const tagName = !task.tags || task.tags.length === 0 ? "Untagged" : task.tags[0].name;
        if (!tagGroups[tagName]) {
          tagGroups[tagName] = {};
        }

        const priority = task.priority || null;
        if (!tagGroups[tagName][priority]) {
          tagGroups[tagName][priority] = [];
        }
        tagGroups[tagName][priority].push({ ...task, originalIndex: index });
      });

      const sortedGroups = [];

      // Always show "Untagged" first
      const untaggedPriorities = tagGroups["Untagged"] || {};
      PRIORITY_LEVELS.sort((a, b) => a.sortOrder - b.sortOrder).forEach(level => {
        const priority = level.value;
        sortedGroups.push({
          type: "tag-priority",
          tagName: "Untagged",
          tagLabel: "Untagged",
          priority,
          priorityLabel: level.label,
          label: `Untagged - ${level.label}`,
          tasks: untaggedPriorities[priority] || [],
        });
      });

      // Then show other tags alphabetically
      const sortedTagNames = Object.keys(tagGroups)
        .filter(name => name !== "Untagged")
        .sort();
      sortedTagNames.forEach(tagName => {
        const priorities = tagGroups[tagName] || {};
        PRIORITY_LEVELS.sort((a, b) => a.sortOrder - b.sortOrder).forEach(level => {
          const priority = level.value;
          sortedGroups.push({
            type: "tag-priority",
            tagName,
            tagLabel: tagName,
            priority,
            priorityLabel: level.label,
            label: `${tagName} - ${level.label}`,
            tasks: priorities[priority] || [],
          });
        });
      });

      return sortedGroups;
    }

    return null;
  }, [tasksWithIds, sortByPriority, sortByTag]);

  // Virtualization setup for non-grouped backlog list
  const parentRef = useRef(null);

  // Virtualizer for ungrouped list only
  const virtualizer = useVirtualizer({
    count: !tasksGrouped ? tasksWithIds.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TASK_HEIGHT + TASK_SPACING,
    overscan: 5,
    enabled: !tasksGrouped && tasksWithIds.length > 50, // Only virtualize large lists
  });

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
          tags={tags}
          tasks={backlogTasks}
          selectedTagIds={selectedTagIds}
          onTagSelect={handleTagSelect}
          onTagDeselect={handleTagDeselect}
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          selectedPriorities={selectedPriorities}
          onPrioritySelect={handlePrioritySelect}
          onPriorityDeselect={handlePriorityDeselect}
          sortByPriority={sortByPriority}
          onSortToggle={handleSortToggle}
          sortByTag={sortByTag}
          onTagSortToggle={handleTagSortToggle}
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
                  (deferredSearchTerm || deferredSelectedTagIds.length > 0) &&
                  filteredTasks.length !== backlogTasks.length
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
            tags={tags}
            tasks={backlogTasks}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onCreateTag={async (name, color) => {
              return await createTagMutation({ name, color }).unwrap();
            }}
            selectedPriorities={selectedPriorities}
            onPrioritySelect={handlePrioritySelect}
            onPriorityDeselect={handlePriorityDeselect}
            sortByPriority={sortByPriority}
            onSortToggle={handleSortToggle}
            sortByTag={sortByTag}
            onTagSortToggle={handleTagSortToggle}
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
        {/* When priority sort is enabled, use individual priority droppables instead of nested ones */}
        {sortByPriority && !sortByTag ? (
          <Box
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
            {backlogIsLoading ? (
              <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
                <TaskSkeleton count={6} />
              </Box>
            ) : tasksWithIds.length > 0 ? (
              <Box>
                <Stack spacing={1} sx={{ px: { xs: 0.5, md: 1 }, width: "100%", maxWidth: "100%" }}>
                  {tasksGrouped &&
                    tasksGrouped.map((group, groupIndex) => {
                      // Determine icon and color based on group type
                      let IconComponent = null;
                      let labelColor = "text.secondary";
                      let priority = null;

                      if (group.type === "priority" || group.type === "priority-tag") {
                        const priorityConfig = getPriorityConfig(group.priority);
                        const iconMap = {
                          KeyboardArrowDown,
                          KeyboardArrowUp,
                          Remove,
                          PriorityHigh,
                        };
                        IconComponent = priorityConfig.icon ? iconMap[priorityConfig.icon] : null;
                        labelColor = priorityConfig.color || "text.secondary";
                        priority = group.priority;
                      }

                      // Determine if we should show a divider
                      const shouldShowDivider = groupIndex > 0;

                      // Create droppable ID for this priority section (all groups in priority-only mode are priority groups)
                      const priorityDroppableId = createDroppableId.backlogPriority(group.priority || null);

                      // Wrap each priority section in its own Droppable
                      return (
                        <Droppable
                          key={`${group.type}-${group.priority || "none"}-${groupIndex}`}
                          droppableId={priorityDroppableId}
                          type="TASK"
                        >
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{
                                minHeight: group.tasks.length === 0 ? 80 : "auto",
                                borderRadius: 0,
                                bgcolor: "transparent",
                                transition: "background-color 0.2s",
                                border: 0,
                                borderColor: "transparent",
                              }}
                            >
                              {shouldShowDivider && (
                                <Box
                                  sx={{
                                    my: 1.5,
                                    mx: 1,
                                    borderTop: 1,
                                    borderColor: "divider",
                                  }}
                                />
                              )}
                              {/* Group Label with Quick Task Input */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  px: 1,
                                  py: 0.75,
                                  mb: 0.5,
                                }}
                              >
                                {IconComponent && (
                                  <IconComponent
                                    fontSize="small"
                                    sx={{
                                      color: labelColor,
                                      fontSize: "1rem",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: labelColor,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    flexShrink: 0,
                                    minWidth: "fit-content",
                                  }}
                                >
                                  {group.label}
                                </Typography>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <QuickTaskInput
                                    placeholder={`Add ${group.label.toLowerCase()} task...`}
                                    onCreate={title => handleCreateQuickTaskWithPriority(title, priority || null)}
                                    size="small"
                                    variant="standard"
                                    showUnderlineWhenActive={false}
                                    sx={{
                                      "& .MuiInputBase-root": {
                                        fontSize: "0.75rem",
                                      },
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Stack spacing={1}>
                                {group.tasks.map((task, taskIndex) => (
                                  <TaskItem
                                    key={task.id}
                                    task={task}
                                    variant="backlog"
                                    index={taskIndex}
                                    containerId={priorityDroppableId}
                                    draggableId={task.draggableId}
                                    viewDate={viewDate}
                                    allTasksOverride={taskFilters.tasks}
                                  />
                                ))}
                                {group.tasks.length === 0 && snapshot.isDraggingOver && (
                                  <Box
                                    sx={{
                                      py: 2,
                                      px: 1,
                                      textAlign: "center",
                                      color: "text.secondary",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    Drop here to assign {group.label.toLowerCase()} priority
                                  </Box>
                                )}
                                {visibleCount < filteredTasks.length && (
                                  <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                                    <Button
                                      size="small"
                                      onClick={() => setExtraCount(count => count + INITIAL_RENDER_COUNT)}
                                    >
                                      Load more
                                    </Button>
                                  </Box>
                                )}
                                {provided.placeholder}
                              </Stack>
                            </Box>
                          )}
                        </Droppable>
                      );
                    })}
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                  px: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No tasks in backlog
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Droppable droppableId="backlog" type="TASK">
            {(provided, snapshot) => (
              <Box
                ref={el => {
                  provided.innerRef(el);
                  parentRef.current = el;
                }}
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
                {backlogIsLoading ? (
                  <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
                    <TaskSkeleton count={6} />
                  </Box>
                ) : tasksWithIds.length > 0 ? (
                  <Box>
                    <Stack spacing={1} sx={{ px: { xs: 0.5, md: 1 }, width: "100%", maxWidth: "100%" }}>
                      {tasksGrouped ? (
                        // Render grouped by priority/tag with dividers
                        tasksGrouped.map((group, groupIndex) => {
                          // Determine icon and color based on group type
                          let IconComponent = null;
                          let labelColor = "text.secondary";
                          let priority = null;

                          if (group.type === "priority" || group.type === "priority-tag") {
                            const priorityConfig = getPriorityConfig(group.priority);
                            const iconMap = {
                              KeyboardArrowDown,
                              KeyboardArrowUp,
                              Remove,
                              PriorityHigh,
                            };
                            IconComponent = priorityConfig.icon ? iconMap[priorityConfig.icon] : null;
                            labelColor = priorityConfig.color || "text.secondary";
                            priority = group.priority;
                          }

                          // For tag-only groups, find tag color
                          if (group.type === "tag") {
                            if (group.tagName === "Untagged") {
                              // Untagged uses default color
                              labelColor = "text.secondary";
                            } else {
                              const tag = tags.find(t => t.name === group.tagName);
                              if (tag) {
                                labelColor = tag.color;
                                // Show tag dot instead of icon for tag-only groups
                                IconComponent = null; // We'll show a colored dot instead
                              }
                            }
                          }

                          // For tag-priority groups (tag first, then priority)
                          if (group.type === "tag-priority") {
                            // Show tag dot and use tag color
                            if (group.tagName === "Untagged") {
                              labelColor = "text.secondary";
                            } else {
                              const tag = tags.find(t => t.name === group.tagName);
                              if (tag) {
                                labelColor = tag.color;
                              }
                            }
                            // Priority is available for QuickTaskInput
                            priority = group.priority;
                          }

                          // Determine if we should show a divider
                          // Show divider between different tags (for tag-priority groups) or between all groups (for other types)
                          const shouldShowDivider =
                            groupIndex > 0 &&
                            (group.type !== "tag-priority" || tasksGrouped[groupIndex - 1].tagName !== group.tagName);

                          // Create droppable ID for this priority section (only for priority-only groups)
                          const priorityDroppableId =
                            group.type === "priority" && sortByPriority
                              ? createDroppableId.backlogPriority(group.priority)
                              : null;

                          // If this is a priority-only section, wrap it in its own Droppable
                          if (priorityDroppableId) {
                            return (
                              <Droppable
                                key={`${group.type}-${group.priority || "none"}-${groupIndex}`}
                                droppableId={priorityDroppableId}
                                type="TASK"
                              >
                                {(provided, snapshot) => (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    sx={{
                                      minHeight: group.tasks.length === 0 ? 80 : "auto",
                                      borderRadius: snapshot.isDraggingOver ? 1 : 0,
                                      bgcolor: snapshot.isDraggingOver ? "action.hover" : "transparent",
                                      transition: "background-color 0.2s",
                                      border: snapshot.isDraggingOver && group.tasks.length === 0 ? 2 : 0,
                                      borderColor:
                                        snapshot.isDraggingOver && group.tasks.length === 0
                                          ? "primary.main"
                                          : "transparent",
                                      borderStyle: "dashed",
                                    }}
                                  >
                                    {shouldShowDivider && (
                                      <Box
                                        sx={{
                                          my: 1.5,
                                          mx: 1,
                                          borderTop: 1,
                                          borderColor: "divider",
                                        }}
                                      />
                                    )}
                                    {/* Group Label with Quick Task Input */}
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        px: 1,
                                        py: 0.75,
                                        mb: 0.5,
                                      }}
                                    >
                                      {IconComponent && (
                                        <IconComponent
                                          fontSize="small"
                                          sx={{
                                            color: labelColor,
                                            fontSize: "1rem",
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          color: labelColor,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          flexShrink: 0,
                                          minWidth: "fit-content",
                                        }}
                                      >
                                        {group.label}
                                      </Typography>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <QuickTaskInput
                                          placeholder={`Add ${group.label.toLowerCase()} task...`}
                                          onCreate={title => handleCreateQuickTaskWithPriority(title, priority || null)}
                                          size="small"
                                          variant="standard"
                                          showUnderlineWhenActive={false}
                                          sx={{
                                            "& .MuiInputBase-root": {
                                              fontSize: "0.75rem",
                                            },
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                    <Stack spacing={1}>
                                      {group.tasks.map((task, taskIndex) => (
                                        <TaskItem
                                          key={task.id}
                                          task={task}
                                          variant="backlog"
                                          index={taskIndex}
                                          containerId={priorityDroppableId}
                                          draggableId={task.draggableId}
                                          viewDate={viewDate}
                                          allTasksOverride={taskFilters.tasks}
                                        />
                                      ))}
                                      {group.tasks.length === 0 && snapshot.isDraggingOver && (
                                        <Box
                                          sx={{
                                            py: 2,
                                            px: 1,
                                            textAlign: "center",
                                            color: "text.secondary",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Drop here to assign {group.label.toLowerCase()} priority
                                        </Box>
                                      )}
                                      {provided.placeholder}
                                    </Stack>
                                  </Box>
                                )}
                              </Droppable>
                            );
                          }

                          // For tag-only or combined groups, use regular rendering
                          return (
                            <Box key={`${group.type}-${group.priority || group.tagName || "none"}-${groupIndex}`}>
                              {shouldShowDivider && (
                                <Box
                                  sx={{
                                    my: 1.5,
                                    mx: 1,
                                    borderTop: 1,
                                    borderColor: "divider",
                                  }}
                                />
                              )}
                              {/* Group Label with Quick Task Input */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  px: 1,
                                  py: 0.75,
                                  mb: 0.5,
                                }}
                              >
                                {group.type === "tag" || group.type === "tag-priority" ? (
                                  group.tagName === "Untagged" ? (
                                    <Box
                                      sx={{
                                        width: 12,
                                        height: 12,
                                        bgcolor: "transparent",
                                        borderWidth: 1.5,
                                        borderStyle: "solid",
                                        borderColor: labelColor,
                                        borderRadius: "50%",
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: "50%",
                                        bgcolor: labelColor,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )
                                ) : IconComponent ? (
                                  <IconComponent
                                    fontSize="small"
                                    sx={{
                                      color: labelColor,
                                      fontSize: "1rem",
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : null}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: labelColor,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    flexShrink: 0,
                                    minWidth: "fit-content",
                                  }}
                                >
                                  {group.label}
                                </Typography>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <QuickTaskInput
                                    placeholder={`Add ${group.label.toLowerCase()} task...`}
                                    onCreate={title => handleCreateQuickTaskWithPriority(title, priority || null)}
                                    size="small"
                                    variant="standard"
                                    showUnderlineWhenActive={false}
                                    sx={{
                                      "& .MuiInputBase-root": {
                                        fontSize: "0.75rem",
                                      },
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Stack spacing={1}>
                                {group.tasks.map(task => (
                                  <TaskItem
                                    key={task.id}
                                    task={task}
                                    variant="backlog"
                                    index={task.originalIndex}
                                    containerId="backlog"
                                    draggableId={task.draggableId}
                                    viewDate={viewDate}
                                    allTasksOverride={taskFilters.tasks}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          );
                        })
                      ) : // Render with virtualization when list is large
                      tasksWithIds.length > 50 ? (
                        <Box
                          sx={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                          }}
                        >
                          {virtualizer.getVirtualItems().map(virtualItem => {
                            const task = tasksWithIds[virtualItem.index];
                            return (
                              <Box
                                key={task.id}
                                data-index={virtualItem.index}
                                ref={virtualizer.measureElement}
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  transform: `translateY(${virtualItem.start}px)`,
                                }}
                              >
                                <TaskItem
                                  task={task}
                                  variant="backlog"
                                  index={virtualItem.index}
                                  containerId="backlog"
                                  draggableId={task.draggableId}
                                  viewDate={viewDate}
                                  allTasksOverride={taskFilters.tasks}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        // Render normally for small lists
                        tasksWithIds.map((task, index) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            variant="backlog"
                            index={index}
                            containerId="backlog"
                            draggableId={task.draggableId}
                            viewDate={viewDate}
                            allTasksOverride={taskFilters.tasks}
                          />
                        ))
                      )}
                      {visibleCount < filteredTasks.length && (
                        <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                          <Button size="small" onClick={() => setExtraCount(count => count + INITIAL_RENDER_COUNT)}>
                            Load more
                          </Button>
                        </Box>
                      )}
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
        )}
      </Box>
    </Box>
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent);

export default BacklogDrawer;
