"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
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

        console.warn(`Updated ${selectedTaskIds.size} task(s)`);

        handleCloseBulkEditDialog();
      } catch (err) {
        console.error("Bulk edit error:", err);
      }
    },
    [selectedTaskIds, batchUpdateTasksMutation, handleCloseBulkEditDialog]
  );

  // Memoize inline functions that were creating new references
  const handleSetSelectedTaskIds = useCallback(
    ids => dispatch(setSelectedTaskIds(Array.isArray(ids) ? ids : Array.from(ids))),
    [dispatch]
  );
  const handleSetBulkEditDialogOpen = useCallback(
    open => dispatch(open ? openBulkEditDialog() : closeBulkEditDialog()),
    [dispatch]
  );

  return useMemo(
    () => ({
      selectedTaskIds,
      setSelectedTaskIds: handleSetSelectedTaskIds,
      bulkEditDialogOpen,
      setBulkEditDialogOpen: handleSetBulkEditDialogOpen,
      handleTaskSelect,
      clearSelection,
      handleBulkEdit,
      closeBulkEditDialog: handleCloseBulkEditDialog,
      handleBulkEditSave,
      selectedCount: selectedTaskIds.size,
    }),
    [
      selectedTaskIds,
      handleSetSelectedTaskIds,
      bulkEditDialogOpen,
      handleSetBulkEditDialogOpen,
      handleTaskSelect,
      clearSelection,
      handleBulkEdit,
      handleCloseBulkEditDialog,
      handleBulkEditSave,
    ]
  );
}
