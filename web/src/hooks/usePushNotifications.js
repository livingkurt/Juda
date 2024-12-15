import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setSnackbar } from "@/store/slices/uiSlice";
import {
  requestNotificationPermission,
  onMessageListener,
} from "@/config/firebase";
import apiService from "@/services/api";

export default function usePushNotifications() {
  const dispatch = useDispatch();
  const [isTokenFound, setTokenFound] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          // Send the token to your backend
          await apiService.updateNotificationToken({ token });
          setTokenFound(true);
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
        dispatch(
          setSnackbar({
            open: true,
            message: "Failed to initialize notifications",
            severity: "error",
          })
        );
      }
    };

    initializeNotifications();
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = onMessageListener()
      .then(payload => {
        if (payload) {
          dispatch(
            setSnackbar({
              open: true,
              message:
                payload.notification?.body || "New notification received",
              severity: "info",
            })
          );
        }
      })
      .catch(err => {
        console.error("Failed to listen to messages:", err);
      });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [dispatch]);

  return { isTokenFound };
}
