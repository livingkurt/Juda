"use client";

import { toaster } from "@/lib/toaster";

export function useToast() {
  const toast = options => {
    const { title, description, status = "info", duration = 3000 } = options || {};
    if (!title) return;

    return toaster.create({
      title,
      description,
      type: status, // Chakra v3 uses "type" instead of "status"
      duration,
    });
  };

  return { toast };
}
