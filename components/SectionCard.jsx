"use client";

import { useState, useRef, memo } from "react";
import { Box, Card, Title, Text, Flex, Group, Stack, ActionIcon, Menu, TextInput, Collapse } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreVertical, GripVertical, Sun, ChevronDown, ChevronUp } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { SECTION_ICONS } from "@/lib/constants";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useTaskFilters } from "@/hooks/useTaskFilters";

const SectionCardComponent = ({ section, hoveredDroppable, droppableId, createDraggableId, viewDate }) => {
  const { mode, dnd, icon } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const dropHighlight = dnd.dropTarget;

  const [inlineInputValue, setInlineInputValue] = useState("");
  const [isInlineInputActive, setIsInlineInputActive] = useState(false);
  const inlineInputRef = useRef(null);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers(); // Can be called without section expansion callbacks
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // Get section expansion for toggle functionality
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });
  const sectionExpansion = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
  });
  const sectionOps = useSectionOperations({
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
  });

  // Get tasks for this section from Redux
  const tasks = taskFilters.tasksBySection[section.id] || [];

  const IconComponent = SECTION_ICONS.find(i => i.value === section.icon)?.Icon || Sun;
  const completedCount = tasks.filter(
    t => t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed))
  ).length;

  const isDropTarget = hoveredDroppable === droppableId;

  // Use sortable for section reordering
  const {
    attributes: sectionAttributes,
    listeners: sectionListeners,
    setNodeRef: setSectionNodeRef,
    transform: sectionTransform,
    transition: sectionTransition,
    isDragging: sectionIsDragging,
  } = useSortable({
    id: `section-${section.id}`,
    data: {
      type: "SECTION",
      containerId: "sections",
    },
  });

  const sectionStyle = {
    transform: sectionTransform ? CSS.Transform.toString(sectionTransform) : undefined,
    transition: sectionTransition || "transform 200ms ease",
  };

  // Use droppable for task drop zone
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: "TASK",
      sectionId: section.id,
    },
  });

  // Prepare tasks with draggable IDs
  const tasksWithIds = tasks.map(task => ({
    ...task,
    draggableId: createDraggableId.todaySection(task.id, section.id),
  }));

  const handleInlineInputClick = () => {
    setIsInlineInputActive(true);
    setTimeout(() => {
      inlineInputRef.current?.focus();
    }, 0);
  };

  const handleInlineInputBlur = async () => {
    if (inlineInputValue.trim()) {
      await taskOps.handleCreateTaskInline(section.id, inlineInputValue);
      setInlineInputValue("");
    }
    setIsInlineInputActive(false);
  };

  const handleInlineInputKeyDown = async e => {
    if (e.key === "Enter" && inlineInputValue.trim()) {
      e.preventDefault();
      await taskOps.handleCreateTaskInline(section.id, inlineInputValue);
      setInlineInputValue("");
      setIsInlineInputActive(false);
    } else if (e.key === "Escape") {
      setInlineInputValue("");
      setIsInlineInputActive(false);
      inlineInputRef.current?.blur();
    }
  };

  const isExpanded = section.expanded !== false;

  return (
    <Card
      ref={setSectionNodeRef}
      style={{
        ...sectionStyle,
        marginBottom: 16,
        background: bgColor,
        borderColor: isDropTarget || isOver ? dnd.dropTargetBorder : borderColor,
        borderWidth: isDropTarget || isOver ? 2 : 1,
        borderStyle: "solid",
        opacity: sectionIsDragging ? 0.5 : 1,
        transition: "border-color 0.2s, border-width 0.2s",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <Card.Section
        style={{
          paddingBottom: 8,
          paddingTop: 12,
          paddingLeft: 16,
          paddingRight: 16,
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Flex align="center" justify="space-between" style={{ width: "100%", maxWidth: "100%" }} gap={[4, 8]}>
          <Flex align="center" gap={[4, 8]} style={{ minWidth: 0, flex: 1 }}>
            <Box
              {...sectionAttributes}
              {...sectionListeners}
              style={{
                cursor: "grab",
                color: mutedText,
                display: "none",
              }}
              visibleFrom="md"
              onMouseDown={e => {
                const target = e.currentTarget;
                target.style.cursor = "grabbing";
              }}
              onMouseUp={e => {
                const target = e.currentTarget;
                target.style.cursor = "grab";
              }}
            >
              <GripVertical size={14} stroke="currentColor" />
            </Box>
            <Box component="span" style={{ color: icon.primary }}>
              <IconComponent size={14} stroke="currentColor" />
            </Box>
            <Title order={5} c={textColor} truncate="end" style={{ flex: 1, minWidth: 0 }}>
              {section.name}
            </Title>
            <Text size={["xs", "sm"]} c={mutedText} style={{ flexShrink: 0 }}>
              ({completedCount}/{tasks.length})
            </Text>
          </Flex>
          <Group gap={[0, 4]} style={{ flexShrink: 0 }}>
            <ActionIcon
              onClick={() => sectionOps.handleToggleSectionExpand(section.id)}
              size={["xs", "sm"]}
              variant="subtle"
              aria-label={isExpanded ? "Collapse section" : "Expand section"}
              style={{
                minWidth: "24px",
                height: "24px",
                padding: 0,
              }}
            >
              {isExpanded ? (
                <ChevronUp size={14} stroke="currentColor" />
              ) : (
                <ChevronDown size={14} stroke="currentColor" />
              )}
            </ActionIcon>
            <ActionIcon
              onClick={() => taskOps.handleAddTask(section.id)}
              size={["xs", "sm"]}
              variant="subtle"
              aria-label="Add task"
              style={{
                minWidth: "24px",
                height: "24px",
                padding: 0,
              }}
            >
              <Plus size={14} stroke="currentColor" />
            </ActionIcon>
            <Menu>
              <Menu.Target>
                <ActionIcon
                  size={["xs", "sm"]}
                  variant="subtle"
                  aria-label="Section menu"
                  style={{
                    border: "none",
                    outline: "none",
                    minWidth: "24px",
                    height: "24px",
                    padding: 0,
                  }}
                >
                  <MoreVertical size={14} stroke="currentColor" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => sectionOps.handleEditSection(section)}>Edit</Menu.Item>
                <Menu.Item color="red" onClick={() => sectionOps.handleDeleteSection(section.id)}>
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Flex>
      </Card.Section>
      <Collapse in={isExpanded}>
        <Card.Section
          style={{
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Box
            ref={setDropNodeRef}
            style={{
              background: isOver ? dropHighlight : "transparent",
              borderRadius: "0.375rem",
              minHeight: tasksWithIds.length === 0 ? 120 : 60,
              padding: tasksWithIds.length === 0 ? 16 : 8,
              transition: "background-color 0.2s, padding 0.2s, min-height 0.2s",
              borderWidth: isOver ? 2 : 0,
              borderColor: isOver ? dnd.dropTargetBorder : "transparent",
              borderStyle: "dashed",
            }}
          >
            {tasksWithIds.length === 0 ? (
              <Stack gap={[4, 8]}>
                <Text
                  size={["xs", "sm"]}
                  style={{ textAlign: "center", paddingTop: 16, paddingBottom: 32 }}
                  c={mutedText}
                >
                  {isOver ? "Drop here" : "No tasks"}
                </Text>
                <TextInput
                  ref={inlineInputRef}
                  value={inlineInputValue}
                  onChange={e => setInlineInputValue(e.target.value)}
                  onBlur={handleInlineInputBlur}
                  onKeyDown={handleInlineInputKeyDown}
                  onClick={handleInlineInputClick}
                  placeholder="New task..."
                  size="sm"
                  variant="unstyled"
                  style={{
                    background: "transparent",
                    borderWidth: 0,
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    fontSize: "0.875rem",
                    color: isInlineInputActive ? textColor : mutedText,
                  }}
                  styles={{
                    input: {
                      color: isInlineInputActive ? textColor : mutedText,
                      "&::placeholder": {
                        color: mutedText,
                      },
                      "&:focus": {
                        outline: "none",
                        color: textColor,
                      },
                      "&:hover": {
                        color: textColor,
                      },
                    },
                  }}
                />
              </Stack>
            ) : (
              <SortableContext
                id={droppableId}
                items={tasksWithIds.map(t => t.draggableId)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap={[8, 12]} style={{ paddingTop: 4, paddingBottom: 8 }}>
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
                    />
                  ))}
                  <TextInput
                    ref={inlineInputRef}
                    value={inlineInputValue}
                    onChange={e => setInlineInputValue(e.target.value)}
                    onBlur={handleInlineInputBlur}
                    onKeyDown={handleInlineInputKeyDown}
                    onClick={handleInlineInputClick}
                    placeholder="New task..."
                    size="sm"
                    variant="unstyled"
                    style={{
                      background: "transparent",
                      borderWidth: 0,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 4,
                      paddingBottom: 4,
                      fontSize: "0.875rem",
                      color: isInlineInputActive ? textColor : mutedText,
                    }}
                    styles={{
                      input: {
                        color: isInlineInputActive ? textColor : mutedText,
                        "&::placeholder": {
                          color: mutedText,
                        },
                        "&:focus": {
                          outline: "none",
                          color: textColor,
                        },
                        "&:hover": {
                          color: textColor,
                        },
                      },
                    }}
                  />
                </Stack>
              </SortableContext>
            )}
          </Box>
        </Card.Section>
      </Collapse>
    </Card>
  );
};

// Memoize to prevent unnecessary re-renders
export const SectionCard = memo(SectionCardComponent);
