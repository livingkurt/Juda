"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Stack, Typography, IconButton, Paper, Tooltip, Alert } from "@mui/material";
import { PlayArrow, Pause, Refresh, LightMode, Warning } from "@mui/icons-material";

/**
 * CountdownTimer - A countdown timer for time-based exercises
 *
 * Features:
 * - Wake Lock API to keep screen awake (prevents iOS from sleeping)
 * - End time calculation (detects if timer finished while in background)
 * - Page visibility detection (handles app switching/screen lock)
 *
 * @param {number} targetSeconds - Target time in seconds
 * @param {Function} onComplete - Callback when timer reaches 0
 * @param {boolean} isCompleted - Whether the set is already completed
 * @param {boolean} autoStart - Whether to automatically start the timer (for transitions)
 */
export default function CountdownTimer({ targetSeconds, onComplete, isCompleted, autoStart = false }) {
  // Track elapsed time instead of remaining time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState(null); // null = not in prep, 5-0 = prep countdown
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true); // User preference for wake lock
  const [showBackgroundWarning, setShowBackgroundWarning] = useState(false);
  const intervalRef = useRef(null);
  const prepIntervalRef = useRef(null);
  const hasPlayedSoundRef = useRef(false);
  const lastCountdownSecondRef = useRef(null);
  const lastPrepCountdownRef = useRef(null);
  const audioContextRef = useRef(null);
  const hasAutoStartedRef = useRef(false);
  const wakeLockRef = useRef(null);
  const endTimeRef = useRef(null); // Store when timer should complete
  const wasRunningRef = useRef(false); // Track if timer was running before page hide

  // Get or create AudioContext (reused across all sounds)
  const getAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // iOS requires AudioContext to be resumed after user interaction
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Request Wake Lock to keep screen awake
  const requestWakeLock = useCallback(async () => {
    if (!wakeLockEnabled) return;

    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch (err) {
      console.warn("Wake Lock not supported or failed:", err);
    }
  }, [wakeLockEnabled]);

  // Release Wake Lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn("Failed to release Wake Lock:", err);
      }
    }
  }, []);

  // Calculate elapsed time based on end time (for background detection)
  const calculateElapsedFromEndTime = useCallback(() => {
    if (!endTimeRef.current) return elapsedSeconds;

    const now = Date.now();
    const totalElapsed = Math.floor((now - (endTimeRef.current - targetSeconds * 1000)) / 1000);
    return Math.min(totalElapsed, targetSeconds);
  }, [elapsedSeconds, targetSeconds]);

  // Play countdown beep (for 3, 2, 1)
  const playCountdownBeep = useCallback(async () => {
    try {
      const audioContext = await getAudioContext();
      const duration = 0.15;
      const sampleRate = audioContext.sampleRate;
      const numSamples = duration * sampleRate;
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Create a short beep (higher pitch for urgency)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Tone: 600 Hz (higher than start sound)
        const tone = Math.sin(2 * Math.PI * 600 * t);
        // Envelope (fade out)
        const envelope = Math.max(0, 1 - t / duration);
        data[i] = tone * envelope * 0.25;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.warn("Could not play countdown beep:", err);
    }
  }, []);

  // Play "Start" beep (higher tone for start)
  const playStartBeep = useCallback(async () => {
    try {
      const audioContext = await getAudioContext();
      const duration = 0.2;
      const sampleRate = audioContext.sampleRate;
      const numSamples = duration * sampleRate;
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Create a higher-pitched start beep
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Higher tone: 800 Hz
        const tone = Math.sin(2 * Math.PI * 800 * t);
        // Envelope (fade out)
        const envelope = Math.max(0, 1 - t / duration);
        data[i] = tone * envelope * 0.3;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.warn("Could not play start beep:", err);
    }
  }, []);

  // Play completion sound using Web Audio API
  const playCompletionSound = useCallback(async () => {
    try {
      const audioContext = await getAudioContext();
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
        data[i] = (tone1 * 0.3 + tone2 * 0.3 + tone3 * 0.4) * envelope * 0.6;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      // Fallback: use a simple beep if Web Audio API fails
      console.warn("Could not play completion sound:", err);
    }
  }, []);

  // Derive remaining time from target and elapsed
  const timeRemaining = Math.max(0, targetSeconds - elapsedSeconds);

  // Format seconds to MM:SS
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Start/Resume timer
  const handleStart = useCallback(async () => {
    // Resume AudioContext on user interaction (required for iOS)
    await getAudioContext();

    // Request Wake Lock to keep screen awake
    await requestWakeLock();

    // If starting from the beginning, start preparation countdown
    if (timeRemaining === targetSeconds && prepCountdown === null) {
      setPrepCountdown(5);
      lastPrepCountdownRef.current = null;
      // Don't set end time yet - will be set when actual timer starts
    } else {
      // Resume from pause - start timer directly
      setIsRunning(true);
      // Set end time based on remaining time
      endTimeRef.current = Date.now() + timeRemaining * 1000;
    }
  }, [timeRemaining, targetSeconds, prepCountdown, requestWakeLock]);

  // Pause timer
  const handlePause = async () => {
    setIsRunning(false);
    // Cancel preparation countdown if in progress
    if (prepCountdown !== null) {
      setPrepCountdown(null);
    }
    // Release Wake Lock when paused
    await releaseWakeLock();
    // Clear end time when paused
    endTimeRef.current = null;
  };

  // Auto-start if requested (for transitions)
  useEffect(() => {
    if (
      autoStart &&
      timeRemaining === targetSeconds &&
      prepCountdown === null &&
      !isCompleted &&
      !hasAutoStartedRef.current
    ) {
      hasAutoStartedRef.current = true;
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        handleStart();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoStart, timeRemaining, targetSeconds, prepCountdown, isCompleted, handleStart]);

  // Reset timer
  const handleReset = async () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setPrepCountdown(null);
    hasPlayedSoundRef.current = false;
    lastCountdownSecondRef.current = null;
    lastPrepCountdownRef.current = null;
    endTimeRef.current = null;
    setShowBackgroundWarning(false);
    // Release Wake Lock when reset
    await releaseWakeLock();
  };

  // Preparation countdown effect (5, 4, 3, 2, 1, Start)
  useEffect(() => {
    if (prepCountdown !== null && prepCountdown >= 0) {
      prepIntervalRef.current = setInterval(() => {
        setPrepCountdown(prev => {
          if (prev === null) return null;

          const next = prev - 1;

          // Play sounds at appropriate times
          if (next === 3 && lastPrepCountdownRef.current !== 3) {
            playCountdownBeep();
            lastPrepCountdownRef.current = 3;
          } else if (next === 2 && lastPrepCountdownRef.current !== 2) {
            playCountdownBeep();
            lastPrepCountdownRef.current = 2;
          } else if (next === 1 && lastPrepCountdownRef.current !== 1) {
            playCountdownBeep();
            lastPrepCountdownRef.current = 1;
          } else if (next === 0 && lastPrepCountdownRef.current !== 0) {
            // "Start" beep (higher tone) when transitioning to 0
            playStartBeep();
            lastPrepCountdownRef.current = 0;
          }

          // After 0, exit preparation phase
          if (next < 0) {
            return null; // Exit preparation phase
          }

          return next;
        });
      }, 1000);
    } else {
      if (prepIntervalRef.current) {
        clearInterval(prepIntervalRef.current);
        prepIntervalRef.current = null;
      }
    }

    return () => {
      if (prepIntervalRef.current) {
        clearInterval(prepIntervalRef.current);
      }
    };
  }, [prepCountdown, playCountdownBeep, playStartBeep]);

  // When preparation countdown reaches 0, start the timer after a brief delay
  useEffect(() => {
    if (prepCountdown === 0) {
      const timer = setTimeout(() => {
        setIsRunning(true);
        setPrepCountdown(null); // Exit preparation phase
        // Set end time when actual timer starts
        endTimeRef.current = Date.now() + targetSeconds * 1000;
      }, 800); // Brief delay to show "START"

      return () => clearTimeout(timer);
    }
  }, [prepCountdown, targetSeconds]);

  // Countdown effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newElapsed = prev + 1;
          const newRemaining = targetSeconds - newElapsed;

          // Play countdown beeps at 3, 2, 1 seconds remaining
          if (newRemaining > 0 && newRemaining <= 3 && newRemaining !== lastCountdownSecondRef.current) {
            playCountdownBeep();
            lastCountdownSecondRef.current = newRemaining;
          }

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
  }, [isRunning, timeRemaining, targetSeconds, onComplete, playCountdownBeep, playCompletionSound]);

  // Reset completion sound flag when timer starts running again (but not countdown/start sounds)
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      hasPlayedSoundRef.current = false;
      // Reset countdown tracking when timer restarts from a pause
      if (elapsedSeconds > 0) {
        lastCountdownSecondRef.current = null;
      }
    }
  }, [isRunning, timeRemaining, elapsedSeconds]);

  // Handle page visibility changes (app switching, screen lock)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is now hidden (switched app or locked screen)
        wasRunningRef.current = isRunning;
        if (isRunning) {
          setShowBackgroundWarning(true);
        }
      } else {
        // Page is now visible again
        if (wasRunningRef.current && endTimeRef.current) {
          // Check if timer should have completed while in background
          const now = Date.now();
          if (now >= endTimeRef.current) {
            // Timer completed while in background
            setElapsedSeconds(targetSeconds);
            setIsRunning(false);
            if (!hasPlayedSoundRef.current) {
              playCompletionSound();
              hasPlayedSoundRef.current = true;
            }
            if (onComplete) {
              onComplete();
            }
            endTimeRef.current = null;
          } else {
            // Timer still running - sync elapsed time
            const actualElapsed = calculateElapsedFromEndTime();
            setElapsedSeconds(actualElapsed);
          }
        }
        // Re-request wake lock if timer is running
        if (isRunning && wakeLockEnabled) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isRunning,
    targetSeconds,
    onComplete,
    playCompletionSound,
    wakeLockEnabled,
    calculateElapsedFromEndTime,
    requestWakeLock,
  ]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Calculate progress percentage
  const progress = prepCountdown !== null ? 0 : ((targetSeconds - timeRemaining) / targetSeconds) * 100;

  // Display text based on state
  const getDisplayText = () => {
    if (prepCountdown !== null) {
      if (prepCountdown > 3) {
        return formatTime(prepCountdown);
      } else if (prepCountdown > 0) {
        return String(prepCountdown);
      } else {
        return "START";
      }
    }
    return formatTime(timeRemaining);
  };

  // Display color based on state
  const getDisplayColor = () => {
    if (prepCountdown !== null) {
      if (prepCountdown === 0) {
        return "warning.main"; // Orange/yellow for "START"
      }
      return "primary.main"; // Blue for countdown
    }
    if (timeRemaining === 0) {
      return "success.main";
    }
    return "text.primary";
  };

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
        {/* Background Warning */}
        {showBackgroundWarning && isRunning && (
          <Alert
            severity="warning"
            icon={<Warning fontSize="small" />}
            onClose={() => setShowBackgroundWarning(false)}
            sx={{ width: "100%", py: 0.5 }}
          >
            <Typography variant="caption">Timer may pause if you switch apps or lock your phone</Typography>
          </Alert>
        )}

        {/* Timer Display */}
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            fontFamily: "monospace",
            color: getDisplayColor(),
          }}
        >
          {getDisplayText()}
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
        <Stack direction="row" spacing={1} alignItems="center">
          {!isRunning && prepCountdown === null ? (
            <IconButton
              onClick={handleStart}
              disabled={timeRemaining === 0 || isCompleted}
              color="primary"
              size="small"
            >
              <PlayArrow />
            </IconButton>
          ) : (
            <IconButton
              onClick={handlePause}
              color="warning"
              size="small"
              disabled={prepCountdown === null && isCompleted}
            >
              <Pause />
            </IconButton>
          )}
          <IconButton onClick={handleReset} disabled={isCompleted} size="small">
            <Refresh />
          </IconButton>

          {/* Wake Lock Toggle */}
          {"wakeLock" in navigator && (
            <Tooltip title={wakeLockEnabled ? "Keep screen awake (enabled)" : "Keep screen awake (disabled)"}>
              <IconButton
                onClick={() => {
                  setWakeLockEnabled(!wakeLockEnabled);
                  if (!wakeLockEnabled && isRunning) {
                    requestWakeLock();
                  } else if (wakeLockEnabled) {
                    releaseWakeLock();
                  }
                }}
                color={wakeLockEnabled ? "primary" : "default"}
                size="small"
              >
                <LightMode />
              </IconButton>
            </Tooltip>
          )}
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
