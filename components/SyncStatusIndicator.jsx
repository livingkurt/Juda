"use client";

import { useEffect } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { selectConnectionStatus, selectRecentSyncs, clearRecentSync } from "@/lib/store/slices/syncSlice";
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react";

export function SyncStatusIndicator() {
  const dispatch = useDispatch();
  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);

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
        return { icon: Wifi, color: "green.500", text: "Synced" };
      case "reconnecting":
        return { icon: RefreshCw, color: "orange.500", text: "Reconnecting..." };
      case "failed":
        return { icon: AlertCircle, color: "red.500", text: "Connection failed" };
      default:
        return { icon: WifiOff, color: "gray.500", text: "Offline" };
    }
  };

  const connectionDisplay = getConnectionDisplay();
  const showConnectionStatus = connectionStatus !== "connected";

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
    <Box position="fixed" bottom={4} left="50%" transform="translateX(-50%)" zIndex={1000}>
      {/* Connection status badge */}
      {showConnectionStatus && (
        <Box
          animation="slideUp 0.2s ease-out"
          css={{
            "@keyframes slideUp": {
              from: {
                opacity: 0,
                transform: "translateY(20px) scale(0.9)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0) scale(1)",
              },
            },
          }}
        >
          <HStack
            bg="bg.panel"
            borderRadius="full"
            px={4}
            py={2}
            shadow="lg"
            borderWidth={1}
            borderColor="border.default"
            gap={2}
          >
            <Box
              as={connectionDisplay.icon}
              color={connectionDisplay.color}
              animation={connectionStatus === "reconnecting" ? "spin 1s linear infinite" : undefined}
              css={{
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
            <Text fontSize="sm" color="fg.muted">
              {connectionDisplay.text}
            </Text>
          </HStack>
        </Box>
      )}

      {/* Recent sync toasts */}
      {recentSyncs.map(sync => (
        <Box
          key={sync.id}
          mt={2}
          animation="slideUp 0.2s ease-out"
          css={{
            "@keyframes slideUp": {
              from: {
                opacity: 0,
                transform: "translateY(20px) scale(0.9)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0) scale(1)",
              },
            },
          }}
        >
          <HStack
            bg="bg.panel"
            borderRadius="full"
            px={4}
            py={2}
            shadow="md"
            borderWidth={1}
            borderColor="green.500"
            borderColorOpacity={0.3}
            gap={2}
          >
            <Box as={Check} color="green.500" boxSize={4} />
            <Text fontSize="sm" color="fg.muted">
              {getSyncText(sync)}
            </Text>
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
