"use client";

import { useState } from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
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
} from "@chakra-ui/react";
import { Plus, Trash2, Edit2, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

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
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="sm">
      <DrawerOverlay />
      <DrawerContent bg={bgColor}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
          <Flex align="center" justify="space-between">
            <Text>Backlog</Text>
            <Badge colorScheme="blue">
              {backlogTasks.length} task{backlogTasks.length !== 1 ? "s" : ""}
            </Badge>
          </Flex>
        </DrawerHeader>
        <DrawerBody>
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
                    {backlogTasks.map(task => (
                      <Flex
                        key={task.id}
                        align="center"
                        gap={2}
                        p={3}
                        borderRadius="md"
                        _hover={{ bg: hoverBg }}
                        cursor="pointer"
                        onClick={() => onToggleTask(task.id)}
                        borderLeftWidth="3px"
                        borderLeftColor={task.color || "#3b82f6"}
                      >
                        <Checkbox
                          isChecked={task.completed}
                          size="lg"
                          onChange={() => onToggleTask(task.id)}
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
                            {task.recurrence && (
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
                  {backlog.map(item => (
                    <Flex
                      key={item.id}
                      align="center"
                      gap={2}
                      p={3}
                      borderRadius="md"
                      _hover={{ bg: hoverBg }}
                      cursor="pointer"
                      onClick={() => onToggleBacklog(item.id)}
                    >
                      <Checkbox isChecked={item.completed} size="lg" />
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
                  ))}
                </VStack>
              </Box>
            )}

            {backlogTasks.length === 0 && backlog.length === 0 && (
              <Text fontSize="sm" color={mutedText} textAlign="center" py={8}>
                No items in backlog
              </Text>
            )}
          </VStack>
        </DrawerBody>
        <Box p={4} borderTopWidth="1px" borderColor={borderColor}>
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
      </DrawerContent>
    </Drawer>
  );
};
