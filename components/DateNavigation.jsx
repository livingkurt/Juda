"use client";

import { memo, useMemo } from "react";
import { Box, Button, IconButton, Typography, Stack, TextField, Select, MenuItem, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

export const DateNavigation = memo(function DateNavigation({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  showDatePicker = true,
  showDateDisplay = true,
  // View selector props
  showViewSelector = false,
  viewCollection = null,
  selectedView = null,
  onViewChange = null,
  viewSelectorWidth = "150px",
  // Comparison mode: "day" (default), "month", or "year"
  compareMode = "day",
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const useTwoRowLayout = isMobile;
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  // Normalize selectedDate to midnight for accurate comparison
  const normalizedSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    const value = new Date(selectedDate);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [selectedDate]);

  // Determine if we're in current period based on compareMode
  const isCurrentPeriod = useMemo(() => {
    if (!normalizedSelectedDate) return false;

    if (compareMode === "month") {
      return (
        normalizedSelectedDate.getFullYear() === today.getFullYear() &&
        normalizedSelectedDate.getMonth() === today.getMonth()
      );
    }

    if (compareMode === "year") {
      return normalizedSelectedDate.getFullYear() === today.getFullYear();
    }

    // Default: compare by day
    return normalizedSelectedDate.toDateString() === today.toDateString();
  }, [normalizedSelectedDate, today, compareMode]);

  const isToday = normalizedSelectedDate && normalizedSelectedDate.toDateString() === today.toDateString();

  // Determine if past/future based on compareMode
  const isPast = useMemo(() => {
    if (!normalizedSelectedDate) return false;

    if (compareMode === "month") {
      const selectedYear = normalizedSelectedDate.getFullYear();
      const selectedMonth = normalizedSelectedDate.getMonth();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();

      if (selectedYear < todayYear) return true;
      if (selectedYear === todayYear && selectedMonth < todayMonth) return true;
      return false;
    }

    if (compareMode === "year") {
      return normalizedSelectedDate.getFullYear() < today.getFullYear();
    }

    // Default: compare by day
    return normalizedSelectedDate < today;
  }, [normalizedSelectedDate, today, compareMode]);

  const isFuture = useMemo(() => {
    if (!normalizedSelectedDate) return false;

    if (compareMode === "month") {
      const selectedYear = normalizedSelectedDate.getFullYear();
      const selectedMonth = normalizedSelectedDate.getMonth();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();

      if (selectedYear > todayYear) return true;
      if (selectedYear === todayYear && selectedMonth > todayMonth) return true;
      return false;
    }

    if (compareMode === "year") {
      return normalizedSelectedDate.getFullYear() > today.getFullYear();
    }

    // Default: compare by day
    return normalizedSelectedDate > today;
  }, [normalizedSelectedDate, today, compareMode]);

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
      // Parse as UTC to match URL parsing (prevents timezone shift)
      const newDate = new Date(`${value}T00:00:00Z`);
      onDateChange(newDate);
    }
  };

  const containerSx = {
    p: { xs: 1.5, md: 2 },
    borderRadius: 2,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: isCurrentPeriod ? "divider" : isPast ? "warning.main" : isFuture ? "info.main" : "divider",
    transition: "all 0.2s",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  };

  if (useTwoRowLayout) {
    return (
      <Box sx={containerSx}>
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          {/* First Row: Navigation Controls + Date Display + View Selector */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={{ xs: 1, md: 2 }}
            sx={{ width: "100%", flexWrap: { xs: "wrap", md: "nowrap" }, gap: { xs: 1, md: 0 } }}
          >
            {/* Left: Navigation Controls + Date Display */}
            <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, md: 1 }} sx={{ flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={onToday}
                sx={{
                  flexShrink: 0,
                  minWidth: { xs: "60px", md: "auto" },
                  px: { xs: 1.5, md: 2 },
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                }}
              >
                Today
              </Button>
              <IconButton
                onClick={onPrevious}
                aria-label="Previous"
                size="small"
                sx={{
                  flexShrink: 0,
                  width: { xs: "36px", md: "32px" },
                  height: { xs: "36px", md: "32px" },
                }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
              <IconButton
                onClick={onNext}
                aria-label="Next"
                size="small"
                sx={{
                  flexShrink: 0,
                  width: { xs: "36px", md: "32px" },
                  height: { xs: "36px", md: "32px" },
                }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Stack>
            {/* Date Display on same line */}
            {showDateDisplay && (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: "0.875rem", md: "1rem" },
                  color: isToday ? "text.primary" : isPast ? "warning.dark" : "info.dark",
                  whiteSpace: "nowrap",
                  ml: { xs: 0.5, md: 1 },
                }}
              >
                {formatDateDisplay(selectedDate)}
              </Typography>
            )}

            {/* Right: View Selector */}
          </Stack>

          {/* Second Row: Centered Date Picker */}
          <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {showDatePicker && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: showViewSelector && viewCollection && onViewChange ? "space-between" : "center",
                }}
              >
                <TextField
                  type="date"
                  value={formatDateInput(selectedDate)}
                  onChange={handleDateInputChange}
                  size="small"
                  variant="outlined"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    maxWidth: { xs: "200px", md: "none" },
                    minWidth: { xs: "160px", md: "150px" },
                    "& input": {
                      textAlign: "center",
                      fontSize: { xs: "0.875rem", md: "1rem" },
                      py: { xs: 1.25, md: 0.75 },
                    },
                    "& .MuiOutlinedInput-root": {
                      cursor: "pointer",
                    },
                  }}
                  InputProps={{
                    sx: {
                      "&::-webkit-calendar-picker-indicator": {
                        cursor: "pointer",
                        padding: { xs: "4px", md: "2px" },
                      },
                    },
                  }}
                />
              </Box>
            )}
            {showViewSelector && viewCollection && onViewChange && (
              <Box sx={{ flexShrink: 0 }}>
                <Select
                  value={selectedView || (viewCollection.length > 0 ? viewCollection[0].value : "")}
                  onChange={e => onViewChange(e.target.value)}
                  sx={{
                    width: { xs: "100px", md: viewSelectorWidth },
                    fontSize: { xs: "0.875rem", md: "1rem" },
                    height: "42px",
                    "& .MuiSelect-select": {
                      py: { xs: 1, md: 0.75 },
                    },
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
          </Box>
        </Stack>
      </Box>
    );
  }

  // Desktop: Single row layout with date picker centered
  return (
    <Box sx={containerSx}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* Left: Navigation Controls + Date Display */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onToday}
            sx={{
              flexShrink: 0,
              px: 2,
              fontSize: "0.875rem",
            }}
          >
            Today
          </Button>
          <IconButton
            onClick={onPrevious}
            aria-label="Previous"
            size="small"
            sx={{
              flexShrink: 0,
              width: "32px",
              height: "32px",
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton
            onClick={onNext}
            aria-label="Next"
            size="small"
            sx={{
              flexShrink: 0,
              width: "32px",
              height: "32px",
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
          {/* Date Display on same line */}
          {showDateDisplay && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                fontSize: "0.875rem",
                color: isToday ? "text.primary" : isPast ? "warning.dark" : "info.dark",
                whiteSpace: "nowrap",
                ml: 1,
              }}
            >
              {formatDateDisplay(selectedDate)}
            </Typography>
          )}
        </Stack>

        {/* Center: Date Picker */}
        {showDatePicker && (
          <>
            {showViewSelector && viewCollection && onViewChange ? (
              <>
                <Box sx={{ flex: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
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
                        fontSize: "1rem",
                        py: 0.75,
                      },
                      "& .MuiOutlinedInput-root": {
                        cursor: "pointer",
                      },
                    }}
                    InputProps={{
                      sx: {
                        "&::-webkit-calendar-picker-indicator": {
                          cursor: "pointer",
                          padding: "2px",
                        },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }} />
              </>
            ) : (
              <>
                <Box sx={{ flex: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
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
                        fontSize: "1rem",
                        py: 0.75,
                      },
                      "& .MuiOutlinedInput-root": {
                        cursor: "pointer",
                      },
                    }}
                    InputProps={{
                      sx: {
                        "&::-webkit-calendar-picker-indicator": {
                          cursor: "pointer",
                          padding: "2px",
                        },
                      },
                    }}
                  />
                </Box>
              </>
            )}
          </>
        )}

        {/* Right: View Selector */}
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
                fontSize: "0.875rem",
                "& .MuiSelect-select": {
                  py: 0.75,
                },
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
