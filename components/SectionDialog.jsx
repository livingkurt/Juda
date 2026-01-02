"use client";

import { useState } from "react";
import { Box, Button, Input, Text, Dialog, VStack, HStack, IconButton } from "@chakra-ui/react";
import { SECTION_ICONS } from "@/lib/constants";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// Internal component that resets when key changes
function SectionForm({ section, onSave, onClose, bgColor }) {
  const [name, setName] = useState(section?.name || "");
  const [icon, setIcon] = useState(section?.icon || "sun");

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
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
                    colorPalette={icon === value ? "orange" : "gray"}
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
}

export const SectionDialog = ({ isOpen, onClose, section, onSave }) => {
  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;

  if (!isOpen) return null;

  // Use key to reset form state when section changes
  return (
    <SectionForm key={section?.id || "new"} section={section} onSave={onSave} onClose={onClose} bgColor={bgColor} />
  );
};
