"use client";

import { Menu, ActionIcon, Group, Text } from "@mantine/core";
import { Check, X, Circle } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const TaskOutcomeMenu = ({ taskId, date, currentOutcome, onSelectOutcome, size = "sm" }) => {
  const { mode } = useSemanticColors();
  const menuBg = mode.bg.surface;
  const hoverBg = mode.bg.surfaceHover;

  // Determine current icon and color
  const getButtonProps = () => {
    switch (currentOutcome) {
      case "completed":
        return { icon: <Check size={16} />, color: "green", variant: "filled" };
      case "not_completed":
        return { icon: <X size={16} />, color: "red", variant: "outline" };
      default:
        return { icon: <Circle size={16} />, color: "gray", variant: "subtle" };
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
    <Menu>
      <Menu.Target>
        <ActionIcon
          size={size}
          color={buttonProps.color}
          variant={buttonProps.variant}
          aria-label="Set task outcome"
          radius="xl"
        >
          {buttonProps.icon}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown bg={menuBg} style={{ minWidth: "150px" }}>
        <Menu.Item
          onClick={() => handleSelect("completed")}
          style={{
            backgroundColor: currentOutcome === "completed" ? hoverBg : "transparent",
            fontWeight: currentOutcome === "completed" ? "bold" : "normal",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = hoverBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = currentOutcome === "completed" ? hoverBg : "transparent";
          }}
        >
          <Group gap={8}>
            <Check size={16} />
            <Text>Completed</Text>
          </Group>
        </Menu.Item>
        <Menu.Item
          onClick={() => handleSelect("not_completed")}
          style={{
            backgroundColor: currentOutcome === "not_completed" ? hoverBg : "transparent",
            fontWeight: currentOutcome === "not_completed" ? "bold" : "normal",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = hoverBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = currentOutcome === "not_completed" ? hoverBg : "transparent";
          }}
        >
          <Group gap={8}>
            <X size={16} />
            <Text>Not Completed</Text>
          </Group>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
