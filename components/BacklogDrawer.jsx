"use client";

import { useMemo, useCallback, memo, useDeferredValue } from "react";
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
import { getPriorityConfig, PRIORITY_LEVELS } from "@/lib/constants";
import { KeyboardArrowDown, KeyboardArrowUp, Remove, PriorityHigh } from "@mui/icons-material";
import {
  setBacklogSearchTerm as setBacklogSearchTermAction,
  setBacklogSelectedTagIds,
  setBacklogSelectedPriorities,
  toggleBacklogSortByPriority,
  toggleBacklogSortByTag,
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
  const sortByTag = useSelector(state => state.ui.backlogSortByTag);
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

  // Defer expensive filtering when removing filters (going from filtered to unfiltered)
  // This keeps the UI responsive when removing filters
  const deferredSelectedTagIds = useDeferredValue(selectedTagIds);
  const deferredSelectedPriorities = useDeferredValue(selectedPriorities);
  const deferredSearchTerm = useDeferredValue(searchTerm);

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
  const tasksWithIds = useMemo(
    () =>
      filteredTasks.map(task => ({
        ...task,
        draggableId: createDraggableId.backlog(task.id),
      })),
    [filteredTasks, createDraggableId]
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

    // Group by priority first, then by tag within each priority
    if (sortByPriority && sortByTag) {
      const priorityGroups = {};
      tasksWithIds.forEach((task, index) => {
        const priority = task.priority || null;
        if (!priorityGroups[priority]) {
          priorityGroups[priority] = {};
        }

        const tagName = !task.tags || task.tags.length === 0 ? "Untagged" : task.tags[0].name;
        if (!priorityGroups[priority][tagName]) {
          priorityGroups[priority][tagName] = [];
        }
        priorityGroups[priority][tagName].push({ ...task, originalIndex: index });
      });

      const sortedGroups = [];
      PRIORITY_LEVELS.sort((a, b) => a.sortOrder - b.sortOrder).forEach(level => {
        const priority = level.value;
        const tagGroups = priorityGroups[priority] || {};

        // Always add untagged section first (even if empty) so users can add untagged tasks
        sortedGroups.push({
          type: "priority-tag",
          priority,
          priorityLabel: level.label,
          tagName: "Untagged",
          label: `${level.label} - Untagged`,
          tasks: tagGroups["Untagged"] || [],
        });

        // Then add other tags alphabetically
        const sortedTagNames = Object.keys(tagGroups)
          .filter(name => name !== "Untagged")
          .sort();
        sortedTagNames.forEach(tagName => {
          sortedGroups.push({
            type: "priority-tag",
            priority,
            priorityLabel: level.label,
            tagName,
            label: `${level.label} - ${tagName}`,
            tasks: tagGroups[tagName],
          });
        });
      });

      return sortedGroups;
    }

    return null;
  }, [tasksWithIds, sortByPriority, sortByTag]);

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
                  <Stack spacing={1} sx={{ px: { xs: 0.5, md: 1 }, width: "100%", maxWidth: "100%" }}>
                    {tasksGrouped
                      ? // Render grouped by priority/tag with dividers
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

                          return (
                            <Box key={`${group.type}-${group.priority || group.tagName || "none"}-${groupIndex}`}>
                              {groupIndex > 0 && (
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
                                {group.type === "tag" && group.tagName === "Untagged" ? (
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
                                ) : group.type === "tag" && group.tagName !== "Untagged" ? (
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      bgcolor: labelColor,
                                      flexShrink: 0,
                                    }}
                                  />
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
                                  />
                                ))}
                              </Stack>
                            </Box>
                          );
                        })
                      : // Render normally when priority sort is off
                        tasksWithIds.map((task, index) => (
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
