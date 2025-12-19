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
  useColorModeValue,
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";

export const BacklogDrawer = ({
  isOpen,
  onClose,
  backlog,
  onToggle,
  onDelete,
  onAdd,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const [newItem, setNewItem] = useState("");

  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="sm">
      <DrawerOverlay />
      <DrawerContent bg={bgColor}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
          Backlog
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={2}>
            {backlog.map(item => (
              <Flex
                key={item.id}
                align="center"
                gap={2}
                p={3}
                borderRadius="md"
                _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                cursor="pointer"
                onClick={() => onToggle(item.id)}
              >
                <Checkbox isChecked={item.completed} size="lg" />
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
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="Delete item"
                />
              </Flex>
            ))}
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
