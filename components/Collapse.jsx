"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";

/**
 * Collapse component that smoothly expands and collapses content
 * Similar to Material UI's Collapse component - measures actual height and animates
 */
export const Collapse = ({ in: isOpen, children, duration = 300, easing = "ease-in-out" }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(isOpen ? "auto" : "0px");

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      // Measure the actual height
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(`${contentHeight}px`);

      // After animation completes, set to auto for dynamic content
      const timer = setTimeout(() => {
        if (contentRef.current && isOpen) {
          setHeight("auto");
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Before collapsing, measure current height
      const currentHeight = contentRef.current.scrollHeight;
      setHeight(`${currentHeight}px`);

      // Force reflow to ensure height is set before animating
      contentRef.current.offsetHeight;

      // Start collapse animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight("0px");
        });
      });
    }
  }, [isOpen, duration]);

  return (
    <Box
      ref={contentRef}
      overflow="hidden"
      height={height}
      transition={`height ${duration}ms ${easing}`}
      style={{ willChange: isOpen ? "height" : "auto" }}
    >
      {children}
    </Box>
  );
};
