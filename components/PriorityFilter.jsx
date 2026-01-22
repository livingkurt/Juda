"use client";

import { useState } from "react";
import { Button, Menu, MenuItem, Checkbox, Chip } from "@mui/material";
import { Flag, KeyboardArrowDown, KeyboardArrowUp, Remove, PriorityHigh } from "@mui/icons-material";
import { PRIORITY_LEVELS } from "@/lib/constants";

const iconMap = {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
};

export const PriorityFilter = ({ selectedPriorities = [], onPrioritySelect, onPriorityDeselect }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const isOpen = Boolean(anchorEl);

  const handleToggle = priority => {
    if (selectedPriorities.includes(priority)) {
      onPriorityDeselect(priority);
    } else {
      onPrioritySelect(priority);
    }
  };

  const filterablePriorities = PRIORITY_LEVELS.filter(level => level.value !== null);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Flag />}
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{
          borderColor: selectedPriorities.length > 0 ? "primary.main" : "divider",
        }}
      >
        Priority
        {selectedPriorities.length > 0 && (
          <Chip label={selectedPriorities.length} size="small" sx={{ ml: 1, height: 18, minWidth: 18 }} />
        )}
      </Button>
      <Menu anchorEl={anchorEl} open={isOpen} onClose={() => setAnchorEl(null)}>
        {filterablePriorities.map(level => {
          const IconComponent = level.icon ? iconMap[level.icon] : Flag;
          const isSelected = selectedPriorities.includes(level.value);

          return (
            <MenuItem key={level.value} onClick={() => handleToggle(level.value)}>
              <Checkbox checked={isSelected} size="small" />
              <IconComponent fontSize="small" sx={{ color: level.color, mx: 1 }} />
              {level.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
