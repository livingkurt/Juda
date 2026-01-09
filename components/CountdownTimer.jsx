"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Stack, Typography, IconButton, Paper } from "@mui/material";
import { PlayArrow, Pause, Refresh } from "@mui/icons-material";

/**
 * CountdownTimer - A countdown timer for time-based exercises
 *
 * @param {number} targetSeconds - Target time in seconds
 * @param {Function} onComplete - Callback when timer reaches 0
 * @param {boolean} isCompleted - Whether the set is already completed
 */
export default function CountdownTimer({ targetSeconds, onComplete, isCompleted }) {
  // Track elapsed time instead of remaining time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  // Derive remaining time from target and elapsed
  const timeRemaining = Math.max(0, targetSeconds - elapsedSeconds);

  // Format seconds to MM:SS
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Start/Resume timer
  const handleStart = () => {
    setIsRunning(true);
  };

  // Pause timer
  const handlePause = () => {
    setIsRunning(false);
  };

  // Reset timer
  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  // Countdown effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newElapsed = prev + 1;
          const newRemaining = targetSeconds - newElapsed;

          if (newRemaining <= 0) {
            setIsRunning(false);
            // Call onComplete when timer reaches 0
            if (onComplete) {
              onComplete();
            }
            return targetSeconds; // Set elapsed to target (remaining = 0)
          }
          return newElapsed;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, targetSeconds, onComplete]);

  // Calculate progress percentage
  const progress = ((targetSeconds - timeRemaining) / targetSeconds) * 100;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: "background.paper",
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      <Stack spacing={1} alignItems="center">
        {/* Timer Display */}
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            fontFamily: "monospace",
            color: timeRemaining === 0 ? "success.main" : "text.primary",
          }}
        >
          {formatTime(timeRemaining)}
        </Typography>

        {/* Progress Bar */}
        <Box
          sx={{
            width: "100%",
            height: 6,
            bgcolor: "action.hover",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: "100%",
              bgcolor: timeRemaining === 0 ? "success.main" : "primary.main",
              transition: "width 0.3s linear",
            }}
          />
        </Box>

        {/* Controls */}
        <Stack direction="row" spacing={1}>
          {!isRunning ? (
            <IconButton
              onClick={handleStart}
              disabled={timeRemaining === 0 || isCompleted}
              color="primary"
              size="small"
            >
              <PlayArrow />
            </IconButton>
          ) : (
            <IconButton onClick={handlePause} color="warning" size="small">
              <Pause />
            </IconButton>
          )}
          <IconButton onClick={handleReset} disabled={isCompleted} size="small">
            <Refresh />
          </IconButton>
        </Stack>

        {timeRemaining === 0 && !isCompleted && (
          <Typography variant="caption" color="success.main" fontWeight={600}>
            Time&apos;s up! ✓
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
