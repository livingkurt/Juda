"use client";

import { useState } from "react";
import { Box, Button, TextInput, Text, Modal, Stack, Group, ActionIcon } from "@mantine/core";
import { SECTION_ICONS } from "@/lib/constants";

// Internal component that resets when key changes
function SectionForm({ section, onSave, onClose }) {
  const [name, setName] = useState(section?.name || "");
  const [icon, setIcon] = useState(section?.icon || "sun");

  return (
    <Modal opened={true} onClose={onClose} title={section ? "Edit Section" : "New Section"} centered>
      <Stack gap="md" py="md">
        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Name
          </Text>
          <TextInput value={name} onChange={e => setName(e.target.value)} />
        </Box>
        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Icon
          </Text>
          <Group gap={8} mt={8}>
            {SECTION_ICONS.map(({ value, Icon }) => (
              <ActionIcon
                key={value}
                onClick={() => setIcon(value)}
                color={icon === value ? "orange" : "gray"}
                variant={icon === value ? "filled" : "outline"}
                aria-label={`Select ${value} icon`}
              >
                <Icon size={20} stroke="currentColor" />
              </ActionIcon>
            ))}
          </Group>
        </Box>
      </Stack>
      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={onClose}>
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
          disabled={!name.trim()}
        >
          Save
        </Button>
      </Group>
    </Modal>
  );
}

export const SectionDialog = ({ isOpen, onClose, section, onSave }) => {
  if (!isOpen) return null;

  // Use key to reset form state when section changes
  return <SectionForm key={section?.id || "new"} section={section} onSave={onSave} onClose={onClose} />;
};
