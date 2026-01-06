"use client";

import { useEffect, useState, useRef } from "react";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { selectConnectionStatus, selectRecentSyncs } from "@/lib/store/slices/syncSlice";

export function SyncStatusIndicator() {
  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const previousConnectionStatus = useRef(connectionStatus);
  const previousSyncCount = useRef(recentSyncs.length);
  const syncingTimeoutRef = useRef(null);

  useEffect(() => {
    const wasReconnecting = previousConnectionStatus.current === "reconnecting";
    const isReconnecting = connectionStatus === "reconnecting";
    const isConnected = connectionStatus === "connected";
    const syncCountIncreased = recentSyncs.length > previousSyncCount.current;

    // Clear any existing timeout
    if (syncingTimeoutRef.current) {
      clearTimeout(syncingTimeoutRef.current);
      syncingTimeoutRef.current = null;
    }

    // Show "Syncing..." when sync starts
    if ((isReconnecting && !wasReconnecting) || syncCountIncreased) {
      setTimeout(() => {
        setSnackbarState({
          open: true,
          message: "Syncing...",
          severity: "info",
        });
      }, 0);
    }

    // Show "Synced" when sync completes
    if (wasReconnecting && isConnected) {
      setTimeout(() => {
        setSnackbarState({
          open: true,
          message: "Synced",
          severity: "success",
        });

        // Auto-dismiss after 2 seconds
        syncingTimeoutRef.current = setTimeout(() => {
          setSnackbarState(prev => ({ ...prev, open: false }));
        }, 2000);
      }, 0);
    }

    // Update refs
    previousConnectionStatus.current = connectionStatus;
    previousSyncCount.current = recentSyncs.length;

    return () => {
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current);
      }
    };
  }, [connectionStatus, recentSyncs.length]);

  const handleClose = () => {
    setSnackbarState(prev => ({ ...prev, open: false }));
  };

  return (
    <Snackbar
      open={snackbarState.open}
      autoHideDuration={snackbarState.severity === "info" ? null : 2000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ zIndex: 9999 }}
    >
      <Alert
        severity={snackbarState.severity}
        icon={snackbarState.severity === "info" ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : undefined}
        onClose={handleClose}
        sx={{ minWidth: 200 }}
      >
        {snackbarState.message}
      </Alert>
    </Snackbar>
  );
}

export default SyncStatusIndicator;
