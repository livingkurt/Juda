"use client";

import { Menu, MenuItem, IconButton, HStack, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { Check, X, SkipForward, Circle } from "lucide-react";

export const TaskOutcomeMenu = ({ taskId, date, currentOutcome, onSelectOutcome, size = "sm" }) => {
  const menuBg = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  // Determine current icon and color
  const getButtonProps = () => {
    switch (currentOutcome) {
      case "completed":
        return { icon: <Check size={16} />, colorScheme: "green", variant: "solid" };
      case "skipped":
        return { icon: <SkipForward size={16} />, colorScheme: "gray", variant: "outline" };
      case "not_done":
        return { icon: <X size={16} />, colorScheme: "red", variant: "outline" };
      default:
        return { icon: <Circle size={16} />, colorScheme: "gray", variant: "ghost" };
    }
  };

  const buttonProps = getButtonProps();

  const handleSelect = outcome => {
    if (outcome === currentOutcome) {
      // Clicking same outcome removes the record
      onSelectOutcome(taskId, date, null);
    } else {
      onSelectOutcome(taskId, date, outcome);
    }
  };

  return (
    <Menu.Root isLazy placement="bottom-start">
      <Menu.Trigger asChild>
        <IconButton
          icon={buttonProps.icon}
          colorScheme={buttonProps.colorScheme}
          variant={buttonProps.variant}
          size={size}
          aria-label="Set task outcome"
          borderRadius="full"
        />
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content bg={menuBg} minW="150px">
          <MenuItem
            onClick={() => handleSelect("completed")}
            _hover={{ bg: hoverBg }}
            fontWeight={currentOutcome === "completed" ? "bold" : "normal"}
          >
            <HStack>
              <Check size={16} />
              <Text>Completed</Text>
            </HStack>
          </MenuItem>
          <MenuItem
            onClick={() => handleSelect("skipped")}
            _hover={{ bg: hoverBg }}
            fontWeight={currentOutcome === "skipped" ? "bold" : "normal"}
          >
            <HStack>
              <SkipForward size={16} />
              <Text>Skipped</Text>
            </HStack>
          </MenuItem>
          <MenuItem
            onClick={() => handleSelect("not_done")}
            _hover={{ bg: hoverBg }}
            fontWeight={currentOutcome === "not_done" ? "bold" : "normal"}
          >
            <HStack>
              <X size={16} />
              <Text>Not Done</Text>
            </HStack>
          </MenuItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
};
