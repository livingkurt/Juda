"use client";

import { Menu, MenuItem, IconButton, HStack, Text } from "@chakra-ui/react";
import { Check, X, Circle } from "lucide-react";

export const TaskOutcomeMenu = ({ taskId, date, currentOutcome, onSelectOutcome, size = "sm" }) => {
  const menuBg = { _light: "white", _dark: "gray.700" };
  const hoverBg = { _light: "gray.100", _dark: "gray.600" };

  // Determine current icon and color
  const getButtonProps = () => {
    switch (currentOutcome) {
      case "completed":
        return { icon: <Check size={16} />, colorScheme: "green", variant: "solid" };
      case "not_completed":
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
            onClick={() => handleSelect("not_completed")}
            _hover={{ bg: hoverBg }}
            fontWeight={currentOutcome === "not_completed" ? "bold" : "normal"}
          >
            <HStack>
              <X size={16} />
              <Text>Not Completed</Text>
            </HStack>
          </MenuItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
};
