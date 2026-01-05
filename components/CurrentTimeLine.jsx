"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";

export const CurrentTimeLine = ({ hourHeight = 60, startHour = 0 }) => {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.hour();
  const currentMinute = now.minute();
  const topPosition = (currentHour - startHour) * hourHeight + (currentMinute / 60) * hourHeight;

  // Don't render if outside visible hours
  if (currentHour < startHour || currentHour > 23) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: topPosition,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Circle indicator */}
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: "error.main",
            ml: -0.5,
          }}
        />
        {/* Line */}
        <Box
          sx={{
            flex: 1,
            height: 2,
            bgcolor: "error.main",
          }}
        />
        {/* Time label */}
        <Typography
          sx={{
            position: "absolute",
            left: -50,
            fontSize: "0.65rem",
            color: "error.main",
            fontWeight: 600,
          }}
        >
          {now.format("h:mm")}
        </Typography>
      </Box>
    </Box>
  );
};

export default CurrentTimeLine;
