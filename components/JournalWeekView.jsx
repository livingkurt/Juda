"use client";

import { Box, Stack, Typography, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import dayjs from "dayjs";
import { JournalDayEntry } from "@/components/JournalDayEntry";

// Get the first Friday of the year
const getFirstFridayOfYear = year => {
  const start = dayjs(new Date(year, 0, 1));
  const dayOfWeek = start.day(); // 0=Sunday, 5=Friday
  if (dayOfWeek === 5) {
    return start;
  }
  // Calculate days until next Friday
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  return start.add(daysUntilFriday, "day");
};

// Get all Fridays in a year
const getFridaysForYear = year => {
  const fridays = [];
  let cursor = getFirstFridayOfYear(year);
  while (cursor.year() === year) {
    fridays.push(cursor);
    cursor = cursor.add(1, "week");
  }
  return fridays;
};

export const JournalWeekView = ({
  selectedDate,
  years,
  journalTasks,
  allJournalTasks,
  currentYear,
  getCompletionForDate,
  shouldShowTaskOnDate,
  onSaveEntry,
  onNewJournalEntry,
  filterMenu,
}) => {
  const displayYear = selectedDate.format("YYYY");

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
          {displayYear}
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
            // For other years, check if any Friday has entries
            const fridays = getFridaysForYear(year);
            return fridays.some(friday => {
              const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, friday, year));
              return relevantTasks.length > 0;
            });
          })
          .map(year => {
            const isCurrentYear = year === currentYear;
            const fridays = getFridaysForYear(year);

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
                  {fridays
                    .filter(friday => {
                      // Only show dates <= today
                      const today = dayjs().startOf("day");
                      return !friday.isAfter(today, "day");
                    })
                    .reverse() // Reverse to show most recent weeks first
                    .map(friday => {
                      const dateStr = friday.format("YYYY-MM-DD");
                      // Calculate week number from first Friday of year
                      const firstFriday = getFirstFridayOfYear(year);
                      const weekNumber = friday.diff(firstFriday, "week") + 1;
                      const relevantTasks = journalTasks
                        .filter(task => shouldShowTaskOnDate(task, friday, year))
                        .sort((a, b) => {
                          // Reflection tasks first, then text tasks
                          if (a.completionType === "reflection" && b.completionType !== "reflection") return -1;
                          if (a.completionType !== "reflection" && b.completionType === "reflection") return 1;
                          return 0;
                        });

                      return (
                        <Box
                          key={`${year}-week-${weekNumber}`}
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
                            Week {weekNumber} - {friday.format("MMM D")}
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
                                    viewType="week"
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
