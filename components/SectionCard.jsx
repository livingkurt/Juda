"use client";

import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreVertical, GripVertical, Sun } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { SECTION_ICONS } from "@/lib/constants";

export const SectionCard = ({
  section,
  tasks,
  onToggleTask,
  onToggleSubtask,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  onEditSection,
  onDeleteSection,
  hoveredDroppable,
  droppableId,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");

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

  return (
    <Card
      ref={setSectionNodeRef}
      style={sectionStyle}
      mb={4}
      bg={bgColor}
      borderColor={isDropTarget || isOver ? "blue.400" : borderColor}
      borderWidth={isDropTarget || isOver ? "2px" : "1px"}
      opacity={sectionIsDragging ? 0.5 : 1}
      transition="border-color 0.2s, border-width 0.2s"
    >
      <CardHeader pb={2}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <Box
              {...sectionAttributes}
              {...sectionListeners}
              cursor="grab"
              _active={{ cursor: "grabbing" }}
              color={mutedText}
            >
              <GripVertical size={18} />
            </Box>
            <IconComponent size={20} color="orange.500" />
            <Heading size="md" color={textColor}>
              {section.name}
            </Heading>
            <Text fontSize="sm" color={mutedText}>
              ({completedCount}/{tasks.length})
            </Text>
          </Flex>
          <HStack spacing={1}>
            <IconButton
              icon={<Plus size={16} />}
              onClick={() => onAddTask(section.id)}
              size="sm"
              variant="ghost"
              aria-label="Add task"
            />
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<MoreVertical size={16} />}
                size="sm"
                variant="ghost"
                aria-label="Section menu"
              />
              <MenuList>
                <MenuItem onClick={() => onEditSection(section)}>Edit</MenuItem>
                <MenuItem onClick={() => onDeleteSection(section.id)} color="red.500">
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody pt={2}>
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
            <Text fontSize="sm" textAlign="center" py={8} color={mutedText}>
              {isOver ? "Drop here" : "No tasks"}
            </Text>
          ) : (
            <SortableContext items={tasksWithIds.map(t => t.draggableId)} strategy={verticalListSortingStrategy}>
              <VStack align="stretch" spacing={3} py={2}>
                {tasksWithIds.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    onToggle={onToggleTask}
                    onToggleSubtask={onToggleSubtask}
                    onToggleExpand={onToggleExpand}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onDuplicate={onDuplicateTask}
                    hoveredDroppable={hoveredDroppable}
                    draggableId={task.draggableId}
                  />
                ))}
              </VStack>
            </SortableContext>
          )}
        </Box>
      </CardBody>
    </Card>
  );
};
