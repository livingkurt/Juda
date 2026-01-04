"use client";

import { Toaster as ChakraToaster } from "@chakra-ui/react";
import { toaster } from "@/lib/toaster";

export function Toaster() {
  return (
    <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
      {toast => (
        <ChakraToaster.Toast>
          <ChakraToaster.Title>{toast.title}</ChakraToaster.Title>
          {toast.description && <ChakraToaster.Description>{toast.description}</ChakraToaster.Description>}
          <ChakraToaster.CloseTrigger />
        </ChakraToaster.Toast>
      )}
    </ChakraToaster>
  );
}
