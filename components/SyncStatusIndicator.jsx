"use client";

import { useEffect } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { selectConnectionStatus, selectRecentSyncs, clearRecentSync } from "@/lib/store/slices/syncSlice";
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const spinAnimation = {
  animation: "spin 1s linear infinite",
};

const MotionBox = motion(Box);

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
      <AnimatePresence mode="popLayout">
        {/* Connection status badge */}
        {showConnectionStatus && (
          <MotionBox
            key="connection-status"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
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
                css={connectionStatus === "reconnecting" ? spinAnimation : undefined}
              />
              <Text fontSize="sm" color="fg.muted">
                {connectionDisplay.text}
              </Text>
            </HStack>
          </MotionBox>
        )}

        {/* Recent sync toasts */}
        {recentSyncs.map(sync => (
          <MotionBox
            key={sync.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            mt={2}
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
          </MotionBox>
        ))}
      </AnimatePresence>
    </Box>
  );
}
