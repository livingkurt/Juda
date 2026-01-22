"use client";

import { Chip } from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp, Remove, PriorityHigh } from "@mui/icons-material";
import { getPriorityConfig } from "@/lib/constants";

const iconMap = {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
};

export const PriorityChip = ({ priority, size = "sm", ...props }) => {
  const config = getPriorityConfig(priority);

  if (!config.value) return null;

  const IconComponent = config.icon ? iconMap[config.icon] : null;
  const chipSize = size === "xs" ? "small" : "small";
  const fontSize = size === "xs" ? "0.625rem" : "0.75rem";
  const height = size === "xs" ? 18 : 20;

  return (
    <Chip
      icon={IconComponent ? <IconComponent sx={{ fontSize: "inherit" }} /> : undefined}
      label={config.label}
      size={chipSize}
      sx={{
        bgcolor: config.color,
        color: "white",
        fontWeight: 600,
        height,
        "& .MuiChip-label": {
          fontSize,
          px: size === "xs" ? 0.5 : 0.75,
        },
        "& .MuiChip-icon": {
          color: "inherit",
          ml: 0.5,
          mr: -0.5,
        },
      }}
      {...props}
    />
  );
};
