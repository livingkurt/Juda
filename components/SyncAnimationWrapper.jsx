"use client";

import { motion, AnimatePresence } from "framer-motion";
import { forwardRef } from "react";

const itemVariants = {
  initial: {
    opacity: 0,
    height: 0,
    scale: 0.95,
    y: -10,
  },
  animate: {
    opacity: 1,
    height: "auto",
    scale: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
      height: { duration: 0.25 },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
      height: { duration: 0.2, delay: 0.05 },
      opacity: { duration: 0.15 },
    },
  },
};

const updateVariants = {
  highlight: {
    backgroundColor: ["rgba(59, 130, 246, 0)", "rgba(59, 130, 246, 0.1)", "rgba(59, 130, 246, 0)"],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
};

/**
 * Wrapper for animated list items that handles enter/exit animations
 */
export const SyncAnimatedItem = forwardRef(function SyncAnimatedItem({ children, itemKey, layoutId, ...props }, ref) {
  return (
    <motion.div
      ref={ref}
      key={itemKey}
      layoutId={layoutId}
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      {...props}
    >
      {children}
    </motion.div>
  );
});

/**
 * Container for animated lists with AnimatePresence
 */
export function SyncAnimatedList({ items, renderItem, keyExtractor, emptyState = null, ...props }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {items.length === 0 && emptyState}
      {items.map((item, index) => (
        <SyncAnimatedItem key={keyExtractor(item)} itemKey={keyExtractor(item)} layoutId={keyExtractor(item)}>
          {renderItem(item, index)}
        </SyncAnimatedItem>
      ))}
    </AnimatePresence>
  );
}

/**
 * Wrapper that flashes briefly when updated
 */
export function SyncUpdateHighlight({ children, updateKey }) {
  return (
    <motion.div key={updateKey} variants={updateVariants} animate="highlight">
      {children}
    </motion.div>
  );
}

/**
 * Hook to create motion-compatible Chakra components
 */
export function createMotionComponent(Component) {
  return motion(Component);
}
