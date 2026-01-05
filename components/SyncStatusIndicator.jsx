"use client";

import { useEffect } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";
import { selectConnectionStatus, selectRecentSyncs, clearRecentSync } from "@/lib/store/slices/syncSlice";
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function SyncStatusIndicator() {
  const dispatch = useDispatch();
  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);
  const { bg, text, border } = useSemanticColors();

  // Auto-clear syncs after 3 seconds
  useEffect(() => {
    recentSyncs.forEach(sync => {
      const timer = setTimeout(() => {
        dispatch(clearRecentSync(sync.id));
      }, 3000);
      return () => clearTimeout(timer);
    });
  }, [recentSyncs, dispatch]);

  // Connection status icon and color
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case "connected":
        return { icon: Wifi, color: "var(--mantine-color-green-5)", text: "Synced" };
      case "reconnecting":
        return { icon: RefreshCw, color: "var(--mantine-color-orange-5)", text: "Reconnecting..." };
      case "failed":
        return { icon: AlertCircle, color: "var(--mantine-color-red-5)", text: "Connection failed" };
      default:
        return { icon: WifiOff, color: "var(--mantine-color-gray-5)", text: "Offline" };
    }
  };

  const connectionDisplay = getConnectionDisplay();
  const showConnectionStatus = connectionStatus !== "connected";
  const IconComponent = connectionDisplay.icon;

  // Get sync operation display text
  const getSyncText = sync => {
    if (sync.operation === "offlineSync") {
      return "Offline changes synced";
    }
    const opMap = {
      create: "created",
      update: "updated",
      delete: "deleted",
      batchCreate: "created",
      batchDelete: "deleted",
      reorder: "reordered",
    };
    return `${sync.entityType} ${opMap[sync.operation] || sync.operation}`;
  };

  return (
    <Box
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      }}
    >
      {/* Connection status badge */}
      {showConnectionStatus && (
        <Box
          style={{
            animation: "slideUp 0.2s ease-out",
          }}
        >
          <style>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.9);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <Group
            bg={bg.surface}
            style={{
              borderRadius: "9999px",
              padding: "8px 16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              border: `1px solid ${border.default}`,
            }}
            gap={8}
          >
            <IconComponent
              size={16}
              style={{
                color: connectionDisplay.color,
                animation: connectionStatus === "reconnecting" ? "spin 1s linear infinite" : undefined,
              }}
            />
            <Text size="sm" c={text.muted}>
              {connectionDisplay.text}
            </Text>
          </Group>
        </Box>
      )}

      {/* Recent sync toasts */}
      {recentSyncs.map(sync => (
        <Box
          key={sync.id}
          mt={8}
          style={{
            animation: "slideUp 0.2s ease-out",
          }}
        >
          <Group
            bg={bg.surface}
            style={{
              borderRadius: "9999px",
              padding: "8px 16px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: `1px solid rgba(34, 197, 94, 0.3)`,
            }}
            gap={8}
          >
            <Check size={16} style={{ color: "var(--mantine-color-green-5)" }} />
            <Text size="sm" c={text.muted}>
              {getSyncText(sync)}
            </Text>
          </Group>
        </Box>
      ))}
    </Box>
  );
}
