"use client";

import { memo } from "react";
import { Box, Button, IconButton, Typography, Stack, TextField, Chip, Select, MenuItem } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

export const DateNavigation = memo(function DateNavigation({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  title,
  showDatePicker = true,
  showDateDisplay = true,
  twoRowLayout = false,
  // View selector props
  showViewSelector = false,
  viewCollection = null,
  selectedView = null,
  onViewChange = null,
  viewSelectorWidth = "150px",
}) {
  const theme = useTheme();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize selectedDate to midnight for accurate comparison
  const normalizedSelectedDate = selectedDate ? new Date(selectedDate) : null;
  if (normalizedSelectedDate) {
    normalizedSelectedDate.setHours(0, 0, 0, 0);
  }

  const isToday = normalizedSelectedDate && normalizedSelectedDate.toDateString() === today.toDateString();
  const isPast = normalizedSelectedDate && normalizedSelectedDate < today;
  const isFuture = normalizedSelectedDate && normalizedSelectedDate > today;

  const formatDateDisplay = date => {
    if (!date) return "";
    const isTodayDate = date.toDateString() === today.toDateString();
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
    if (isTodayDate) {
      return `Today, ${formattedDate}`;
    }
    return formattedDate;
  };

  const formatDateInput = date => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateInputChange = e => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(0, 0, 0, 0);
      onDateChange(newDate);
    }
  };

  const containerSx = {
    p: { xs: 1, md: 2 },
    borderRadius: 2,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: isToday ? "divider" : isPast ? "warning.main" : isFuture ? "info.main" : "divider",
    transition: "all 0.2s",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  };

  if (twoRowLayout) {
    return (
      <Box sx={containerSx}>
        <Stack spacing={2}>
          {/* First Row: Navigation Controls + View Selector */}
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, md: 2 }} sx={{ width: "100%" }}>
            <Button variant="outlined" size="small" onClick={onToday} sx={{ flexShrink: 0 }}>
              Today
            </Button>
            <IconButton onClick={onPrevious} aria-label="Previous" size="small" sx={{ flexShrink: 0 }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
            <IconButton onClick={onNext} aria-label="Next" size="small" sx={{ flexShrink: 0 }}>
              <ChevronRight fontSize="small" />
            </IconButton>
            {/* Spacer */}
            <Box sx={{ flex: 1 }} />
            {/* View Selector on the right */}
            {showViewSelector && viewCollection && onViewChange && (
              <Box sx={{ flexShrink: 0 }}>
                <Select
                  value={selectedView || (viewCollection.length > 0 ? viewCollection[0].value : "")}
                  onChange={e => onViewChange(e.target.value)}
                  style={{
                    width: viewSelectorWidth,
                    padding: "4px 8px",
                    fontSize: "0.875rem",
                    borderRadius: "4px",
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                  }}
                >
                  {viewCollection.map(view => (
                    <MenuItem key={view.value} value={view.value}>
                      {view.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </Stack>

          {/* Second Row: Centered Date Picker */}
          {showDatePicker && (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <TextField
                type="date"
                value={formatDateInput(selectedDate)}
                onChange={handleDateInputChange}
                size="small"
                variant="outlined"
                sx={{
                  width: "auto",
                  minWidth: "150px",
                  "& input": {
                    textAlign: "center",
                  },
                  "& .MuiOutlinedInput-root": {
                    cursor: "pointer",
                  },
                }}
                InputProps={{
                  sx: {
                    "&::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                    },
                  },
                }}
              />
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 1.5, md: 2 }}
        sx={{ width: "100%", maxWidth: "100%", flexWrap: { xs: "wrap", md: "nowrap" } }}
      >
        <Button variant="outlined" size="small" onClick={onToday} sx={{ flexShrink: 0 }}>
          Today
        </Button>
        <IconButton onClick={onPrevious} aria-label="Previous" size="small" sx={{ flexShrink: 0 }}>
          <ChevronLeft fontSize="small" />
        </IconButton>
        <IconButton onClick={onNext} aria-label="Next" size="small" sx={{ flexShrink: 0 }}>
          <ChevronRight fontSize="small" />
        </IconButton>
        {/* Spacer to center date picker */}
        {showDatePicker && <Box sx={{ flex: 1 }} />}
        {showDatePicker && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <TextField
              type="date"
              value={formatDateInput(selectedDate)}
              onChange={handleDateInputChange}
              size="small"
              variant="outlined"
              sx={{
                width: "auto",
                minWidth: "150px",
                "& input": {
                  textAlign: "center",
                },
                "& .MuiOutlinedInput-root": {
                  cursor: "pointer",
                },
              }}
              InputProps={{
                sx: {
                  "&::-webkit-calendar-picker-indicator": {
                    cursor: "pointer",
                  },
                },
              }}
            />
          </Box>
        )}
        {/* Spacer to balance centering */}
        {showDatePicker && <Box sx={{ flex: 1 }} />}
        {title && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              minWidth: "120px",
              display: { xs: "none", md: "block" },
            }}
          >
            {title}
          </Typography>
        )}
        {/* Date Display on the far right */}
        {showDateDisplay && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: { xs: 0, md: "120px" }, flexShrink: 0 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: isToday ? "text.primary" : isPast ? "warning.dark" : "info.dark",
              }}
            >
              {formatDateDisplay(selectedDate)}
            </Typography>
            {isPast && (
              <Chip
                label="Past Date"
                size="small"
                color="warning"
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  height: "20px",
                  fontSize: "0.625rem",
                  "& .MuiChip-label": {
                    px: 1,
                    py: 0,
                  },
                }}
              />
            )}
            {isFuture && (
              <Chip
                label="Future Date"
                size="small"
                color="info"
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  height: "20px",
                  fontSize: "0.625rem",
                  "& .MuiChip-label": {
                    px: 1,
                    py: 0,
                  },
                }}
              />
            )}
          </Stack>
        )}
        {/* View Selector on the far right (after date display) */}
        {showViewSelector && viewCollection && onViewChange && (
          <Box sx={{ flexShrink: 0 }}>
            <Select
              value={selectedView || (viewCollection.length > 0 ? viewCollection[0].value : "")}
              onChange={e => onViewChange(e.target.value)}
              size="small"
              variant="outlined"
              sx={{
                width: viewSelectorWidth,
                minWidth: "150px",
              }}
            >
              {viewCollection.map(view => (
                <MenuItem key={view.value} value={view.value}>
                  {view.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
      </Stack>
    </Box>
  );
});
