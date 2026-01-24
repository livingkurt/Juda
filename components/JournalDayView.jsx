"use client";

import { Box, Stack, Typography, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { JournalDayEntry } from "@/components/JournalDayEntry";
import { ReflectionEntry } from "@/components/ReflectionEntry";

export const JournalDayView = ({
  selectedDate,
  years,
  journalTasks,
  currentYear,
  getCompletionForDate,
  shouldShowTaskOnDate,
  onSaveEntry,
  onNewJournalEntry,
}) => {
  const displayDate = selectedDate.format("dddd, MMMM D, YYYY");

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 4 } }}>
      {/* Date Heading */}
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
          {displayDate}
        </Typography>
        {onNewJournalEntry && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onNewJournalEntry}
            sx={{ position: "absolute", right: 0 }}
          >
            New Journal Entry
          </Button>
        )}
      </Box>

      {/* Year Sections */}
      <Stack spacing={{ xs: 3, md: 4 }}>
        {years
          .filter(year => {
            // Always show current year
            if (year === currentYear) return true;
            // For other years, only show if they have entries
            const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, selectedDate, year));
            return relevantTasks.length > 0;
          })
          .map(year => {
            const isCurrentYear = year === currentYear;
            const yearDate = selectedDate.year(year);

            const relevantTasks = journalTasks.filter(task => shouldShowTaskOnDate(task, selectedDate, year));

            return (
              <Box key={year}>
                {/* Year Header */}
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

                {/* Journal Entries */}
                {relevantTasks.length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontStyle: "italic",
                      pl: 4,
                    }}
                  >
                    No journal tasks scheduled for this day
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {relevantTasks.map(task => {
                      const dateStr = yearDate.format("YYYY-MM-DD");
                      const completion = getCompletionForDate?.(task.id, dateStr);

                      if (task.completionType === "reflection") {
                        return (
                          <ReflectionEntry
                            key={`${task.id}-${year}-${dateStr}`}
                            task={task}
                            date={dateStr}
                            completion={completion}
                            isCurrentYear={isCurrentYear}
                            onSave={onSaveEntry}
                          />
                        );
                      }

                      return (
                        <JournalDayEntry
                          key={`${task.id}-${year}-${dateStr}`}
                          task={task}
                          date={dateStr}
                          completion={completion}
                          isCurrentYear={isCurrentYear}
                          onSave={onSaveEntry}
                          viewType="day"
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
