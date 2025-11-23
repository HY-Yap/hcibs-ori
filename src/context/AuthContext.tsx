import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "../firebase";

interface UserProfile {
  role: "ADMIN" | "SM" | "OGL" | null;
  displayName: string;
  groupId?: string;
  username?: string;
  selectedStationId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  gameStatus: "RUNNING" | "STOPPED" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState<"RUNNING" | "STOPPED" | null>(
    null
  );

  // 1. Listen to Authentication & User Profile
  useEffect(() => {
    let profileUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Listen to the user profile
        profileUnsub = onSnapshot(
          doc(db, "users", user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setProfile({
                role: data.role || null,
                displayName: data.displayName || "User",
                groupId: data.groupId,
                username: data.username,
                selectedStationId: data.selectedStationId,
              });
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("AuthContext user snapshot error:", error);
            setLoading(false);
          }
        );
      } else {
        setCurrentUser(null);
        setProfile(null);
        if (profileUnsub) {
          profileUnsub(); // Stop listening to old profile
          profileUnsub = null;
        }
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // 2. Listen to global Game Status (THE FIX IS HERE)
  useEffect(() => {
    // If no user is logged in, we can't read the config (due to security rules).
    // So we just wait.
    if (!currentUser) {
      setGameStatus(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "game", "config"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGameStatus(docSnap.data().status);
        } else {
          setGameStatus("STOPPED");
        }
      },
      (err) => {
        // Don't crash, just log.
        // If permission denied happens briefly during login/logout, it's fine.
        console.log("Game status listener paused:", err.code);
      }
    );

    return () => unsub();
  }, [currentUser]); // <-- DEPENDENCY ADDED: Re-run this when user logs in!

  const value = { currentUser, profile, loading, gameStatus };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
