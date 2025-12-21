"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Flex,
  IconButton,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS } from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";

export const TaskDialog = ({ isOpen, onClose, task, sections, onSave, defaultSectionId, defaultTime, defaultDate }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const subtaskBgColor = useColorModeValue("gray.50", "gray.700");
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
      setSubtasks(task.subtasks || []);
      setColor(task.color || "#3b82f6");
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
    onSave({
      id: task?.id,
      title,
      sectionId,
      time: time || null,
      duration,
      recurrence,
      subtasks,
      // Note: Task completion is tracked via TaskCompletion records, not a field on Task
      expanded: task?.expanded || false,
      color,
      order: task?.order ?? 999,
    });
    onClose();
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" overflowY="auto">
        <ModalHeader>{task ? "Edit Task" : "New Task"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={handleFormSubmit}>
            <VStack spacing={4} py={4}>
              <Box w="full">
                <FormLabel>Task Name</FormLabel>
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
                <FormLabel>Color</FormLabel>
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
                <FormLabel>Section</FormLabel>
                <Select value={sectionId} onChange={e => setSectionId(e.target.value)}>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Box>
              <SimpleGrid columns={2} spacing={4} w="full">
                <Box>
                  <FormLabel>Date</FormLabel>
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
                  <FormLabel>Time</FormLabel>
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
                <FormLabel>Duration</FormLabel>
                <Select value={duration.toString()} onChange={e => setDuration(parseInt(e.target.value))}>
                  {DURATION_OPTIONS.map(d => (
                    <option key={d.value} value={d.value.toString()}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Box>
              <Box w="full">
                <FormLabel>Recurrence</FormLabel>
                <Select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)}>
                  <option value="none">None (One-time task)</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </Select>
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
                      colorScheme={selectedDays.includes(day.value) ? "blue" : "gray"}
                      variant={selectedDays.includes(day.value) ? "solid" : "outline"}
                    >
                      {day.short}
                    </Button>
                  ))}
                </HStack>
              )}
              <Box w="full">
                <FormLabel>Subtasks</FormLabel>
                <VStack align="stretch" spacing={2} mt={2}>
                  {subtasks.map(st => (
                    <Flex key={st.id} align="center" gap={2} p={2} borderRadius="md" bg={subtaskBgColor}>
                      <Box w={2} h={2} borderRadius="full" bg={st.color || "#3b82f6"} flexShrink={0} />
                      <Text flex={1} fontSize="sm">
                        {st.title}
                      </Text>
                      {st.time && (
                        <Badge size="sm" colorScheme="blue" fontSize="2xs">
                          {st.time}
                        </Badge>
                      )}
                      {st.duration && st.duration > 0 && (
                        <Badge size="sm" colorScheme="gray" fontSize="2xs">
                          {st.duration}m
                        </Badge>
                      )}
                      <IconButton
                        icon={
                          <Box as="span" color="currentColor">
                            <Edit2 size={12} stroke="currentColor" />
                          </Box>
                        }
                        onClick={() => {
                          setEditingSubtask(st);
                          setSubtaskTitle(st.title);
                          setSubtaskTime(st.time || "");
                          setSubtaskDuration(st.duration || 30);
                          setSubtaskColor(st.color || "#3b82f6");
                        }}
                        size="xs"
                        variant="ghost"
                        aria-label="Edit subtask"
                      />
                      <IconButton
                        icon={
                          <Box as="span" color="currentColor">
                            <Trash2 size={14} stroke="currentColor" />
                          </Box>
                        }
                        onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Delete subtask"
                      />
                    </Flex>
                  ))}
                  <HStack spacing={2}>
                    <Input
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      placeholder="Add subtask (quick)"
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
                      icon={
                        <Box as="span" color="currentColor">
                          <Plus size={16} stroke="currentColor" />
                        </Box>
                      }
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
                    />
                  </HStack>
                </VStack>
              </Box>
              {/* Subtask Edit Modal */}
              <Modal isOpen={editingSubtask !== null} onClose={() => setEditingSubtask(null)} size="sm">
                <ModalOverlay />
                <ModalContent bg={bgColor}>
                  <ModalHeader>Edit Subtask</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    <VStack spacing={4} py={4}>
                      <Box w="full">
                        <FormLabel>Title</FormLabel>
                        <Input
                          value={subtaskTitle}
                          onChange={e => setSubtaskTitle(e.target.value)}
                          placeholder="Subtask title"
                        />
                      </Box>
                      <Box w="full">
                        <FormLabel>Color</FormLabel>
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
                          <FormLabel>Time</FormLabel>
                          <Input
                            type="time"
                            value={subtaskTime}
                            onChange={e => setSubtaskTime(e.target.value)}
                            placeholder="Optional"
                          />
                        </Box>
                        <Box>
                          <FormLabel>Duration</FormLabel>
                          <Select
                            value={subtaskDuration.toString()}
                            onChange={e => setSubtaskDuration(parseInt(e.target.value))}
                          >
                            {DURATION_OPTIONS.map(d => (
                              <option key={d.value} value={d.value.toString()}>
                                {d.label}
                              </option>
                            ))}
                          </Select>
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  </ModalBody>
                  <ModalFooter>
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
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </VStack>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} isDisabled={!title.trim()}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
