"use client";

import { Box, Stack, Typography } from "@mui/material";
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
  currentYear,
  getCompletionForDate,
  shouldShowTaskOnDate,
  onSaveEntry,
}) => {
  const displayYear = selectedDate.format("YYYY");

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 4 } }}>
      <Typography
        variant="h4"
        sx={{
          textAlign: "center",
          mb: { xs: 3, md: 4 },
          fontWeight: 500,
        }}
      >
        {displayYear}
      </Typography>

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

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  {fridays
                    .filter(friday => {
                      // Only show dates <= today
                      const today = dayjs().startOf("day");
                      return !friday.isAfter(today, "day");
                    })
                    .map((friday, index) => {
                      const dateStr = friday.format("YYYY-MM-DD");
                      const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, friday, year));

                      return (
                        <Box
                          key={`${year}-week-${index}`}
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
                            Week {index + 1} - {friday.format("MMM D")}
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
                </Box>
              </Box>
            );
          })}
      </Stack>
    </Box>
  );
};
