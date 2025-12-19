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
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS } from "@/lib/constants";

export const TaskDialog = ({
  isOpen,
  onClose,
  task,
  sections,
  onSave,
  defaultSectionId,
  defaultTime,
  defaultDate,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [selectedDays, setSelectedDays] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setSectionId(task.sectionId || sections[0]?.id || "");
      setTime(task.time || "");
      // Extract date from recurrence or use empty string
      if (task.recurrence?.startDate) {
        const taskDate = new Date(task.recurrence.startDate);
        setDate(taskDate.toISOString().split("T")[0]);
      } else {
        setDate(""); // Don't set default date for existing tasks
      }
      setDuration(task.duration || 30);
      setRecurrenceType(task.recurrence?.type || "none");
      setSelectedDays(task.recurrence?.days || []);
      setSubtasks(task.subtasks || []);
      setColor(task.color || "#3b82f6");
    } else {
      setTitle("");
      setSectionId(defaultSectionId || sections[0]?.id || "");
      setTime(defaultTime || "");
      setDate(
        defaultDate ||
          (defaultTime ? new Date().toISOString().split("T")[0] : "")
      );
      setDuration(30);
      setRecurrenceType("none");
      setSelectedDays([]);
      setSubtasks([]);
      setColor("#3b82f6");
    }
  }, [task, isOpen, sections, defaultSectionId, defaultTime, defaultDate]);

  const handleSave = () => {
    // For one-time tasks (recurrenceType === "none"), store date in a special structure
    // For recurring tasks, use normal recurrence structure
    let recurrence = null;
    if (recurrenceType === "none") {
      // One-time task: store date if provided, but no recurrence pattern
      if (date) {
        recurrence = {
          type: "none",
          startDate: new Date(date).toISOString(),
        };
      }
    } else {
      // Recurring task: store recurrence pattern
      recurrence = {
        type: recurrenceType,
        ...(recurrenceType === "weekly" && { days: selectedDays }),
        ...(date && { startDate: new Date(date).toISOString() }),
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
      completed: task?.completed || false,
      expanded: task?.expanded || false,
      color,
      order: task?.order ?? 999,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" overflowY="auto">
        <ModalHeader>{task ? "Edit Task" : "New Task"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} py={4}>
            <Box w="full">
              <FormLabel>Task Name</FormLabel>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
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
              <Select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
              >
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
                />
              </Box>
              <Box>
                <FormLabel>Time</FormLabel>
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="Optional"
                />
              </Box>
            </SimpleGrid>
            <Box w="full">
              <FormLabel>Duration</FormLabel>
              <Select
                value={duration.toString()}
                onChange={e => setDuration(parseInt(e.target.value))}
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d.value} value={d.value.toString()}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box w="full">
              <FormLabel>Recurrence</FormLabel>
              <Select
                value={recurrenceType}
                onChange={e => setRecurrenceType(e.target.value)}
              >
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
                        prev.includes(day.value)
                          ? prev.filter(d => d !== day.value)
                          : [...prev, day.value]
                      )
                    }
                    colorScheme={
                      selectedDays.includes(day.value) ? "blue" : "gray"
                    }
                    variant={
                      selectedDays.includes(day.value) ? "solid" : "outline"
                    }
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
                  <Flex key={st.id} align="center" gap={2}>
                    <Text flex={1} fontSize="sm">
                      {st.title}
                    </Text>
                    <IconButton
                      icon={<Trash2 size={14} />}
                      onClick={() =>
                        setSubtasks(subtasks.filter(s => s.id !== st.id))
                      }
                      size="sm"
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
                    placeholder="Add subtask"
                    onKeyDown={e => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        setSubtasks([
                          ...subtasks,
                          {
                            id: Date.now().toString(),
                            title: newSubtask.trim(),
                            completed: false,
                          },
                        ]);
                        setNewSubtask("");
                      }
                    }}
                  />
                  <IconButton
                    icon={<Plus size={16} />}
                    onClick={() => {
                      if (newSubtask.trim()) {
                        setSubtasks([
                          ...subtasks,
                          {
                            id: Date.now().toString(),
                            title: newSubtask.trim(),
                            completed: false,
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
          </VStack>
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
