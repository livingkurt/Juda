"use client";

import { Box, Group, Text, Badge, ActionIcon, Loader } from "@mantine/core";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

export function OfflineIndicator() {
  const { isOnline, pendingSyncCount, syncInProgress, triggerSync } = useOfflineStatus();

  // Don't show anything if online and no pending syncs
  if (isOnline && pendingSyncCount === 0 && !syncInProgress) {
    return null;
  }

  return (
    <Box
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: isOnline ? "var(--mantine-color-orange-5)" : "var(--mantine-color-red-5)",
        color: "white",
        padding: "8px 16px",
        borderRadius: "9999px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Group gap={8}>
        {/* Connection Status */}
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}

        {/* Status Text */}
        <Text size="sm" fw={500}>
          {isOnline ? "Syncing..." : "Offline"}
        </Text>

        {/* Pending Count */}
        {pendingSyncCount > 0 && (
          <Badge color={isOnline ? "orange" : "red"} variant="filled">
            {pendingSyncCount}
          </Badge>
        )}

        {/* Sync Button / Loader */}
        {isOnline &&
          pendingSyncCount > 0 &&
          (syncInProgress ? (
            <Loader size="xs" color="white" />
          ) : (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={triggerSync}
              aria-label="Sync now"
              color="white"
              style={{ color: "white" }}
            >
              <RefreshCw size={14} />
            </ActionIcon>
          ))}
      </Group>
    </Box>
  );
}
