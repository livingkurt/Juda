"use client";

import { Box } from "@chakra-ui/react";
import { forwardRef } from "react";

/**
 * Wrapper for animated list items using CSS animations instead of framer-motion
 */
export const SyncAnimatedItem = forwardRef(function SyncAnimatedItem({ children, itemKey, layoutId, ...props }, ref) {
  return (
    <Box
      ref={ref}
      key={itemKey}
      data-layout-id={layoutId}
      animation="slideIn 0.25s ease-out"
      css={{
        "@keyframes slideIn": {
          from: {
            opacity: 0,
            transform: "translateY(-10px) scale(0.95)",
          },
          to: {
            opacity: 1,
            transform: "translateY(0) scale(1)",
          },
        },
      }}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Container for animated lists
 */
export function SyncAnimatedList({ items, renderItem, keyExtractor, emptyState = null }) {
  return (
    <>
      {items.length === 0 && emptyState}
      {items.map((item, index) => (
        <SyncAnimatedItem key={keyExtractor(item)} itemKey={keyExtractor(item)} layoutId={keyExtractor(item)}>
          {renderItem(item, index)}
        </SyncAnimatedItem>
      ))}
    </>
  );
}

/**
 * Wrapper that flashes briefly when updated using CSS animations
 */
export function SyncUpdateHighlight({ children, updateKey }) {
  return (
    <Box
      key={updateKey}
      animation="pulse 0.6s ease-in-out"
      css={{
        "@keyframes pulse": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(59, 130, 246, 0.1)" },
        },
      }}
    >
      {children}
    </Box>
  );
}
