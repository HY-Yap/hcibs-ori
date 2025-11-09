import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; // <-- Changed getDoc to onSnapshot for real-time updates
import { auth, db } from "../firebase";

interface UserProfile {
  role: "ADMIN" | "SM" | "OGL" | null;
  displayName: string;
  groupId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  gameStatus: "RUNNING" | "STOPPED" | null; // <-- NEW GLOBAL STATE
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
  ); // <-- NEW STATE

  // 1. Listen to Authentication & User Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Use onSnapshot here too so roles update live if changed by Admin!
        return onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. NEW! Listen to global Game Status
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "game", "config"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGameStatus(docSnap.data().status);
        } else {
          setGameStatus("STOPPED"); // Default safe state
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
