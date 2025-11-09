import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// 1. UPDATE INTERFACE to include groupId
interface UserProfile {
  role: "ADMIN" | "SM" | "OGL" | null;
  displayName: string;
  groupId?: string; // <-- NEW! Optional, because Admins/SMs won't have one
}

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // 2. SAVE groupId TO STATE
            setProfile({
              role: userData.role || null,
              displayName: userData.displayName || "User",
              groupId: userData.groupId || undefined, // <-- NEW!
            });
          } else {
            console.error("No user profile found in Firestore!");
            setProfile(null);
          }
        } else {
          setCurrentUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error in AuthContext:", error);
        setCurrentUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { currentUser, profile, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
