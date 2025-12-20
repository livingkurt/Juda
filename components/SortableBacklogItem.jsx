"use client";

import { Box, Flex, Text, Checkbox, IconButton, useColorModeValue } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { Trash2, GripVertical } from "lucide-react";

export const SortableBacklogItem = ({ item, onDeleteBacklog, onToggleBacklog }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `backlog-item-${item.id}`,
    data: {
      type: "BACKLOG_ITEM",
      containerId: "backlog-items",
    },
  });

  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const gripColor = useColorModeValue("gray.400", "gray.500");

  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Flex ref={setNodeRef} style={style} align="center" gap={2} p={3} borderRadius="md" _hover={{ bg: hoverBg }}>
      <Box flexShrink={0} {...attributes} {...listeners}>
        <GripVertical size={16} style={{ color: gripColor, cursor: "grab" }} />
      </Box>
      <Checkbox
        isChecked={item.completed}
        size="lg"
        onChange={() => onToggleBacklog(item.id)}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
      <Text
        flex={1}
        fontSize="sm"
        textDecoration={item.completed ? "line-through" : "none"}
        opacity={item.completed ? 0.5 : 1}
        color={textColor}
      >
        {item.title}
      </Text>
      <IconButton
        icon={<Trash2 size={16} />}
        size="sm"
        variant="ghost"
        onClick={() => onDeleteBacklog(item.id)}
        aria-label="Delete backlog item"
      />
    </Flex>
  );
};
