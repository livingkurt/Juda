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
  VStack,
  HStack,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>{section ? "Edit Section" : "New Section"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} py={4}>
            <Box w="full">
              <FormLabel>Name</FormLabel>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </Box>
            <Box w="full">
              <FormLabel>Icon</FormLabel>
              <HStack spacing={2} mt={2}>
                {SECTION_ICONS.map(({ value, Icon }) => (
                  <IconButton
                    key={value}
                    icon={<Icon size={20} />}
                    onClick={() => setIcon(value)}
                    colorScheme={icon === value ? "orange" : "gray"}
                    variant={icon === value ? "solid" : "outline"}
                    aria-label={`Select ${value} icon`}
                  />
                ))}
              </HStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
