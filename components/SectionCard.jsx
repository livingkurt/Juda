"use client";

import { useState, useRef } from "react";
import { Box, Card, Heading, Text, Flex, HStack, VStack, IconButton, Menu, Input } from "@chakra-ui/react";
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
  onOutcomeChange,
  getOutcomeOnDate,
  hasRecordOnDate,
  onCompleteWithNote,
  onSkipTask,
  getCompletionForDate,
  onUpdateTaskColor,
  selectionMode,
  selectedTaskIds,
  onToggleSelection,
  onShiftClick,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const textColor = { _light: "gray.900", _dark: "gray.100" };
  const mutedText = { _light: "gray.500", _dark: "gray.400" };
  const dropHighlight = { _light: "blue.50", _dark: "blue.900" };

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
      mb={{ base: 2, md: 4 }}
      bg={bgColor}
      borderColor={isDropTarget || isOver ? "blue.400" : borderColor}
      borderWidth={isDropTarget || isOver ? "2px" : "1px"}
      opacity={sectionIsDragging ? 0.5 : 1}
      transition="border-color 0.2s, border-width 0.2s"
      w="100%"
      maxW="100%"
      overflow="hidden"
    >
      <Card.Header
        pb={{ base: 1, md: 2 }}
        pt={{ base: 2, md: 3 }}
        px={{ base: 2, md: 4 }}
        w="100%"
        maxW="100%"
        overflow="hidden"
      >
        <Flex align="center" justify="space-between" w="100%" maxW="100%" gap={{ base: 1, md: 2 }}>
          <Flex align="center" gap={{ base: 1, md: 2 }} minW={0} flex={1}>
            <Box
              {...sectionAttributes}
              {...sectionListeners}
              cursor="grab"
              _active={{ cursor: "grabbing" }}
              color={mutedText}
              display={{ base: "none", md: "block" }}
            >
              <GripVertical size={14} stroke="currentColor" />
            </Box>
            <Box as="span" color="orange.500">
              <IconComponent size={14} stroke="currentColor" />
            </Box>
            <Heading size={{ base: "sm", md: "md" }} color={textColor} noOfLines={1}>
              {section.name}
            </Heading>
            <Text fontSize={{ base: "xs", md: "sm" }} color={mutedText} flexShrink={0}>
              ({completedCount}/{tasks.length})
            </Text>
          </Flex>
          <HStack spacing={{ base: 0, md: 1 }} flexShrink={0}>
            <IconButton
              onClick={() => onToggleSectionExpand && onToggleSectionExpand(section.id)}
              size={{ base: "xs", md: "sm" }}
              variant="ghost"
              aria-label={section.expanded !== false ? "Collapse section" : "Expand section"}
              minW={{ base: "24px", md: "32px" }}
              h={{ base: "24px", md: "32px" }}
              p={{ base: 0, md: 1 }}
            >
              <Box as="span" color="currentColor">
                {section.expanded !== false ? (
                  <ChevronUp size={14} stroke="currentColor" />
                ) : (
                  <ChevronDown size={14} stroke="currentColor" />
                )}
              </Box>
            </IconButton>
            <IconButton
              onClick={() => onAddTask(section.id)}
              size={{ base: "xs", md: "sm" }}
              variant="ghost"
              aria-label="Add task"
              minW={{ base: "24px", md: "32px" }}
              h={{ base: "24px", md: "32px" }}
              p={{ base: 0, md: 1 }}
            >
              <Box as="span" color="currentColor">
                <Plus size={14} stroke="currentColor" />
              </Box>
            </IconButton>
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton
                  size={{ base: "xs", md: "sm" }}
                  variant="ghost"
                  aria-label="Section menu"
                  border="none"
                  outline="none"
                  minW={{ base: "24px", md: "32px" }}
                  h={{ base: "24px", md: "32px" }}
                  p={{ base: 0, md: 1 }}
                  _hover={{ border: "none", outline: "none" }}
                  _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                  _active={{ border: "none", outline: "none" }}
                >
                  <Box as="span" color="currentColor">
                    <MoreVertical size={14} stroke="currentColor" />
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
        <Card.Body pt={{ base: 1, md: 2 }} pb={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>
          <Box
            ref={setDropNodeRef}
            bg={isOver ? dropHighlight : "transparent"}
            borderRadius="md"
            minH={tasksWithIds.length === 0 ? { base: "80px", md: "120px" } : { base: "40px", md: "60px" }}
            p={tasksWithIds.length === 0 ? { base: 2, md: 4 } : { base: 1, md: 2 }}
            transition="background-color 0.2s, padding 0.2s, min-height 0.2s"
            borderWidth={isOver ? "2px" : "0px"}
            borderColor={isOver ? "blue.400" : "transparent"}
            borderStyle="dashed"
          >
            {tasksWithIds.length === 0 ? (
              <VStack align="stretch" spacing={{ base: 1, md: 2 }}>
                <Text fontSize={{ base: "xs", md: "sm" }} textAlign="center" py={{ base: 4, md: 8 }} color={mutedText}>
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
                <VStack align="stretch" spacing={{ base: 2, md: 3 }} py={{ base: 1, md: 2 }}>
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
                      onOutcomeChange={onOutcomeChange}
                      getOutcomeOnDate={getOutcomeOnDate}
                      hasRecordOnDate={hasRecordOnDate}
                      onCompleteWithNote={onCompleteWithNote}
                      onSkipTask={onSkipTask}
                      getCompletionForDate={getCompletionForDate}
                      onUpdateTaskColor={onUpdateTaskColor}
                      selectionMode={selectionMode}
                      isSelected={selectedTaskIds?.has(task.id) || false}
                      onToggleSelection={onToggleSelection}
                      onShiftClick={onShiftClick}
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
