"use client";

import { useState, useRef } from "react";
import { Box, Card, Heading, Text, Flex, HStack, VStack, IconButton, Menu, Input } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreVertical, GripVertical, Sun, ChevronDown, ChevronUp } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { SECTION_ICONS } from "@/lib/constants";

export const SectionCard = ({
  section,
  tasks,
  onToggleTask,
  onToggleSubtask,
  onToggleExpand,
  onEditTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  onCreateTaskInline,
  onEditSection,
  onDeleteSection,
  onToggleSectionExpand,
  hoveredDroppable,
  droppableId,
  createDraggableId,
  viewDate,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");

  const [inlineInputValue, setInlineInputValue] = useState("");
  const [isInlineInputActive, setIsInlineInputActive] = useState(false);
  const inlineInputRef = useRef(null);

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
    if (inlineInputValue.trim() && onCreateTaskInline) {
      await onCreateTaskInline(section.id, inlineInputValue);
      setInlineInputValue("");
    }
    setIsInlineInputActive(false);
  };

  const handleInlineInputKeyDown = async e => {
    if (e.key === "Enter" && inlineInputValue.trim()) {
      e.preventDefault();
      if (onCreateTaskInline) {
        await onCreateTaskInline(section.id, inlineInputValue);
        setInlineInputValue("");
        setIsInlineInputActive(false);
      }
    } else if (e.key === "Escape") {
      setInlineInputValue("");
      setIsInlineInputActive(false);
      inlineInputRef.current?.blur();
    }
  };

  return (
    <Card.Root
      ref={setSectionNodeRef}
      style={sectionStyle}
      mb={4}
      bg={bgColor}
      borderColor={isDropTarget || isOver ? "blue.400" : borderColor}
      borderWidth={isDropTarget || isOver ? "2px" : "1px"}
      opacity={sectionIsDragging ? 0.5 : 1}
      transition="border-color 0.2s, border-width 0.2s"
    >
      <Card.Header pb={2}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <Box
              {...sectionAttributes}
              {...sectionListeners}
              cursor="grab"
              _active={{ cursor: "grabbing" }}
              color={mutedText}
            >
              <GripVertical size={18} stroke="currentColor" />
            </Box>
            <Box as="span" color="orange.500">
              <IconComponent size={20} stroke="currentColor" />
            </Box>
            <Heading size="md" color={textColor}>
              {section.name}
            </Heading>
            <Text fontSize="sm" color={mutedText}>
              ({completedCount}/{tasks.length})
            </Text>
          </Flex>
          <HStack spacing={1}>
            <IconButton
              onClick={() => onToggleSectionExpand && onToggleSectionExpand(section.id)}
              size="sm"
              variant="ghost"
              aria-label={section.expanded !== false ? "Collapse section" : "Expand section"}
            >
              <Box as="span" color="currentColor">
                {section.expanded !== false ? (
                  <ChevronUp size={16} stroke="currentColor" />
                ) : (
                  <ChevronDown size={16} stroke="currentColor" />
                )}
              </Box>
            </IconButton>
            <IconButton onClick={() => onAddTask(section.id)} size="sm" variant="ghost" aria-label="Add task">
              <Box as="span" color="currentColor">
                <Plus size={16} stroke="currentColor" />
              </Box>
            </IconButton>
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton size="sm" variant="ghost" aria-label="Section menu">
                  <Box as="span" color="currentColor">
                    <MoreVertical size={16} stroke="currentColor" />
                  </Box>
                </IconButton>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item onClick={() => onEditSection(section)}>Edit</Menu.Item>
                  <Menu.Item onClick={() => onDeleteSection(section.id)} color="red.500">
                    Delete
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </HStack>
        </Flex>
      </Card.Header>
      {section.expanded !== false && (
        <Card.Body pt={2}>
          <Box
            ref={setDropNodeRef}
            bg={isOver ? dropHighlight : "transparent"}
            borderRadius="md"
            minH={tasksWithIds.length === 0 ? "120px" : "60px"}
            p={tasksWithIds.length === 0 ? 4 : 2}
            transition="background-color 0.2s, padding 0.2s, min-height 0.2s"
            borderWidth={isOver ? "2px" : "0px"}
            borderColor={isOver ? "blue.400" : "transparent"}
            borderStyle="dashed"
          >
            {tasksWithIds.length === 0 ? (
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" textAlign="center" py={8} color={mutedText}>
                  {isOver ? "Drop here" : "No tasks"}
                </Text>
                <Input
                  ref={inlineInputRef}
                  value={inlineInputValue}
                  onChange={e => setInlineInputValue(e.target.value)}
                  onBlur={handleInlineInputBlur}
                  onKeyDown={handleInlineInputKeyDown}
                  onClick={handleInlineInputClick}
                  placeholder="New task..."
                  size="sm"
                  variant="unstyled"
                  bg="transparent"
                  borderWidth="0px"
                  px={2}
                  py={1}
                  fontSize="sm"
                  color={isInlineInputActive ? textColor : mutedText}
                  _focus={{
                    outline: "none",
                    color: textColor,
                  }}
                  _placeholder={{ color: mutedText }}
                  _hover={{
                    color: textColor,
                  }}
                />
              </VStack>
            ) : (
              <SortableContext
                id={droppableId}
                items={tasksWithIds.map(t => t.draggableId)}
                strategy={verticalListSortingStrategy}
              >
                <VStack align="stretch" spacing={3} py={2}>
                  {tasksWithIds.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="today"
                      index={index}
                      containerId={droppableId}
                      onToggle={onToggleTask}
                      onToggleSubtask={onToggleSubtask}
                      onToggleExpand={onToggleExpand}
                      onEdit={onEditTask}
                      onUpdateTitle={onUpdateTaskTitle}
                      onDelete={onDeleteTask}
                      onDuplicate={onDuplicateTask}
                      hoveredDroppable={hoveredDroppable}
                      draggableId={task.draggableId}
                      viewDate={viewDate}
                    />
                  ))}
                  <Input
                    ref={inlineInputRef}
                    value={inlineInputValue}
                    onChange={e => setInlineInputValue(e.target.value)}
                    onBlur={handleInlineInputBlur}
                    onKeyDown={handleInlineInputKeyDown}
                    onClick={handleInlineInputClick}
                    placeholder="New task..."
                    size="sm"
                    variant="unstyled"
                    bg="transparent"
                    borderWidth="0px"
                    px={2}
                    py={1}
                    fontSize="sm"
                    color={isInlineInputActive ? textColor : mutedText}
                    _focus={{
                      outline: "none",
                      color: textColor,
                    }}
                    _placeholder={{ color: mutedText }}
                    _hover={{
                      color: textColor,
                    }}
                  />
                </VStack>
              </SortableContext>
            )}
          </Box>
        </Card.Body>
      )}
    </Card.Root>
  );
};
