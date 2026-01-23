"use client";

import { Box, Stack, Typography, Chip, Button, IconButton } from "@mui/material";
import { Visibility as Eye, VisibilityOff as EyeOff } from "@mui/icons-material";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { Section } from "@/components/Section";

export function TodayView({
  isLoading,
  todayViewDate,
  handleTodayViewDateChange,
  navigateTodayView,
  handleTodayViewToday,
  filteredTodaysTasks,
  todaysTasks,
  todaySearchTerm,
  setTodaySearchTerm,
  todaySelectedTagIds,
  handleTodayTagSelect,
  handleTodayTagDeselect,
  tags,
  createTag,
  showCompletedTasks,
  setShowCompletedTasks,
  createDroppableId,
  createDraggableId,
  todayScrollContainerRef,
  isMobile,
}) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        p: isMobile ? 0 : { xs: 1, md: 2 },
        minWidth: 0,
      }}
    >
      {isLoading ? (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}></Box>
      ) : (
        <>
          {/* Today View Header - Sticky */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: "background.default",
              mb: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
                width: "100%",
                maxWidth: "100%",
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ flexShrink: 0 }}>
                Today
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <Chip
                  label={`${filteredTodaysTasks.length} task${filteredTodaysTasks.length !== 1 ? "s" : ""}${
                    todaySearchTerm && filteredTodaysTasks.length !== todaysTasks.length
                      ? ` of ${todaysTasks.length}`
                      : ""
                  }`}
                  size="small"
                  color="primary"
                />
                {isMobile ? (
                  <IconButton
                    size="small"
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    aria-label={showCompletedTasks ? "Hide Completed" : "Show Completed"}
                    sx={{ minWidth: "24px", height: "24px", p: 0 }}
                  >
                    {showCompletedTasks ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                  </IconButton>
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    sx={{
                      fontSize: "0.875rem",
                      color: "text.secondary",
                      "&:hover": { color: "text.primary" },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: "currentColor",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      {showCompletedTasks ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                      {showCompletedTasks ? "Hide Completed" : "Show Completed"}
                    </Box>
                  </Button>
                )}
              </Box>
            </Box>
            {todayViewDate && (
              <Box sx={{ mb: 2 }}>
                <DateNavigation
                  selectedDate={todayViewDate}
                  onDateChange={handleTodayViewDateChange}
                  onPrevious={() => navigateTodayView(-1)}
                  onNext={() => navigateTodayView(1)}
                  onToday={handleTodayViewToday}
                  showDatePicker={true}
                  showDateDisplay={true}
                />
              </Box>
            )}
            <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, md: 4 }}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ width: "100%", maxWidth: "100%", mb: 2 }}
              >
                <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                </Box>
                <Box sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}>
                  <TagFilter
                    tags={tags}
                    selectedTagIds={todaySelectedTagIds}
                    onTagSelect={handleTodayTagSelect}
                    onTagDeselect={handleTodayTagDeselect}
                    onCreateTag={createTag}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
          {/* Scrollable Sections Container */}
          <Box
            ref={todayScrollContainerRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              width: "100%",
              maxWidth: "100%",
              overflowX: "hidden",
            }}
          >
            <Section createDroppableId={createDroppableId} createDraggableId={createDraggableId} />
          </Box>
        </>
      )}
    </Box>
  );
}
