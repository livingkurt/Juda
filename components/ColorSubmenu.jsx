"use client";

import { useState } from "react";
import { Box, Menu, HStack, Text, SimpleGrid, Portal } from "@chakra-ui/react";
import { Palette, ChevronRight } from "lucide-react";
import { TASK_COLORS } from "@/lib/constants";

export const ColorSubmenu = ({ currentColor, onColorChange, onClose, onCloseParentMenu }) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);

  return (
    <Menu.Root open={submenuOpen} onOpenChange={({ open }) => setSubmenuOpen(open)}>
      <Menu.Trigger asChild>
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            setSubmenuOpen(true);
          }}
          onMouseEnter={() => setSubmenuOpen(true)}
        >
          <HStack justify="space-between" w="100%" gap={2}>
            <HStack gap={2}>
              <Box
                as="span"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="14px"
                h="14px"
                flexShrink={0}
              >
                <Palette size={14} />
              </Box>
              <Text>Color</Text>
            </HStack>
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
              <ChevronRight size={14} />
            </Box>
          </HStack>
        </Menu.Item>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner placement="right-start">
          <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} minW="220px" p={2}>
            <SimpleGrid columns={5} gap={2}>
              {TASK_COLORS.map(color => (
                <Box
                  key={color}
                  w={8}
                  h={8}
                  borderRadius="md"
                  bg={color}
                  cursor="pointer"
                  borderWidth={currentColor === color ? "3px" : "1px"}
                  borderColor={currentColor === color ? "blue.500" : "gray.300"}
                  _dark={{
                    borderColor: currentColor === color ? "blue.400" : "gray.600",
                  }}
                  _hover={{
                    transform: "scale(1.1)",
                    shadow: "md",
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    onColorChange(color);
                    setSubmenuOpen(false);
                    if (onClose) onClose();
                    if (onCloseParentMenu) onCloseParentMenu();
                  }}
                  transition="all 0.2s"
                />
              ))}
            </SimpleGrid>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};
