"use client";

import { useState, useEffect } from "react";
import { Snackbar, Alert, Slide } from "@mui/material";
import { WifiOff, Wifi } from "@mui/icons-material";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={Slide}
      >
        <Alert severity="warning" icon={<WifiOff fontSize="medium" />} sx={{ width: "100%" }}>
          You&apos;re offline. Changes will sync when you reconnect.
        </Alert>
      </Snackbar>

      <Snackbar
        open={showReconnected}
        autoHideDuration={3000}
        onClose={() => setShowReconnected(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" icon={<Wifi fontSize="medium" />}>
          Back online! Syncing changes...
        </Alert>
      </Snackbar>
    </>
  );
}

export default OfflineIndicator;
