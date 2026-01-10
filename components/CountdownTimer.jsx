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
  const hasPlayedSoundRef = useRef(false);

  // Play completion sound using Web Audio API
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const duration = 0.3;
      const sampleRate = audioContext.sampleRate;
      const numSamples = duration * sampleRate;
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Create a pleasant chime sound (two-tone ascending)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // First tone: 523.25 Hz (C5)
        const tone1 = Math.sin(2 * Math.PI * 523.25 * t);
        // Second tone: 659.25 Hz (E5) - starts after 0.1s
        const tone2 = t > 0.1 ? Math.sin(2 * Math.PI * 659.25 * (t - 0.1)) : 0;
        // Third tone: 783.99 Hz (G5) - starts after 0.2s
        const tone3 = t > 0.2 ? Math.sin(2 * Math.PI * 783.99 * (t - 0.2)) : 0;

        // Combine tones with envelope (fade out)
        const envelope = Math.max(0, 1 - t / duration);
        data[i] = (tone1 * 0.3 + tone2 * 0.3 + tone3 * 0.4) * envelope * 0.3;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      // Fallback: use a simple beep if Web Audio API fails
      console.warn("Could not play completion sound:", err);
    }
  };

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
    hasPlayedSoundRef.current = false;
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
            // Play completion sound (only once per completion)
            if (!hasPlayedSoundRef.current) {
              playCompletionSound();
              hasPlayedSoundRef.current = true;
            }
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

  // Reset sound flag when timer is reset or starts running again
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      hasPlayedSoundRef.current = false;
    }
  }, [isRunning, timeRemaining]);

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
