"use client";

import { useState } from "react";
import { Menu, MenuItem, IconButton, Stack, Typography } from "@mui/material";
import { Check, Close, RadioButtonUnchecked } from "@mui/icons-material";

export const TaskOutcomeMenu = ({ taskId, date, currentOutcome, onSelectOutcome, size = "sm" }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Determine current icon and color
  const getButtonProps = () => {
    switch (currentOutcome) {
      case "completed":
        return { icon: <Check fontSize="small" />, color: "success", variant: "contained" };
      case "not_completed":
        return { icon: <Close fontSize="small" />, color: "error", variant: "outlined" };
      default:
        return { icon: <RadioButtonUnchecked fontSize="small" />, color: "default", variant: "text" };
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
    setAnchorEl(null);
  };

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        color={buttonProps.color}
        variant={buttonProps.variant}
        size={size}
        aria-label="Set task outcome"
        sx={{
          borderRadius: "50%",
        }}
      >
        {buttonProps.icon}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <MenuItem
          onClick={() => handleSelect("completed")}
          sx={{
            "&:hover": {
              bgcolor: "action.hover",
            },
            fontWeight: currentOutcome === "completed" ? 600 : 400,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Check fontSize="small" />
            <Typography variant="body2">Completed</Typography>
          </Stack>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("not_completed")}
          sx={{
            "&:hover": {
              bgcolor: "action.hover",
            },
            fontWeight: currentOutcome === "not_completed" ? 600 : 400,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Close fontSize="small" />
            <Typography variant="body2">Not Completed</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  );
};
