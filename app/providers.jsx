"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  // breakpoints: {
  //   base: "0px",
  //   sm: "480px",
  //   md: "768px",
  //   lg: "960px",
  //   xl: "1280px", // Default wide breakpoint - adjust this value as needed
  //   xxl: "1536px",
  // },
  styles: {
    global: {
      body: {
        bg: "gray.50",
      },
      // Force fixed dimensions for drag previews
      // @hello-pangea/dnd clones elements and measures them before dragging
      // This ensures all drag previews have consistent size
      "[data-drag-preview='true']": {
        width: "180px !important",
        height: "40px !important",
        minWidth: "180px !important",
        maxWidth: "180px !important",
        minHeight: "40px !important",
        maxHeight: "40px !important",
      },
    },
  },
});

export function Providers({ children }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
