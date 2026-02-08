"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { Box, Paper, Stack, Typography, IconButton, Menu, MenuItem, Collapse } from "@mui/material";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Add, MoreVert, DragIndicator, LightMode, ExpandMore, ExpandLess } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { TaskItem } from "./TaskItem";
import { QuickTaskInput } from "./QuickTaskInput";
import { SECTION_ICONS } from "@/lib/constants";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useTaskFilters } from "@/hooks/useTaskFilters";

const SectionCardComponent = ({ section, index, hoveredDroppable, droppableId, createDraggableId, viewDate }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Get selected tag IDs from Redux for auto-tagging new tasks
  const todaySelectedTagIds = useSelector(state => state.ui.todaySelectedTagIds);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const taskFilters = useTaskFilters();
  // Avoid full tasks fetch in this view; TaskItem uses overrides
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // Get section expansion for toggle functionality
  const sectionExpansion = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
    viewDate,
    todaysTasks: taskFilters.todaysTasks,
  });
  const sectionOps = useSectionOperations({
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
    manuallyCollapsedSections: sectionExpansion.manuallyCollapsedSections,
    setManuallyCollapsedSections: sectionExpansion.setManuallyCollapsedSections,
  });

  // Get tasks for this section from Redux - memoized to prevent recreation on every render
  const tasks = useMemo(() => taskFilters.tasksBySection[section.id] || [], [taskFilters.tasksBySection, section.id]);

  const IconComponent = SECTION_ICONS.find(i => i.value === section.icon)?.Icon || LightMode;

  // Memoize completed count calculation
  const completedCount = useMemo(() => {
    return tasks.filter(
      t => t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed))
    ).length;
  }, [tasks]);

  const isDropTarget = hoveredDroppable === droppableId;

  // Prepare tasks with draggable IDs - memoized to prevent recreation on every render
  const tasksWithIds = useMemo(
    () =>
      tasks.map(task => ({
        ...task,
        draggableId: createDraggableId.todaySection(task.id, section.id),
      })),
    [tasks, createDraggableId, section.id]
  );

  const handleCreateQuickTask = useCallback(
    async title => {
      // Convert "no-section" virtual section to null
      const sectionId = section.id === "no-section" ? null : section.id;
      // Pass selected tag IDs so new tasks automatically get filtered tags
      await taskOps.handleCreateTaskInline(sectionId, title, todaySelectedTagIds);
    },
    [taskOps, section.id, todaySelectedTagIds]
  );

  const isExpanded = section.expanded !== false;

  // Virtual sections (like "No Section") should not be draggable
  const content = (
    <Paper
      variant="outlined"
      sx={{
        mb: { xs: 1, md: 2 },
        borderWidth: isDropTarget ? 2 : 1,
        borderColor: isDropTarget ? "primary.main" : "divider",
        transition: "border-color 0.2s, border-width 0.2s",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          p: { xs: 1.5, md: 2 },
          borderBottom: isExpanded && tasksWithIds.length > 0 ? 1 : 0,
          borderColor: "divider",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} flex={1} minWidth={0}>
          {/* Only show drag handle for real sections */}
          {!section.isVirtual && (
            <Box
              sx={{
                cursor: "grab",
                color: "text.secondary",
                display: { xs: "none", md: "block" },
                "&:active": { cursor: "grabbing" },
              }}
            >
              <DragIndicator fontSize="small" />
            </Box>
          )}
          <IconComponent fontSize="small" sx={{ color: "inherit" }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: "0.875rem", md: "1rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {section.name}
          </Typography>
          {section.startTime && section.endTime && (
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {section.startTime} - {section.endTime}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            ({completedCount}/{tasks.length})
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} flexShrink={0}>
          <IconButton
            onClick={() => sectionOps.handleToggleSectionExpand(section.id)}
            size="small"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <IconButton onClick={() => taskOps.handleAddTask(section.id)} size="small" aria-label="Add task">
            <Add fontSize="small" />
          </IconButton>
          {/* Only show menu for real sections, not virtual "No Section" */}
          {!section.isVirtual && (
            <IconButton size="small" aria-label="Section menu" onClick={e => setMenuAnchor(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {/* Menu - Only for real sections */}
      {!section.isVirtual && (
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              sectionOps.handleEditSection(section);
              setMenuAnchor(null);
            }}
          >
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              sectionOps.handleDeleteSection(section.id);
              setMenuAnchor(null);
            }}
            sx={{ color: "error.main" }}
          >
            Delete
          </MenuItem>
        </Menu>
      )}

      {/* Content */}
      <Collapse in={isExpanded}>
        <Box
          sx={{
            p: { xs: 1, md: 1.5 },
          }}
        >
          <Droppable droppableId={`section-${section.id}`} type="TASK">
            {(droppableProvided, droppableSnapshot) => (
              <Box
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                sx={{
                  borderRadius: 1,
                  minHeight: tasksWithIds.length === 0 ? { xs: 80, md: 120 } : { xs: 40, md: 60 },
                  p: tasksWithIds.length === 0 ? { xs: 2, md: 3 } : { xs: 1, md: 1.5 },
                  transition: "background-color 0.2s, padding 0.2s, min-height 0.2s",
                }}
              >
                {tasksWithIds.length === 0 ? (
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
                      {droppableSnapshot.isDraggingOver ? "Drop here" : "No tasks"}
                    </Typography>
                    <QuickTaskInput
                      placeholder="New task..."
                      onCreate={handleCreateQuickTask}
                      size="small"
                      variant="standard"
                    />
                  </Stack>
                ) : (
                  <Stack spacing={{ xs: 1, md: 1.5 }} sx={{ py: { xs: 0.5, md: 1 } }}>
                    {tasksWithIds.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        variant="today"
                        index={index}
                        containerId={droppableId}
                        hoveredDroppable={hoveredDroppable}
                        draggableId={task.draggableId}
                        viewDate={viewDate}
                        allTasksOverride={taskFilters.tasks}
                      />
                    ))}
                    {droppableProvided.placeholder}
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
      </Collapse>
    </Paper>
  );

  // Wrap in Draggable only if it's a real section (not virtual)
  if (section.isVirtual) {
    return content;
  }

  return (
    <Draggable draggableId={`section-${section.id}`} index={index} isDragDisabled={section.isVirtual}>
      {(sectionProvided, sectionSnapshot) => (
        <Box
          ref={sectionProvided.innerRef}
          {...sectionProvided.draggableProps}
          sx={{ opacity: sectionSnapshot.isDragging ? 0.5 : 1 }}
        >
          <Box {...sectionProvided.dragHandleProps}>{content}</Box>
        </Box>
      )}
    </Draggable>
  );
};

// Memoize to prevent unnecessary re-renders
export const SectionCard = memo(SectionCardComponent);

export default SectionCard;
