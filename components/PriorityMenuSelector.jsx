"use client";

import { useState } from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Radio } from "@mui/material";
import { Flag, KeyboardArrowDown, KeyboardArrowUp, Remove, PriorityHigh } from "@mui/icons-material";
import { PRIORITY_LEVELS } from "@/lib/constants";
import { usePriorityHandlers } from "@/hooks/usePriorityHandlers";

const iconMap = {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
};

export const PriorityMenuSelector = ({ task, onClose }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { handlePriorityChange } = usePriorityHandlers();

  const handleMenuOpen = event => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = async priority => {
    await handlePriorityChange(task.id, priority);
    handleMenuClose();
    onClose?.();
  };

  return (
    <>
      <MenuItem onClick={handleMenuOpen}>
        <ListItemIcon>
          <Flag fontSize="small" />
        </ListItemIcon>
        <ListItemText>Priority</ListItemText>
      </MenuItem>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onClick={e => e.stopPropagation()}
      >
        {PRIORITY_LEVELS.map(level => {
          const IconComponent = level.icon ? iconMap[level.icon] : null;
          const isSelected = task.priority === level.value;

          return (
            <MenuItem key={level.value ?? "none"} onClick={() => handleSelect(level.value)} selected={isSelected}>
              <ListItemIcon>
                <Radio checked={isSelected} size="small" sx={{ p: 0 }} />
              </ListItemIcon>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {IconComponent ? (
                  <IconComponent fontSize="small" sx={{ color: level.color || "text.secondary" }} />
                ) : (
                  <Flag fontSize="small" sx={{ color: "text.secondary" }} />
                )}
              </ListItemIcon>
              <ListItemText primary={level.label} sx={{ color: level.color || "text.primary" }} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
