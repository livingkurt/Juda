"use client";

import { useSnackbar } from "notistack";
import { useCallback } from "react";

/**
 * Toast hook that wraps notistack for backwards compatibility
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast({ title: 'Success!', status: 'success' });
 *   toast({ title: 'Error', description: 'Something went wrong', status: 'error' });
 */
export function useToast() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const toast = useCallback(
    ({ title, description, status = "info", duration = 3000 }) => {
      const message = description ? `${title}: ${description}` : title;

      const variant =
        {
          success: "success",
          error: "error",
          warning: "warning",
          info: "info",
          loading: "info",
        }[status] || "info";

      return enqueueSnackbar(message, {
        variant,
        autoHideDuration: status === "loading" ? null : duration,
      });
    },
    [enqueueSnackbar]
  );

  const closeToast = useCallback(
    key => {
      closeSnackbar(key);
    },
    [closeSnackbar]
  );

  return { toast, closeToast };
}

export default useToast;
