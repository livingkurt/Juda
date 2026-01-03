"use client";

import { Box, HStack, Text, Badge, IconButton, Spinner } from "@chakra-ui/react";
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
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
      bg={isOnline ? "orange.500" : "red.500"}
      color="white"
      px={4}
      py={2}
      borderRadius="full"
      boxShadow="lg"
    >
      <HStack gap={2}>
        {/* Connection Status */}
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}

        {/* Status Text */}
        <Text fontSize="sm" fontWeight="medium">
          {isOnline ? "Syncing..." : "Offline"}
        </Text>

        {/* Pending Count */}
        {pendingSyncCount > 0 && (
          <Badge colorScheme={isOnline ? "orange" : "red"} variant="solid">
            {pendingSyncCount}
          </Badge>
        )}

        {/* Sync Button / Spinner */}
        {isOnline &&
          pendingSyncCount > 0 &&
          (syncInProgress ? (
            <Spinner size="sm" color="white" />
          ) : (
            <IconButton
              icon={<RefreshCw size={14} />}
              size="xs"
              variant="ghost"
              onClick={triggerSync}
              aria-label="Sync now"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
            />
          ))}
      </HStack>
    </Box>
  );
}
