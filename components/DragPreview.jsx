"use client";

import { Box, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { useDragContext } from "./DragContext";

// Fixed dimensions for all drag previews
const DRAG_PREVIEW_WIDTH = "180px";
const DRAG_PREVIEW_HEIGHT = "40px";

// Calculate offset based on droppable ID
const getOffsetForDroppable = droppableId => {
  if (!droppableId) return 0;

  // Calendar day view timed area has left={16} (64px in Chakra units)
  if (
    droppableId.startsWith("calendar-day|") &&
    !droppableId.includes("untimed")
  ) {
    return 64; // 16 * 4 = 64px (Chakra uses 4px base unit)
  }

  // Calendar week view timed area has left={12} (48px in Chakra units)
  if (
    droppableId.startsWith("calendar-week|") &&
    !droppableId.includes("untimed")
  ) {
    return 48; // 12 * 4 = 48px
  }

  return 0;
};

export const DragPreview = ({ title, provided, snapshot }) => {
  const bgColor = useColorModeValue("blue.100", "blue.800");
  const textColor = useColorModeValue("blue.900", "blue.100");
  const borderColor = useColorModeValue("blue.400", "blue.500");
  const { hoveredDroppable } = useDragContext();

  const libraryStyle = provided.draggableProps.style || {};

  // Calculate offset based on hovered droppable
  const offsetX = getOffsetForDroppable(hoveredDroppable);

  // Adjust the left position to account for dropzone offset
  const adjustedLeft = libraryStyle.left
    ? typeof libraryStyle.left === "number"
      ? libraryStyle.left - offsetX
      : libraryStyle.left
    : undefined;

  // The library measures the original element before dragging starts
  // We need to ensure the wrapper div has fixed dimensions that override everything
  // Use a data attribute to help with CSS targeting if needed
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      data-drag-preview="true"
      style={{
        position: libraryStyle.position || "fixed",
        transform: libraryStyle.transform,
        transition: libraryStyle.transition,
        opacity: libraryStyle.opacity,
        zIndex: 9999,
        left: adjustedLeft,
        top: libraryStyle.top,
        width: DRAG_PREVIEW_WIDTH,
        height: DRAG_PREVIEW_HEIGHT,
        minWidth: DRAG_PREVIEW_WIDTH,
        maxWidth: DRAG_PREVIEW_WIDTH,
        minHeight: DRAG_PREVIEW_HEIGHT,
        maxHeight: DRAG_PREVIEW_HEIGHT,
        pointerEvents: "none",
        boxSizing: "border-box",
        overflow: "hidden",
        // Force dimensions - these should override any library-applied styles
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      <Box
        {...provided.dragHandleProps}
        px={4}
        py={2}
        borderRadius="lg"
        bg={bgColor}
        borderWidth="2px"
        borderColor={borderColor}
        borderStyle="solid"
        boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)"
        display="flex"
        alignItems="center"
        w="full"
        h="full"
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={textColor}
          isTruncated
          noOfLines={1}
          w="full"
        >
          {title}
        </Text>
      </Box>
    </div>
  );
};

// Export placeholder component for use when dragging starts
// This ensures the library measures the correct size
export const DragPlaceholder = () => {
  return (
    <Box
      w={DRAG_PREVIEW_WIDTH}
      h={DRAG_PREVIEW_HEIGHT}
      minW={DRAG_PREVIEW_WIDTH}
      maxW={DRAG_PREVIEW_WIDTH}
      minH={DRAG_PREVIEW_HEIGHT}
      maxH={DRAG_PREVIEW_HEIGHT}
      opacity={0}
      pointerEvents="none"
      style={{
        width: DRAG_PREVIEW_WIDTH,
        height: DRAG_PREVIEW_HEIGHT,
        minWidth: DRAG_PREVIEW_WIDTH,
        maxWidth: DRAG_PREVIEW_WIDTH,
        minHeight: DRAG_PREVIEW_HEIGHT,
        maxHeight: DRAG_PREVIEW_HEIGHT,
      }}
    />
  );
};
