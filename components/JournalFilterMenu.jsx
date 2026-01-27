"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Box, Stack, Menu, MenuItem, IconButton, Checkbox, Chip, Typography, Divider } from "@mui/material";
import { FilterList, TextFields, List, Psychology } from "@mui/icons-material";

const COMPLETION_TYPES = [
  { value: "text", label: "Text", icon: TextFields },
  { value: "selection", label: "Selection", icon: List },
  { value: "reflection", label: "Reflection", icon: Psychology },
];

export const JournalFilterMenu = ({
  journalTasks = [],
  selectedCompletionTypes = [],
  onCompletionTypeSelect,
  onCompletionTypeDeselect,
  selectedTaskIds = [],
  onTaskSelect,
  onTaskDeselect,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const isOpen = Boolean(anchorEl);

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCompletionTypeToggle = type => {
    if (selectedCompletionTypes.includes(type)) {
      onCompletionTypeDeselect(type);
    } else {
      onCompletionTypeSelect(type);
    }
  };

  const handleTaskToggle = taskId => {
    if (selectedTaskIds.includes(taskId)) {
      onTaskDeselect(taskId);
    } else {
      onTaskSelect(taskId);
    }
  };

  const handleClearAllCompletionTypes = () => {
    selectedCompletionTypes.forEach(type => onCompletionTypeDeselect(type));
  };

  const handleClearAllTasks = () => {
    selectedTaskIds.forEach(id => onTaskDeselect(id));
  };

  // Group tasks by completion type for display
  const tasksByType = useMemo(() => {
    const grouped = {
      text: [],
      selection: [],
      reflection: [],
    };
    journalTasks.forEach(task => {
      if (grouped[task.completionType]) {
        grouped[task.completionType].push(task);
      }
    });
    return grouped;
  }, [journalTasks]);

  const selectedTasks = journalTasks.filter(t => selectedTaskIds.includes(t.id));

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: "text.secondary",
          "&:hover": { color: "text.primary" },
        }}
      >
        <FilterList />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            maxHeight: "80vh",
            minWidth: "280px",
            maxWidth: "320px",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Completion Types Section */}
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              color: "text.secondary",
              fontWeight: 600,
              display: "block",
              mb: 1,
            }}
          >
            Entry Types
          </Typography>

          {COMPLETION_TYPES.map(type => {
            const IconComponent = type.icon;
            const isSelected = selectedCompletionTypes.includes(type.value);
            const count = tasksByType[type.value]?.length || 0;

            return (
              <MenuItem
                key={type.value}
                onClick={() => handleCompletionTypeToggle(type.value)}
                sx={{
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Checkbox checked={isSelected} size="small" />
                <IconComponent fontSize="small" sx={{ mx: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {type.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                  ({count})
                </Typography>
              </MenuItem>
            );
          })}

          {/* Selected completion types display */}
          {selectedCompletionTypes.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                {selectedCompletionTypes.map(type => {
                  const typeInfo = COMPLETION_TYPES.find(t => t.value === type);
                  if (!typeInfo) return null;
                  const IconComponent = typeInfo.icon;
                  return (
                    <Chip
                      key={type}
                      icon={<IconComponent fontSize="small" />}
                      label={typeInfo.label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        "& .MuiChip-deleteIcon": {
                          fontSize: "0.875rem",
                        },
                      }}
                      onDelete={() => onCompletionTypeDeselect(type)}
                    />
                  );
                })}
              </Stack>
              <Typography
                component="button"
                onClick={handleClearAllCompletionTypes}
                variant="caption"
                sx={{
                  mt: 0.5,
                  fontSize: "0.7rem",
                  minWidth: "auto",
                  px: 1,
                  border: "none",
                  background: "none",
                  color: "primary.main",
                  cursor: "pointer",
                  textAlign: "left",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Clear all types
              </Typography>
            </Box>
          )}

          {/* Journal Tasks Section */}
          {journalTasks.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                  mb: 1,
                }}
              >
                Journal Entries
              </Typography>

              {/* Group tasks by type for better organization */}
              {COMPLETION_TYPES.map(type => {
                const tasksOfType = tasksByType[type.value] || [];
                if (tasksOfType.length === 0) return null;

                return (
                  <Box key={type.value} sx={{ mb: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        color: "text.secondary",
                        fontWeight: 500,
                        display: "block",
                        fontSize: "0.7rem",
                      }}
                    >
                      {type.label}
                    </Typography>
                    {tasksOfType.map(task => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      return (
                        <MenuItem
                          key={task.id}
                          onClick={() => handleTaskToggle(task.id)}
                          sx={{
                            pl: 3,
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Checkbox checked={isSelected} size="small" />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {task.title || "Untitled"}
                          </Typography>
                        </MenuItem>
                      );
                    })}
                  </Box>
                );
              })}

              {/* Selected tasks display */}
              {selectedTasks.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {selectedTasks.map(task => (
                      <Chip
                        key={task.id}
                        label={task.title || "Untitled"}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          "& .MuiChip-deleteIcon": {
                            fontSize: "0.875rem",
                          },
                        }}
                        onDelete={() => onTaskDeselect(task.id)}
                      />
                    ))}
                  </Stack>
                  <Typography
                    component="button"
                    onClick={handleClearAllTasks}
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      fontSize: "0.7rem",
                      minWidth: "auto",
                      px: 1,
                      border: "none",
                      background: "none",
                      color: "primary.main",
                      cursor: "pointer",
                      textAlign: "left",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Clear all entries
                  </Typography>
                </Box>
              )}
            </>
          )}

          {journalTasks.length === 0 && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary", textAlign: "center" }}>
              No journal entries yet
            </Typography>
          )}
        </Box>
      </Menu>
    </>
  );
};
