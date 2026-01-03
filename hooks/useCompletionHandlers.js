"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { formatLocalDate, minutesToTime } from "@/lib/utils";

/**
 * Handles task completion, outcomes, and recently completed tracking
 */
export function useCompletionHandlers({
  tasks,
  sections,
  updateTask,
  createCompletion,
  deleteCompletion,
  batchCreateCompletions,
  batchDeleteCompletions,
  isCompletedOnDate,
  showCompletedTasks,
  today,
  viewDate,
  autoCollapsedSections,
  setAutoCollapsedSections,
  updateSection,
  checkAndAutoCollapseSection,
  toast,
}) {
  // Track recently completed tasks (for delayed hiding)
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
  const recentlyCompletedTimeoutsRef = useRef({});

  // Cleanup timeouts when component unmounts or when showCompletedTasks changes
  useEffect(() => {
    return () => {
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
    };
  }, []);

  // Clear recently completed tasks when showCompletedTasks is turned on
  useEffect(() => {
    if (showCompletedTasks) {
      setRecentlyCompletedTasks(new Set());
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
    }
  }, [showCompletedTasks]);

  // Remove from recently completed
  const removeFromRecentlyCompleted = useCallback(taskId => {
    setRecentlyCompletedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    if (recentlyCompletedTimeoutsRef.current[taskId]) {
      clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
      delete recentlyCompletedTimeoutsRef.current[taskId];
    }
  }, []);

  // Add to recently completed with timeout
  const addToRecentlyCompleted = useCallback(
    (taskId, sectionId) => {
      setRecentlyCompletedTasks(prev => new Set(prev).add(taskId));

      if (recentlyCompletedTimeoutsRef.current[taskId]) {
        clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
      }

      recentlyCompletedTimeoutsRef.current[taskId] = setTimeout(() => {
        removeFromRecentlyCompleted(taskId);

        // After the delay, check if section should auto-collapse
        if (sectionId) {
          setTimeout(() => {
            if (checkAndAutoCollapseSection) {
              checkAndAutoCollapseSection(sectionId);
            }
          }, 50);
        }
      }, 2000);
    },
    [removeFromRecentlyCompleted, checkAndAutoCollapseSection]
  );

  // Collect subtask completions for batch operations
  const collectSubtaskCompletionsToDelete = useCallback(
    (task, targetDate) => {
      const completionsToDelete = [{ taskId: task.id, date: targetDate.toISOString() }];
      if (!task.subtasks || task.subtasks.length === 0) {
        return completionsToDelete;
      }

      for (const subtask of task.subtasks) {
        if (isCompletedOnDate(subtask.id, targetDate)) {
          completionsToDelete.push({ taskId: subtask.id, date: targetDate.toISOString() });
        }
      }
      return completionsToDelete;
    },
    [isCompletedOnDate]
  );

  const collectSubtaskCompletionsToCreate = useCallback(
    (task, targetDate) => {
      const completionsToCreate = [{ taskId: task.id, date: targetDate.toISOString() }];
      if (!task.subtasks || task.subtasks.length === 0) {
        return completionsToCreate;
      }

      for (const subtask of task.subtasks) {
        if (!isCompletedOnDate(subtask.id, targetDate)) {
          completionsToCreate.push({ taskId: subtask.id, date: targetDate.toISOString() });
        }
      }
      return completionsToCreate;
    },
    [isCompletedOnDate]
  );

  // Toggle task completion
  const handleToggleTask = useCallback(
    async taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const hasNoRecurrence = !task.recurrence;
      const targetDate = hasNoRecurrence ? today : viewDate;
      const isCompletedOnTargetDate = isCompletedOnDate(taskId, targetDate);

      // Check if we need to temporarily expand a section when checking from backlog
      let wasSectionCollapsed = false;
      let sectionWasManuallyCollapsed = false;
      let sectionWasAutoCollapsed = false;

      if (hasNoRecurrence && !isCompletedOnTargetDate && task.sectionId) {
        const section = sections.find(s => s.id === task.sectionId);
        if (section) {
          sectionWasManuallyCollapsed = section.expanded === false;
          sectionWasAutoCollapsed = autoCollapsedSections.has(section.id);
          wasSectionCollapsed = sectionWasManuallyCollapsed || sectionWasAutoCollapsed;

          if (wasSectionCollapsed) {
            if (sectionWasAutoCollapsed) {
              setAutoCollapsedSections(prev => {
                const newSet = new Set(prev);
                newSet.delete(section.id);
                return newSet;
              });
            }
            if (sectionWasManuallyCollapsed) {
              await updateSection(section.id, { expanded: true });
            }
          }
        }
      }

      try {
        const now = new Date();
        const currentTime = minutesToTime(now.getHours() * 60 + now.getMinutes());
        const isRecurringTask = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (hasNoRecurrence && !isCompletedOnTargetDate) {
          const todayDateStr = formatLocalDate(today);
          await updateTask(taskId, {
            recurrence: {
              type: "none",
              startDate: `${todayDateStr}T00:00:00.000Z`,
            },
            time: currentTime,
            status: "complete",
          });
        } else if (!isRecurringTask && !task.time && !isCompletedOnTargetDate) {
          await updateTask(taskId, {
            time: currentTime,
            status: "complete",
          });
        } else if (!isRecurringTask && !isCompletedOnTargetDate) {
          await updateTask(taskId, {
            status: "complete",
          });
        }

        if (isCompletedOnTargetDate) {
          const completionsToDelete = collectSubtaskCompletionsToDelete(task, targetDate);
          await batchDeleteCompletions(completionsToDelete);

          if (!isRecurringTask) {
            await updateTask(taskId, {
              status: "todo",
            });
          }

          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }
        } else {
          if (!showCompletedTasks) {
            addToRecentlyCompleted(taskId, task.sectionId);
          }

          try {
            const completionsToCreate = collectSubtaskCompletionsToCreate(task, targetDate);
            await batchCreateCompletions(completionsToCreate);
          } catch (completionError) {
            if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
              removeFromRecentlyCompleted(taskId);
            }
            throw completionError;
          }
        }

        if (wasSectionCollapsed && !showCompletedTasks && task.sectionId) {
          const sectionIdToCollapse = task.sectionId;
          setTimeout(() => {
            if (sectionWasManuallyCollapsed) {
              updateSection(sectionIdToCollapse, { expanded: false }).catch(err => {
                console.error("Error collapsing section:", err);
              });
            }
            if (sectionWasAutoCollapsed) {
              if (checkAndAutoCollapseSection) {
                checkAndAutoCollapseSection(sectionIdToCollapse);
              }
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error toggling task completion:", error);
        if (wasSectionCollapsed && task.sectionId) {
          const sectionIdToRestore = task.sectionId;
          if (sectionWasManuallyCollapsed) {
            updateSection(sectionIdToRestore, { expanded: false }).catch(err => {
              console.error("Error restoring section state:", err);
            });
          }
          if (sectionWasAutoCollapsed) {
            setAutoCollapsedSections(prev => {
              const newSet = new Set(prev);
              newSet.add(sectionIdToRestore);
              return newSet;
            });
          }
        }
      }
    },
    [
      tasks,
      sections,
      today,
      viewDate,
      isCompletedOnDate,
      updateTask,
      batchCreateCompletions,
      batchDeleteCompletions,
      showCompletedTasks,
      recentlyCompletedTasks,
      autoCollapsedSections,
      setAutoCollapsedSections,
      updateSection,
      checkAndAutoCollapseSection,
      collectSubtaskCompletionsToDelete,
      collectSubtaskCompletionsToCreate,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
    ]
  );

  // Toggle subtask completion
  const handleToggleSubtask = useCallback(
    async (taskId, subtaskId) => {
      const subtask =
        tasks.find(t => t.id === subtaskId) || tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
      if (!subtask) return;

      const hasNoRecurrence = !subtask.recurrence;
      const targetDate = hasNoRecurrence ? today : viewDate;
      const isCompletedOnTargetDate = isCompletedOnDate(subtaskId, targetDate);

      try {
        if (hasNoRecurrence && !isCompletedOnTargetDate) {
          const todayDateStr = formatLocalDate(today);
          await updateTask(subtaskId, {
            recurrence: {
              type: "none",
              startDate: `${todayDateStr}T00:00:00.000Z`,
            },
          });
        }

        if (isCompletedOnTargetDate) {
          await deleteCompletion(subtaskId, targetDate.toISOString());
        } else {
          await createCompletion(subtaskId, targetDate.toISOString());
        }
      } catch (error) {
        console.error("Error toggling subtask completion:", error);
      }
    },
    [tasks, today, viewDate, isCompletedOnDate, updateTask, createCompletion, deleteCompletion]
  );

  // Handle outcome change (completed/not_completed)
  const handleOutcomeChange = useCallback(
    async (taskId, date, outcome) => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        const task = tasks.find(t => t.id === taskId);
        const isSubtask = task?.parentId != null;
        const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (outcome === null) {
          await deleteCompletion(taskId, dateObj.toISOString());

          if (!isRecurringTask) {
            await updateTask(taskId, { status: "todo" });
          }

          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }

          if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
            await Promise.all(task.subtasks.map(subtask => deleteCompletion(subtask.id, dateObj.toISOString())));
          }
        } else {
          if (outcome === "completed" && !showCompletedTasks) {
            addToRecentlyCompleted(taskId, task?.sectionId);
          }

          try {
            await createCompletion(taskId, dateObj.toISOString(), { outcome });

            if (outcome === "completed" && !isRecurringTask) {
              await updateTask(taskId, { status: "complete" });
            }

            if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
              await Promise.all(
                task.subtasks.map(subtask => createCompletion(subtask.id, dateObj.toISOString(), { outcome }))
              );
            }
          } catch (completionError) {
            if (outcome === "completed" && !showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
              removeFromRecentlyCompleted(taskId);
            }
            throw completionError;
          }
        }

        setTimeout(() => {
          if (task?.sectionId && checkAndAutoCollapseSection) {
            checkAndAutoCollapseSection(task.sectionId);
          }
        }, 100);
      } catch (error) {
        toast({
          title: "Failed to update task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [
      tasks,
      createCompletion,
      deleteCompletion,
      updateTask,
      showCompletedTasks,
      recentlyCompletedTasks,
      checkAndAutoCollapseSection,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
      toast,
    ]
  );

  // Mark as not completed
  const handleNotCompletedTask = useCallback(
    async taskId => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        await createCompletion(taskId, targetDate.toISOString(), { outcome: "not_completed" });

        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }
      } catch (error) {
        console.error("Error marking task as not completed:", error);
        toast({
          title: "Failed to mark task as not completed",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [tasks, today, viewDate, createCompletion, showCompletedTasks, addToRecentlyCompleted, toast]
  );

  // Complete with note
  const handleCompleteWithNote = useCallback(
    async (taskId, note) => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        await createCompletion(taskId, targetDate.toISOString(), {
          outcome: "completed",
          note,
        });

        const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";
        if (!isRecurringTask) {
          await updateTask(taskId, { status: "complete" });
        }

        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }
      } catch (error) {
        console.error("Error completing task with note:", error);
        toast({
          title: "Failed to complete task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [tasks, today, viewDate, createCompletion, updateTask, showCompletedTasks, addToRecentlyCompleted, toast]
  );

  return {
    // State
    recentlyCompletedTasks,

    // Handlers
    handleToggleTask,
    handleToggleSubtask,
    handleOutcomeChange,
    handleNotCompletedTask,
    handleCompleteWithNote,

    // Helpers
    addToRecentlyCompleted,
    removeFromRecentlyCompleted,
  };
}
