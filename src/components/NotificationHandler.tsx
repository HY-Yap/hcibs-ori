import React, { useEffect, useRef } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// REPLACE THIS WITH THE KEY YOU GENERATED IN STEP 1
const VAPID_KEY =
  "BHvNzBmU4Pn92JGsNl6xDEp_S6d7RxF_3VSmD8hqJPj84coEPW-PsUnZ64hci0bD7aKzFmJqyNrSDEWF54FLLj4";

export const NotificationHandler: React.FC = () => {
  const { currentUser } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Allow ANY logged-in user to register for notifications
    if (currentUser && "Notification" in window) {
      const messaging = getMessaging();

      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });

            if (token) {
              // Save token to the user's profile
              await updateDoc(doc(db, "users", currentUser.uid), {
                fcmToken: token,
              });
            }
          }
        } catch (error) {
          console.error("Error requesting notification permission:", error);
        }
      };

      requestPermission();

      // Register foreground message handler with cleanup
      // This prevents duplicate listeners which can cause double actions/logs
      if (!unsubscribeRef.current) {
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          // Handle foreground notification here (e.g. toast)
        });
      }
    }

    // Cleanup function to remove the listener when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser]);

  // This component doesn't render anything visible
  return null;
};
