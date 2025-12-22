"use client";

import { useState, useEffect } from "react";
import { Box, Button, Input, Text, Dialog, VStack, HStack, IconButton } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { SECTION_ICONS } from "@/lib/constants";

export const SectionDialog = ({ isOpen, onClose, section, onSave }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("sun");

  useEffect(() => {
    setName(section?.name || "");
    setIcon(section?.icon || "sun");
  }, [section, isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Content bg={bgColor}>
        <Dialog.Header>{section ? "Edit Section" : "New Section"}</Dialog.Header>
        <Dialog.CloseTrigger />
        <Dialog.Body>
          <VStack spacing={4} py={4}>
            <Box w="full">
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Name
              </Text>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </Box>
            <Box w="full">
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Icon
              </Text>
              <HStack spacing={2} mt={2}>
                {SECTION_ICONS.map(({ value, Icon }) => (
                  <IconButton
                    key={value}
                    onClick={() => setIcon(value)}
                    colorScheme={icon === value ? "orange" : "gray"}
                    variant={icon === value ? "solid" : "outline"}
                    aria-label={`Select ${value} icon`}
                  >
                    <Box as="span" color="currentColor">
                      <Icon size={20} stroke="currentColor" />
                    </Box>
                  </IconButton>
                ))}
              </HStack>
            </Box>
          </VStack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({
                id: section?.id,
                name,
                icon,
                order: section?.order ?? 999,
              });
              onClose();
            }}
            isDisabled={!name.trim()}
          >
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};
