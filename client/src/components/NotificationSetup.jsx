import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import {
  initServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  showTestNotification,
  getNotificationPermission,
} from "../services/notificationService";

const NotificationSetup = () => {
  const [notificationStatus, setNotificationStatus] = useState("checking");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const permission = getNotificationPermission();

    if (permission === "unsupported") {
      setNotificationStatus("unsupported");
      return;
    }

    if (permission === "granted") {
      setNotificationStatus("granted");
      await initializeServiceWorker();
    } else if (permission === "denied") {
      setNotificationStatus("denied");
    } else {
      setNotificationStatus("default");
    }
  };

  const initializeServiceWorker = async () => {
    const success = await initServiceWorker();
    if (success) {
      const sub = await subscribeToPush();
      setSubscription(sub);
    }
  };

  const handleEnableNotifications = async () => {
    const permissionGranted = await requestNotificationPermission();

    if (permissionGranted) {
      setNotificationStatus("granted");
      await initializeServiceWorker();
    } else {
      setNotificationStatus("denied");
    }
  };

  const handleTestNotification = () => {
    showTestNotification();
  };

  const getStatusMessage = () => {
    switch (notificationStatus) {
      case "ios_needs_install":
        return {
          message:
            'To receive notifications on iOS, you need to "Add to Home Screen" and open from there.',
          severity: "info",
        };
      case "granted":
        return {
          message:
            "Notifications are enabled! You'll receive reminders for your tasks.",
          severity: "success",
        };
      case "denied":
        return {
          message:
            "Notifications are blocked. Enable them in your browser settings to receive reminders.",
          severity: "warning",
        };
      case "unsupported":
        return {
          message: "Your browser doesn't support notifications.",
          severity: "error",
        };
      default:
        return {
          message: "Enable notifications to receive task reminders.",
          severity: "info",
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Notifications
        </Typography>

        <Alert severity={statusMessage.severity} sx={{ mb: 2 }}>
          {statusMessage.message}
        </Alert>

        <Box sx={{ display: "flex", gap: 2 }}>
          {notificationStatus === "default" && (
            <Button variant="contained" onClick={handleEnableNotifications}>
              Enable Notifications
            </Button>
          )}

          {notificationStatus === "granted" && (
            <Button variant="outlined" onClick={handleTestNotification}>
              Test Notification
            </Button>
          )}
        </Box>

        {subscription && (
          <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
            Push notifications ready!
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSetup;
