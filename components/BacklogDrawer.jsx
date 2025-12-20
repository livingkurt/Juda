"use client";

import { useState } from "react";
import {
  Box,
  Input,
  VStack,
  HStack,
  Flex,
  Text,
  Checkbox,
  IconButton,
  Divider,
  Badge,
  useColorModeValue,
  Heading,
} from "@chakra-ui/react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Plus, Trash2, Edit2, X, GripVertical } from "lucide-react";

export const BacklogDrawer = ({
  isOpen,
  onClose,
  backlog,
  backlogTasks,
  sections,
  onToggleBacklog,
  onToggleTask,
  onDeleteBacklog,
  onDeleteTask,
  onEditTask,
  onAdd,
  onAddTask,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const [newItem, setNewItem] = useState("");

  const getSectionName = sectionId => {
    return sections.find(s => s.id === sectionId)?.name || "Unknown";
  };

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg={bgColor}>
      <Box
        p={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexShrink={0}
      >
        <Flex align="center" justify="space-between" mb={2}>
          <Heading size="md">Backlog</Heading>
          <HStack spacing={2}>
            <IconButton
              icon={<Plus size={18} />}
              onClick={onAddTask}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              aria-label="Add task to backlog"
            />
            <IconButton
              icon={<X size={18} />}
              onClick={onClose}
              size="sm"
              variant="ghost"
              aria-label="Close backlog"
            />
          </HStack>
        </Flex>
        <Badge colorScheme="blue">
          {backlogTasks.length} task{backlogTasks.length !== 1 ? "s" : ""}
        </Badge>
      </Box>
      <Droppable droppableId="backlog" type="TASK">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            flex={1}
            overflowY="auto"
            p={4}
            bg={
              snapshot.isDraggingOver
                ? useColorModeValue("blue.50", "blue.900")
                : "transparent"
            }
            borderRadius="md"
            transition="background-color 0.2s"
          >
            <VStack align="stretch" spacing={3}>
              {/* Tasks that should be in backlog */}
              {backlogTasks.length > 0 && (
                <>
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color={mutedText}
                      mb={2}
                      textTransform="uppercase"
                    >
                      Unscheduled Tasks
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {backlogTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Flex
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              align="center"
                              gap={2}
                              p={3}
                              borderRadius="md"
                              _hover={{ bg: hoverBg }}
                              cursor="grab"
                              borderLeftWidth="3px"
                              borderLeftColor={task.color || "#3b82f6"}
                              bg={
                                snapshot.isDragging
                                  ? useColorModeValue("blue.100", "blue.800")
                                  : "transparent"
                              }
                              boxShadow={snapshot.isDragging ? "lg" : "none"}
                              style={provided.draggableProps.style}
                            >
                              <Box flexShrink={0}>
                                <GripVertical
                                  size={16}
                                  color={useColorModeValue(
                                    "gray.400",
                                    "gray.500"
                                  )}
                                />
                              </Box>
                              <Checkbox
                                isChecked={task.completed}
                                size="lg"
                                onChange={() => onToggleTask(task.id)}
                                onClick={e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                flexShrink={0}
                              />
                              <Box flex={1} minW={0}>
                                <Text
                                  fontSize="sm"
                                  fontWeight="medium"
                                  textDecoration={
                                    task.completed ? "line-through" : "none"
                                  }
                                  opacity={task.completed ? 0.5 : 1}
                                  color={textColor}
                                >
                                  {task.title}
                                </Text>
                                <HStack spacing={2} mt={1}>
                                  <Text fontSize="xs" color={mutedText}>
                                    {getSectionName(task.sectionId)}
                                  </Text>
                                  {task.recurrence &&
                                    task.recurrence.type !== "none" && (
                                      <Badge
                                        size="sm"
                                        colorScheme="purple"
                                        fontSize="2xs"
                                      >
                                        {task.recurrence.type === "daily"
                                          ? "Daily"
                                          : task.recurrence.type === "weekly"
                                          ? "Weekly"
                                          : "Recurring"}
                                      </Badge>
                                    )}
                                  {!task.time && (
                                    <Badge
                                      size="sm"
                                      colorScheme="orange"
                                      fontSize="2xs"
                                    >
                                      No time
                                    </Badge>
                                  )}
                                </HStack>
                              </Box>
                              <IconButton
                                icon={<Edit2 size={14} />}
                                onClick={e => {
                                  e.stopPropagation();
                                  onEditTask(task);
                                }}
                                size="sm"
                                variant="ghost"
                                aria-label="Edit task"
                              />
                              <IconButton
                                icon={<Trash2 size={14} />}
                                onClick={e => {
                                  e.stopPropagation();
                                  onDeleteTask(task.id);
                                }}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                aria-label="Delete task"
                              />
                            </Flex>
                          )}
                        </Draggable>
                      ))}
                    </VStack>
                  </Box>
                  {backlog.length > 0 && <Divider />}
                </>
              )}

              {/* Manual backlog items */}
              {backlog.length > 0 && (
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={mutedText}
                    mb={2}
                    textTransform="uppercase"
                  >
                    Quick Notes
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {backlog.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={`backlog-item-${item.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Flex
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            align="center"
                            gap={2}
                            p={3}
                            borderRadius="md"
                            _hover={{ bg: hoverBg }}
                            cursor="grab"
                            bg={
                              snapshot.isDragging
                                ? useColorModeValue("blue.100", "blue.800")
                                : "transparent"
                            }
                            boxShadow={snapshot.isDragging ? "lg" : "none"}
                          >
                            <Box {...provided.dragHandleProps} cursor="grab">
                              <GripVertical
                                size={16}
                                color={useColorModeValue(
                                  "gray.400",
                                  "gray.500"
                                )}
                              />
                            </Box>
                            <Checkbox
                              isChecked={item.completed}
                              size="lg"
                              onChange={() => onToggleBacklog(item.id)}
                              onClick={e => e.stopPropagation()}
                            />
                            <Text
                              flex={1}
                              fontSize="sm"
                              textDecoration={
                                item.completed ? "line-through" : "none"
                              }
                              opacity={item.completed ? 0.5 : 1}
                              color={textColor}
                            >
                              {item.title}
                            </Text>
                            <IconButton
                              icon={<Trash2 size={16} />}
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteBacklog(item.id);
                              }}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              aria-label="Delete item"
                            />
                          </Flex>
                        )}
                      </Draggable>
                    ))}
                  </VStack>
                </Box>
              )}

              {backlogTasks.length === 0 && backlog.length === 0 && (
                <Text fontSize="sm" color={mutedText} textAlign="center" py={8}>
                  No items in backlog
                </Text>
              )}
              {provided.placeholder}
            </VStack>
          </Box>
        )}
      </Droppable>
      <Box p={4} borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
        <HStack spacing={2}>
          <Input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add to backlog..."
            onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
          />
          <IconButton
            icon={<Plus size={16} />}
            onClick={() => {
              if (newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
            variant="outline"
            aria-label="Add to backlog"
          />
        </HStack>
      </Box>
    </Box>
  );
};
