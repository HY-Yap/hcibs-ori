import React, { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Ensure this exports 'app' or initialized firebase
import { useAuth } from "../context/AuthContext";

// REPLACE THIS WITH THE KEY YOU GENERATED IN STEP 1
const VAPID_KEY =
  "BHvNzBmU4Pn92JGsNl6xDEp_S6d7RxF_3VSmD8hqJPj84coEPW-PsUnZ64hci0bD7aKzFmJqyNrSDEWF54FLLj4";

export const NotificationHandler: React.FC = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    // Allow ANY logged-in user to register for notifications
    if (currentUser && "Notification" in window) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const messaging = getMessaging();
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
    }
  }, [currentUser]);

  // This component doesn't render anything visible
  return null;
};
