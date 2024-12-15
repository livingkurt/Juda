import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging;

// Initialize messaging only on the client side
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Failed to initialize Firebase messaging:", error);
  }
}

export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Get the token
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
};

export const onMessageListener = () => {
  return new Promise(resolve => {
    if (!messaging) {
      resolve(null);
      return;
    }

    onMessage(messaging, payload => {
      resolve(payload);
    });
  });
};

export default app;
