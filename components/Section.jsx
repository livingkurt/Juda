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
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreVertical, GripVertical, Sun } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { SECTION_ICONS } from "@/lib/constants";

export const Section = ({
  section,
  index: sectionIndex,
  tasks,
  onToggleTask,
  onToggleSubtask,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onEditSection,
  onDeleteSection,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  const IconComponent =
    SECTION_ICONS.find(i => i.value === section.icon)?.Icon || Sun;
  const completedCount = tasks.filter(
    t =>
      t.completed ||
      (t.subtasks &&
        t.subtasks.length > 0 &&
        t.subtasks.every(st => st.completed))
  ).length;

  const {
    attributes,
    listeners,
    setNodeRef: setSectionRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: {
      type: "SECTION",
      section,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: "TASK",
      droppableId: section.id,
      sectionId: section.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setSectionRef}
      style={style}
      mb={4}
      bg={bgColor}
      borderColor={borderColor}
    >
      <CardHeader pb={2}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <Box
              {...attributes}
              {...listeners}
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
                <MenuItem
                  onClick={() => onDeleteSection(section.id)}
                  color="red.500"
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody>
        <Box
          ref={setDroppableRef}
          bg={isOver ? useColorModeValue("gray.50", "gray.700") : "transparent"}
          borderRadius="md"
          minH="50px"
        >
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <Text fontSize="sm" textAlign="center" py={4} color={mutedText}>
                No tasks
              </Text>
            ) : (
              tasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  onToggle={onToggleTask}
                  onToggleSubtask={onToggleSubtask}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </SortableContext>
        </Box>
      </CardBody>
    </Card>
  );
};
