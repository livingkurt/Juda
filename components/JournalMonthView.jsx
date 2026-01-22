"use client";

import { Box, Stack, Typography } from "@mui/material";
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
}) => {
  const monthLabel = selectedDate.format("MMMM YYYY");

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
        {monthLabel}
      </Typography>

      <Stack spacing={{ xs: 3, md: 4 }}>
        {years.map(year => {
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

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const firstOfMonth = dayjs(new Date(year, monthIndex, 1));
                  const dateStr = firstOfMonth.format("YYYY-MM-DD");
                  const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, firstOfMonth, year));

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
