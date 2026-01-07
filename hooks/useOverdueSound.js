import { useEffect, useRef } from "react";
import { isOverdue } from "@/lib/utils";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

/**
 * Hook to play a sound when tasks become overdue in the today view
 * Only plays once per task when it transitions from not overdue to overdue
 */
export function useOverdueSound(tasks, viewDate) {
  const { hasRecordOnDate } = useCompletionHelpers();
  const playedSoundsRef = useRef(new Set()); // Track which tasks have already triggered sound
  const previousOverdueRef = useRef(new Set()); // Track previous overdue state
  const isInitialRenderRef = useRef(true); // Track if this is the first render

  useEffect(() => {
    if (!tasks || tasks.length === 0 || !viewDate) return;

    // Skip sound on initial render to avoid playing for tasks that are already overdue
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      // Initialize previous overdue state without playing sounds
      tasks.forEach(task => {
        if (!task.time) return;
        const hasRecord = hasRecordOnDate(task.id, viewDate);
        const taskIsOverdue = isOverdue(task, viewDate, hasRecord);
        if (taskIsOverdue) {
          previousOverdueRef.current.add(task.id);
          playedSoundsRef.current.add(task.id); // Mark as already played to prevent sound on initial load
        }
      });
      return;
    }

    // Create a simple notification sound using Web Audio API
    const playOverdueSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a gentle notification sound (two-tone chime)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (_error) {
        // Silently fail if audio context is not available
        // Audio may not be available in some contexts (e.g., autoplay restrictions)
      }
    };

    // Check each task for overdue status
    const currentOverdue = new Set();
    const newlyOverdue = [];

    tasks.forEach(task => {
      // Only check tasks with a time (tasks without time are never overdue)
      if (!task.time) return;

      const hasRecord = hasRecordOnDate(task.id, viewDate);
      const taskIsOverdue = isOverdue(task, viewDate, hasRecord);

      if (taskIsOverdue) {
        currentOverdue.add(task.id);

        // Check if this task just became overdue (wasn't overdue before)
        if (!previousOverdueRef.current.has(task.id) && !playedSoundsRef.current.has(task.id)) {
          newlyOverdue.push(task.id);
        }
      }
    });

    // Play sound for newly overdue tasks
    if (newlyOverdue.length > 0) {
      // Play sound once for all newly overdue tasks
      playOverdueSound();

      // Mark these tasks as having played the sound
      newlyOverdue.forEach(taskId => {
        playedSoundsRef.current.add(taskId);
      });
    }

    // Update previous overdue state
    previousOverdueRef.current = currentOverdue;

    // Clean up: remove tasks that are no longer overdue from the played sounds set
    // This allows the sound to play again if a task becomes overdue again later
    playedSoundsRef.current.forEach(taskId => {
      if (!currentOverdue.has(taskId)) {
        playedSoundsRef.current.delete(taskId);
      }
    });
  }, [tasks, viewDate, hasRecordOnDate]);
}
