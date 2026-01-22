"use client";

import { Box, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { JournalDayEntry } from "@/components/JournalDayEntry";

export const JournalYearView = ({
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
            // For other years, only show if Jan 1st has entries
            const jan1 = dayjs(new Date(year, 0, 1));
            const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, jan1, year));
            return relevantTasks.length > 0;
          })
          .map(year => {
            const isCurrentYear = year === currentYear;
            const jan1 = dayjs(new Date(year, 0, 1));
            const dateStr = jan1.format("YYYY-MM-DD");
            const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, jan1, year));

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

                {relevantTasks.length === 0 ? (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", pl: 1 }}>
                    No journal entries for January 1st
                  </Typography>
                ) : (
                  <Stack spacing={2}>
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
                          viewType="year"
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
};
