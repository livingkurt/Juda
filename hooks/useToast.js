"use client";

import { notifications } from "@mantine/notifications";
import { Check, X, AlertTriangle, Info } from "lucide-react";

/**
 * Hook to show toast notifications using Mantine
 *
 * @example
 * const { toast } = useToast();
 * toast({ title: 'Success', description: 'Task created', status: 'success' });
 */
export function useToast() {
  const toast = ({ title, description, status = "info", duration = 3000 }) => {
    const colorMap = {
      success: "green",
      error: "red",
      warning: "yellow",
      info: "blue",
    };

    const iconMap = {
      success: <Check size={18} />,
      error: <X size={18} />,
      warning: <AlertTriangle size={18} />,
      info: <Info size={18} />,
    };

    notifications.show({
      title,
      message: description,
      color: colorMap[status] || "blue",
      icon: iconMap[status] || <Info size={18} />,
      autoClose: duration,
    });
  };

  return { toast };
}
