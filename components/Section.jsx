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
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Plus, MoreVertical, GripVertical, Sun } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { SECTION_ICONS } from "@/lib/constants";

// Single section card component
const SectionCard = ({
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
  hoveredDroppable,
  droppableId,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");

  const IconComponent =
    SECTION_ICONS.find(i => i.value === section.icon)?.Icon || Sun;
  const completedCount = tasks.filter(
    t =>
      t.completed ||
      (t.subtasks &&
        t.subtasks.length > 0 &&
        t.subtasks.every(st => st.completed))
  ).length;

  const isDropTarget = hoveredDroppable === droppableId;

  return (
    <Draggable draggableId={`section-${section.id}`} index={sectionIndex}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          mb={4}
          bg={bgColor}
          borderColor={isDropTarget ? "blue.400" : borderColor}
          borderWidth={isDropTarget ? "2px" : "1px"}
          opacity={snapshot.isDragging ? 0.5 : 1}
          transition="border-color 0.2s, border-width 0.2s"
        >
          <CardHeader pb={2}>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={2}>
                <Box
                  {...provided.dragHandleProps}
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
                    <MenuItem onClick={() => onEditSection(section)}>
                      Edit
                    </MenuItem>
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
            <Droppable droppableId={droppableId} type="TASK">
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  bg={snapshot.isDraggingOver ? dropHighlight : "transparent"}
                  borderRadius="md"
                  minH="50px"
                  transition="background-color 0.2s"
                >
                  {tasks.length === 0 ? (
                    <Text
                      fontSize="sm"
                      textAlign="center"
                      py={4}
                      color={mutedText}
                    >
                      {snapshot.isDraggingOver ? "Drop here" : "No tasks"}
                    </Text>
                  ) : (
                    tasks.map((task, index) => {
                      const sectionId = section.id;
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          index={index}
                          onToggle={onToggleTask}
                          onToggleSubtask={onToggleSubtask}
                          onToggleExpand={onToggleExpand}
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                          hoveredDroppable={hoveredDroppable}
                          draggableId={createDraggableId.todaySection(
                            task.id,
                            sectionId
                          )}
                        />
                      );
                    })
                  )}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </CardBody>
        </Card>
      )}
    </Draggable>
  );
};

// Main Section component that renders all sections
export const Section = ({
  sections,
  tasksBySection,
  onToggleTask,
  onToggleSubtask,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onEditSection,
  onDeleteSection,
  onAddSection,
  hoveredDroppable,
  createDroppableId,
  createDraggableId,
}) => {
  const dropHighlight = useColorModeValue("gray.50", "gray.800");

  return (
    <Droppable droppableId="sections" type="SECTION" direction="vertical">
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          bg={snapshot.isDraggingOver ? dropHighlight : "transparent"}
          borderRadius="md"
        >
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              tasks={tasksBySection[section.id] || []}
              onToggleTask={onToggleTask}
              onToggleSubtask={onToggleSubtask}
              onToggleExpand={onToggleExpand}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onAddTask={onAddTask}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              hoveredDroppable={hoveredDroppable}
              droppableId={createDroppableId.todaySection(section.id)}
              createDraggableId={createDraggableId}
            />
          ))}
          {provided.placeholder}
          <Button
            variant="outline"
            onClick={onAddSection}
            w="full"
            py={6}
            borderStyle="dashed"
            mt={4}
          >
            <Plus size={20} style={{ marginRight: "8px" }} />
            Add Section
          </Button>
        </Box>
      )}
    </Droppable>
  );
};
