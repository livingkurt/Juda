"use client";

import { useEffect } from "react";
import { Chip, CircularProgress, Tooltip } from "@mui/material";
import { Cloud, CloudOff } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  selectConnectionStatus,
  selectRecentSyncs,
  selectLastSyncTimestamp,
  clearRecentSync,
} from "@/lib/store/slices/syncSlice";

export function SyncStatusIndicator({ status, lastSynced }) {
  const dispatch = useDispatch();
  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);
  const lastSyncTimestamp = useSelector(selectLastSyncTimestamp);

  // Use prop status if provided, otherwise use Redux state
  const displayStatus =
    status ||
    (connectionStatus === "connected"
      ? "synced"
      : connectionStatus === "reconnecting"
        ? "syncing"
        : connectionStatus === "failed"
          ? "error"
          : "offline");
  const displayLastSynced = lastSynced || lastSyncTimestamp;

  // Auto-clear syncs after 3 seconds
  useEffect(() => {
    recentSyncs.forEach(sync => {
      const timer = setTimeout(() => {
        dispatch(clearRecentSync(sync.id));
      }, 3000);
      return () => clearTimeout(timer);
    });
  }, [recentSyncs, dispatch]);

  const getConfig = () => {
    switch (displayStatus) {
      case "syncing":
        return { icon: <CircularProgress size={14} />, label: "Syncing", color: "info" };
      case "error":
        return { icon: <CloudOff fontSize="small" />, label: "Sync Error", color: "error" };
      case "offline":
        return { icon: <CloudOff fontSize="small" />, label: "Offline", color: "warning" };
      default:
        return { icon: <Cloud fontSize="small" />, label: "Synced", color: "success" };
    }
  };

  const { icon, label, color } = getConfig();
  const tooltip = displayLastSynced ? `Last synced: ${new Date(displayLastSynced).toLocaleTimeString()}` : label;

  return (
    <Tooltip title={tooltip}>
      <Chip icon={icon} label={label} size="small" color={color} variant="outlined" sx={{ height: 24 }} />
    </Tooltip>
  );
}

export default SyncStatusIndicator;
