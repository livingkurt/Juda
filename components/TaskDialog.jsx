"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  Dialog,
  NativeSelect,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  IconButton,
  Tag,
  Tabs,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS } from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";
import { TagSelector } from "./TagSelector";
import { TaskItem } from "./TaskItem";

export const TaskDialog = ({
  isOpen,
  onClose,
  task,
  sections,
  onSave,
  defaultSectionId,
  defaultTime,
  defaultDate,
  tags = [],
  onCreateTag,
  onDeleteTag,
  allTasks = [], // All tasks for search functionality
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const searchResultBg = useColorModeValue("gray.100", "gray.600");
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(0);
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [selectedDays, setSelectedDays] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskTime, setSubtaskTime] = useState("");
  const [subtaskDuration, setSubtaskDuration] = useState(30);
  const [subtaskColor, setSubtaskColor] = useState("#3b82f6");
  const [color, setColor] = useState("#3b82f6");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subtaskTabIndex, setSubtaskTabIndex] = useState(0);
  const [activeSubtaskId, setActiveSubtaskId] = useState(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"];

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setSectionId(task.sectionId || sections[0]?.id || "");
      setTime(task.time || "");
      if (task.recurrence?.startDate) {
        // Extract just the date portion from the ISO string to avoid timezone conversion
        const isoDate = task.recurrence.startDate.split("T")[0];
        setDate(isoDate);
      } else {
        setDate("");
      }
      setDuration(task.duration ?? 0);
      setRecurrenceType(task.recurrence?.type || "none");
      setSelectedDays(task.recurrence?.days || []);
      // Sort subtasks by order and ensure order field is set
      const sortedSubtasks = (task.subtasks || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((st, idx) => ({ ...st, order: idx }));
      setSubtasks(sortedSubtasks);
      setColor(task.color || "#3b82f6");
      setSelectedTagIds(task.tags?.map(t => t.id) || []);
    } else {
      setTitle("");
      setSectionId(defaultSectionId || sections[0]?.id || "");
      setTime(defaultTime || "");
      setDate(defaultDate || (defaultTime ? formatLocalDate(new Date()) : ""));
      setDuration(defaultTime ? 30 : 0);
      setRecurrenceType("none");
      setSelectedDays([]);
      setSubtasks([]);
      setColor("#3b82f6");
      setSelectedTagIds([]);
    }
  }, [task, isOpen, sections, defaultSectionId, defaultTime, defaultDate]);

  const handleSave = () => {
    if (!title.trim()) return;

    let recurrence = null;
    if (recurrenceType === "none") {
      if (date) {
        // Create ISO string at midnight UTC from the date string to avoid timezone shifts
        recurrence = {
          type: "none",
          startDate: `${date}T00:00:00.000Z`,
        };
      }
    } else {
      recurrence = {
        type: recurrenceType,
        ...(recurrenceType === "weekly" && { days: selectedDays }),
        ...(date && { startDate: `${date}T00:00:00.000Z` }),
      };
    }

    // Ensure all subtasks have proper order field set
    const orderedSubtasks = subtasks.map((st, idx) => ({
      ...st,
      order: idx,
    }));

    onSave({
      id: task?.id,
      title,
      sectionId,
      time: time || null,
      duration,
      recurrence,
      subtasks: orderedSubtasks,
      // Note: Task completion is tracked via TaskCompletion records, not a field on Task
      expanded: task?.expanded || false,
      color,
      order: task?.order ?? 999,
      tagIds: selectedTagIds,
    });
    onClose();
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    handleSave();
  };

  // Handle drag and drop for subtasks
  const handleDragStart = event => {
    setActiveSubtaskId(event.active.id);
  };

  const handleDragEnd = event => {
    const { active, over } = event;
    setActiveSubtaskId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subtasks.findIndex(st => `subtask-${st.id}` === active.id);
    const newIndex = subtasks.findIndex(st => `subtask-${st.id}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSubtasks = arrayMove(subtasks, oldIndex, newIndex);
      setSubtasks(reorderedSubtasks.map((st, idx) => ({ ...st, order: idx })));
    }
  };

  const handleDragCancel = () => {
    setActiveSubtaskId(null);
  };

  // Get the active subtask for drag overlay
  const activeSubtask = activeSubtaskId ? subtasks.find(st => `subtask-${st.id}` === activeSubtaskId) : null;

  // Search and add existing task as subtask
  const filteredTasks = allTasks.filter(t => {
    // Exclude current task and its subtasks
    if (task && t.id === task.id) return false;
    if (subtasks.some(st => st.id === t.id)) return false;
    // Filter by search query
    if (searchQuery.trim()) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  const addExistingTaskAsSubtask = existingTask => {
    // Add the task as a subtask (it will be converted when saved)
    setSubtasks([
      ...subtasks,
      {
        id: existingTask.id,
        title: existingTask.title,
        completed: false,
        time: existingTask.time,
        duration: existingTask.duration || 30,
        color: existingTask.color || "#3b82f6",
        order: subtasks.length,
        isExisting: true, // Flag to indicate this is an existing task
      },
    ]);
    setSearchQuery("");
    setSubtaskTabIndex(0); // Switch back to subtasks list
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()} size="md">
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner>
        <Dialog.Content bg={bgColor} maxH="90vh" overflowY="auto">
          <Dialog.Header>{task ? "Edit Task" : "New Task"}</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <form onSubmit={handleFormSubmit}>
              <VStack spacing={4} py={4}>
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Task Name
                  </Text>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && title.trim()) {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                  />
                </Box>
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Color
                  </Text>
                  <HStack spacing={2} mt={2} flexWrap="wrap">
                    {colors.map(c => (
                      <Button
                        key={c}
                        w={8}
                        h={8}
                        borderRadius="full"
                        bg={c}
                        onClick={() => setColor(c)}
                        borderWidth={color === c ? "3px" : "0px"}
                        borderColor="blue.400"
                        _hover={{ transform: "scale(1.1)" }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </HStack>
                </Box>
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Section
                  </Text>
                  <NativeSelect.Root value={sectionId}>
                    <NativeSelect.Field onChange={e => setSectionId(e.target.value)}>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>
                <SimpleGrid columns={2} spacing={4} w="full">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Date
                    </Text>
                    <Input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      placeholder="Optional"
                      onKeyDown={e => {
                        if (e.key === "Enter" && title.trim()) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Time
                    </Text>
                    <Input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      placeholder="Optional"
                      onKeyDown={e => {
                        if (e.key === "Enter" && title.trim()) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                    />
                  </Box>
                </SimpleGrid>
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Duration
                  </Text>
                  <NativeSelect.Root value={duration.toString()}>
                    <NativeSelect.Field onChange={e => setDuration(parseInt(e.target.value))}>
                      {DURATION_OPTIONS.map(d => (
                        <option key={d.value} value={d.value.toString()}>
                          {d.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Recurrence
                  </Text>
                  <NativeSelect.Root value={recurrenceType}>
                    <NativeSelect.Field onChange={e => setRecurrenceType(e.target.value)}>
                      <option value="none">None (One-time task)</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Specific days</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>
                {/* Tags */}
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Tags
                  </Text>
                  <HStack spacing={2} flexWrap="wrap" align="center" mt={2}>
                    {/* Tags */}
                    {tags
                      .filter(t => selectedTagIds.includes(t.id))
                      .map(tag => (
                        <Tag.Root
                          key={tag.id}
                          size="sm"
                          borderRadius="full"
                          variant="solid"
                          bg={tag.color}
                          color="white"
                          fontSize="xs"
                        >
                          <Tag.Label>{tag.name}</Tag.Label>
                        </Tag.Root>
                      ))}
                    {/* Add Tag button */}
                    <TagSelector
                      tags={tags}
                      selectedTagIds={selectedTagIds}
                      onTagsChange={setSelectedTagIds}
                      onCreateTag={onCreateTag}
                      onDeleteTag={onDeleteTag}
                      inline
                    />
                  </HStack>
                </Box>
                {recurrenceType === "weekly" && (
                  <HStack spacing={1} w="full">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        w={9}
                        h={9}
                        borderRadius="full"
                        fontSize="sm"
                        fontWeight="medium"
                        onClick={() =>
                          setSelectedDays(prev =>
                            prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value]
                          )
                        }
                        colorPalette={selectedDays.includes(day.value) ? "blue" : "gray"}
                        variant={selectedDays.includes(day.value) ? "solid" : "outline"}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </HStack>
                )}
                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Subtasks
                  </Text>
                  <Tabs.Root
                    value={subtaskTabIndex.toString()}
                    onValueChange={({ value }) => setSubtaskTabIndex(parseInt(value))}
                    variant="enclosed"
                    size="sm"
                  >
                    <Tabs.List>
                      <Tabs.Trigger value="0">Manage ({subtasks.length})</Tabs.Trigger>
                      <Tabs.Trigger value="1">Add Existing</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="0" px={0} py={3}>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                      >
                        <SortableContext
                          items={subtasks.map(st => `subtask-${st.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <VStack align="stretch" spacing={2}>
                            {subtasks.map(st => (
                              <TaskItem
                                key={st.id}
                                task={st}
                                variant="subtask"
                                containerId="task-dialog-subtasks"
                                draggableId={`subtask-${st.id}`}
                                onEdit={() => {
                                  setEditingSubtask(st);
                                  setSubtaskTitle(st.title);
                                  setSubtaskTime(st.time || "");
                                  setSubtaskDuration(st.duration || 30);
                                  setSubtaskColor(st.color || "#3b82f6");
                                }}
                                onDelete={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}
                              />
                            ))}
                          </VStack>
                        </SortableContext>
                        <DragOverlay>
                          {activeSubtask ? (
                            <TaskItem
                              task={activeSubtask}
                              variant="subtask"
                              containerId="task-dialog-subtasks"
                              draggableId={`subtask-${activeSubtask.id}`}
                            />
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                      <Box borderTopWidth="1px" borderColor={useColorModeValue("gray.200", "gray.600")} my={2} />
                      <HStack spacing={2}>
                        <Input
                          value={newSubtask}
                          onChange={e => setNewSubtask(e.target.value)}
                          placeholder="Create new subtask"
                          size="sm"
                          onKeyDown={e => {
                            if (e.key === "Enter" && newSubtask.trim()) {
                              e.preventDefault();
                              e.stopPropagation();
                              setSubtasks([
                                ...subtasks,
                                {
                                  id: Date.now().toString(),
                                  title: newSubtask.trim(),
                                  completed: false,
                                  time: null,
                                  duration: 30,
                                  color: "#3b82f6",
                                  order: subtasks.length,
                                },
                              ]);
                              setNewSubtask("");
                            }
                          }}
                        />
                        <IconButton
                          onClick={() => {
                            if (newSubtask.trim()) {
                              setSubtasks([
                                ...subtasks,
                                {
                                  id: Date.now().toString(),
                                  title: newSubtask.trim(),
                                  completed: false,
                                  time: null,
                                  duration: 30,
                                  color: "#3b82f6",
                                  order: subtasks.length,
                                },
                              ]);
                              setNewSubtask("");
                            }
                          }}
                          size="sm"
                          variant="outline"
                          aria-label="Add subtask"
                        >
                          <Box as="span" color="currentColor">
                            <Plus size={16} stroke="currentColor" />
                          </Box>
                        </IconButton>
                      </HStack>
                    </Tabs.Content>

                    {/* Add Existing Task Tab */}
                    <Tabs.Content value="1" px={0} py={3}>
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2}>
                          <Box as="span" color="gray.500">
                            <Search size={16} />
                          </Box>
                          <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search for tasks to add as subtasks..."
                            size="sm"
                          />
                        </HStack>
                        {searchQuery.trim() && (
                          <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto">
                            {filteredTasks.length > 0 ? (
                              filteredTasks.map(t => (
                                <Box
                                  key={t.id}
                                  cursor="pointer"
                                  _hover={{ opacity: 0.8 }}
                                  onClick={() => addExistingTaskAsSubtask(t)}
                                  position="relative"
                                >
                                  <TaskItem
                                    task={t}
                                    variant="subtask"
                                    containerId="task-dialog-search"
                                    draggableId={`dialog-search-${t.id}`}
                                  />
                                  <Box
                                    position="absolute"
                                    right={2}
                                    top="50%"
                                    transform="translateY(-50%)"
                                    bg={searchResultBg}
                                    borderRadius="md"
                                    p={1}
                                  >
                                    <IconButton
                                      size="xs"
                                      variant="ghost"
                                      aria-label="Add as subtask"
                                      onClick={e => {
                                        e.stopPropagation();
                                        addExistingTaskAsSubtask(t);
                                      }}
                                    >
                                      <Box as="span" color="currentColor">
                                        <Plus size={14} stroke="currentColor" />
                                      </Box>
                                    </IconButton>
                                  </Box>
                                </Box>
                              ))
                            ) : (
                              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                                No tasks found
                              </Text>
                            )}
                          </VStack>
                        )}
                        {!searchQuery.trim() && (
                          <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                            Type to search for existing tasks
                          </Text>
                        )}
                      </VStack>
                    </Tabs.Content>
                  </Tabs.Root>
                </Box>
                {/* Subtask Edit Modal */}
                <Dialog.Root
                  open={editingSubtask !== null}
                  onOpenChange={({ open }) => !open && setEditingSubtask(null)}
                  size="sm"
                >
                  <Dialog.Backdrop bg="blackAlpha.600" />
                  <Dialog.Positioner>
                    <Dialog.Content bg={bgColor}>
                      <Dialog.Header>Edit Subtask</Dialog.Header>
                      <Dialog.CloseTrigger />
                      <Dialog.Body>
                        <VStack spacing={4} py={4}>
                          <Box w="full">
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Title
                            </Text>
                            <Input
                              value={subtaskTitle}
                              onChange={e => setSubtaskTitle(e.target.value)}
                              placeholder="Subtask title"
                            />
                          </Box>
                          <Box w="full">
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Color
                            </Text>
                            <HStack spacing={2} mt={2} flexWrap="wrap">
                              {colors.map(c => (
                                <Button
                                  key={c}
                                  w={6}
                                  h={6}
                                  borderRadius="full"
                                  bg={c}
                                  onClick={() => setSubtaskColor(c)}
                                  borderWidth={subtaskColor === c ? "3px" : "0px"}
                                  borderColor="blue.400"
                                  _hover={{ transform: "scale(1.1)" }}
                                  aria-label={`Select color ${c}`}
                                />
                              ))}
                            </HStack>
                          </Box>
                          <SimpleGrid columns={2} spacing={4} w="full">
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                Time
                              </Text>
                              <Input
                                type="time"
                                value={subtaskTime}
                                onChange={e => setSubtaskTime(e.target.value)}
                                placeholder="Optional"
                              />
                            </Box>
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                Duration
                              </Text>
                              <NativeSelect.Root value={subtaskDuration.toString()}>
                                <NativeSelect.Field onChange={e => setSubtaskDuration(parseInt(e.target.value))}>
                                  {DURATION_OPTIONS.map(d => (
                                    <option key={d.value} value={d.value.toString()}>
                                      {d.label}
                                    </option>
                                  ))}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                              </NativeSelect.Root>
                            </Box>
                          </SimpleGrid>
                        </VStack>
                      </Dialog.Body>
                      <Dialog.Footer>
                        <Button variant="outline" mr={3} onClick={() => setEditingSubtask(null)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (subtaskTitle.trim() && editingSubtask) {
                              setSubtasks(
                                subtasks.map(st =>
                                  st.id === editingSubtask.id
                                    ? {
                                        ...st,
                                        title: subtaskTitle.trim(),
                                        time: subtaskTime || null,
                                        duration: subtaskDuration,
                                        color: subtaskColor,
                                      }
                                    : st
                                )
                              );
                              setEditingSubtask(null);
                              setSubtaskTitle("");
                              setSubtaskTime("");
                              setSubtaskDuration(30);
                              setSubtaskColor("#3b82f6");
                            }
                          }}
                          isDisabled={!subtaskTitle.trim()}
                        >
                          Save
                        </Button>
                      </Dialog.Footer>
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Dialog.Root>
              </VStack>
            </form>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} isDisabled={!title.trim()}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
