"use client";

import { Box, Stack, Typography, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import dayjs from "dayjs";
import { JournalDayEntry } from "@/components/JournalDayEntry";

export const JournalMonthView = ({
  selectedDate,
  years,
  journalTasks,
  currentYear,
  getCompletionForDate,
  shouldShowTaskOnDate,
  onSaveEntry,
  onNewJournalEntry,
  filterMenu,
}) => {
  const monthLabel = selectedDate.format("MMMM YYYY");

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: { xs: 3, md: 4 },
          position: "relative",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
          }}
        >
          {monthLabel}
        </Typography>
        {(onNewJournalEntry || filterMenu) && (
          <Box sx={{ position: "absolute", right: 0, display: "flex", alignItems: "center", gap: 1 }}>
            {filterMenu}
            {onNewJournalEntry && (
              <Button variant="contained" startIcon={<Add />} onClick={onNewJournalEntry}>
                New Journal Entry
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Stack spacing={{ xs: 3, md: 4 }}>
        {years
          .filter(year => {
            // Always show current year
            if (year === currentYear) return true;
            // For other years, check if any 1st of month has entries
            return Array.from({ length: 12 }, (_, monthIndex) => {
              const firstOfMonth = dayjs(new Date(year, monthIndex, 1));
              const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, firstOfMonth, year));
              return relevantTasks.length > 0;
            }).some(hasEntries => hasEntries);
          })
          .reverse() // Reverse to show most recent years first
          .map(year => {
            const isCurrentYear = year === currentYear;

            return (
              <Box key={year}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 500,
                    color: isCurrentYear ? "text.primary" : "text.secondary",
                  }}
                >
                  {year}
                </Typography>

                <Stack spacing={2}>
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const firstOfMonth = dayjs(new Date(year, monthIndex, 1));
                    const today = dayjs().startOf("day");
                    // Only show months <= today
                    if (firstOfMonth.isAfter(today, "day")) {
                      return null;
                    }
                    return { firstOfMonth, monthIndex };
                  })
                    .filter(Boolean)
                    .reverse() // Reverse to show most recent months first
                    .map(({ firstOfMonth, monthIndex }) => {
                      const dateStr = firstOfMonth.format("YYYY-MM-DD");
                      const relevantTasks = journalTasks
                        .filter(task => shouldShowTaskOnDate(task, firstOfMonth, year))
                        .sort((a, b) => {
                          // Reflection tasks first, then text tasks
                          if (a.completionType === "reflection" && b.completionType !== "reflection") return -1;
                          if (a.completionType !== "reflection" && b.completionType === "reflection") return 1;
                          return 0;
                        });

                      return (
                        <Box
                          key={`${year}-${monthIndex}`}
                          sx={{
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            p: 2,
                            minHeight: 120,
                            bgcolor: "background.paper",
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            {firstOfMonth.format("MMMM")}
                          </Typography>

                          {relevantTasks.length === 0 ? (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                              No journal entries
                            </Typography>
                          ) : (
                            <Stack spacing={1.5}>
                              {relevantTasks.map(task => {
                                const completion = getCompletionForDate?.(task.id, dateStr);
                                return (
                                  <JournalDayEntry
                                    key={`${task.id}-${year}-${dateStr}`}
                                    task={task}
                                    date={dateStr}
                                    completion={completion}
                                    isCurrentYear={isCurrentYear}
                                    onSave={onSaveEntry}
                                    viewType="month"
                                  />
                                );
                              })}
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                </Stack>
              </Box>
            );
          })}
      </Stack>
    </Box>
  );
};
