"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";

/**
 * Manages task selection for bulk operations
 */
export function useSelectionState({ batchUpdateTasks } = {}) {
  const { toast } = useToast();
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  // Handle task selection (cmd/ctrl+click)
  const handleTaskSelect = useCallback((taskId, event) => {
    const isMultiSelect = event?.metaKey || event?.ctrlKey;

    if (isMultiSelect) {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    } else {
      // Single click without modifier - select only this task
      setSelectedTaskIds(new Set([taskId]));
    }
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  // Open bulk edit dialog
  const handleBulkEdit = useCallback(() => {
    if (selectedTaskIds.size > 0) {
      setBulkEditDialogOpen(true);
    }
  }, [selectedTaskIds.size]);

  // Close bulk edit dialog
  const closeBulkEditDialog = useCallback(() => {
    setBulkEditDialogOpen(false);
    clearSelection();
  }, [clearSelection]);

  // Handle bulk edit save
  const handleBulkEditSave = useCallback(
    async updates => {
      if (!batchUpdateTasks) {
        console.warn("batchUpdateTasks not provided to useSelectionState");
        return;
      }

      try {
        await batchUpdateTasks(Array.from(selectedTaskIds), updates);

        toast({
          title: `Updated ${selectedTaskIds.size} task(s)`,
          status: "success",
          duration: 2000,
        });

        closeBulkEditDialog();
      } catch (err) {
        console.error("Bulk edit error:", err);
        toast({
          title: "Failed to update tasks",
          description: err.message,
          status: "error",
          duration: 3000,
        });
      }
    },
    [selectedTaskIds, batchUpdateTasks, toast, closeBulkEditDialog]
  );

  return {
    selectedTaskIds,
    setSelectedTaskIds,
    bulkEditDialogOpen,
    setBulkEditDialogOpen,
    handleTaskSelect,
    clearSelection,
    handleBulkEdit,
    closeBulkEditDialog,
    handleBulkEditSave,
    selectedCount: selectedTaskIds.size,
  };
}
