import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

// 1. UPDATE THE PROFILE TYPE TO BE COMPLETE
interface UserProfile {
  role: "ADMIN" | "SM" | "OGL" | null;
  displayName: string;
  groupId?: string;
  username?: string; // <-- This was missing
  selectedStationId?: string; // <-- This was missing
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        return onSnapshot(
          doc(db, "users", user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              // 2. EXPLICITLY PULL DATA (Safer than 'as UserProfile')
              const data = docSnap.data();
              setProfile({
                role: data.role || null,
                displayName: data.displayName || "User",
                groupId: data.groupId,
                username: data.username,
                selectedStationId: data.selectedStationId,
              });
            } else {
              // User is authenticated but has no profile in DB
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            // Handle snapshot errors
            console.error("AuthContext user snapshot error:", error);
            setProfile(null);
            setLoading(false);
          }
        );
      } else {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to global Game Status
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "game", "config"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGameStatus(docSnap.data().status);
        } else {
          setGameStatus("STOPPED");
        }
      },
      (err) => console.error("Game status listener failed:", err)
    );

    return () => unsub();
  }, []);

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
