"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@/hooks/useToast";
import { useBatchUpdateTasksMutation } from "@/lib/store/api/tasksApi";
import {
  setSelectedTaskIds,
  toggleTaskSelection,
  clearSelection as clearSelectionAction,
  openBulkEditDialog,
  closeBulkEditDialog,
} from "@/lib/store/slices/uiSlice";

/**
 * Manages task selection for bulk operations using Redux directly
 */
export function useSelectionState() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Get state from Redux
  const selectedTaskIdsArray = useSelector(state => state.ui.selectedTaskIds);
  const bulkEditDialogOpen = useSelector(state => state.ui.bulkEditDialogOpen);

  // Convert array to Set for efficient lookups
  const selectedTaskIds = useMemo(() => new Set(selectedTaskIdsArray), [selectedTaskIdsArray]);

  // RTK Query mutation
  const [batchUpdateTasksMutation] = useBatchUpdateTasksMutation();

  // Handle task selection (cmd/ctrl+click)
  const handleTaskSelect = useCallback(
    (taskId, event) => {
      const isMultiSelect = event?.metaKey || event?.ctrlKey;

      if (isMultiSelect) {
        dispatch(toggleTaskSelection(taskId));
      } else {
        // Single click without modifier - select only this task
        dispatch(setSelectedTaskIds([taskId]));
      }
    },
    [dispatch]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch(clearSelectionAction());
  }, [dispatch]);

  // Open bulk edit dialog
  const handleBulkEdit = useCallback(() => {
    if (selectedTaskIds.size > 0) {
      dispatch(openBulkEditDialog());
    }
  }, [dispatch, selectedTaskIds.size]);

  // Close bulk edit dialog
  const handleCloseBulkEditDialog = useCallback(() => {
    dispatch(closeBulkEditDialog());
    dispatch(clearSelectionAction());
  }, [dispatch]);

  // Handle bulk edit save
  const handleBulkEditSave = useCallback(
    async updates => {
      try {
        await batchUpdateTasksMutation({
          taskIds: Array.from(selectedTaskIds),
          updates,
        }).unwrap();

        toast({
          title: `Updated ${selectedTaskIds.size} task(s)`,
          status: "success",
          duration: 2000,
        });

        handleCloseBulkEditDialog();
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
    [selectedTaskIds, batchUpdateTasksMutation, toast, handleCloseBulkEditDialog]
  );

  return {
    selectedTaskIds,
    setSelectedTaskIds: ids => dispatch(setSelectedTaskIds(Array.isArray(ids) ? ids : Array.from(ids))),
    bulkEditDialogOpen,
    setBulkEditDialogOpen: open => dispatch(open ? openBulkEditDialog() : closeBulkEditDialog()),
    handleTaskSelect,
    clearSelection,
    handleBulkEdit,
    closeBulkEditDialog: handleCloseBulkEditDialog,
    handleBulkEditSave,
    selectedCount: selectedTaskIds.size,
  };
}
