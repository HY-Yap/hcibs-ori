import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Import your auth and db

// 1. Define the shape of our user data
interface UserProfile {
  role: "ADMIN" | "SM" | "OGL" | null;
  displayName: string;
}

// 2. Define the shape of our context
interface AuthContextType {
  currentUser: User | null; // The raw Firebase Auth user
  profile: UserProfile | null; // Our custom data from Firestore
  loading: boolean; // To show a loading spinner
}

// 3. Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. Create the "Provider" component
// This component will wrap our app and "provide" the auth data
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Start in loading state

  useEffect(() => {
    // This is the Firebase listener. It triggers on login/logout.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // <-- START OF THE FIX
        if (user) {
          // User is logged in
          setCurrentUser(user);

          // Go fetch their 'role' from the 'users' collection
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            // Found the user document
            const userData = userDocSnap.data();
            setProfile({
              role: userData.role || null,
              displayName: userData.displayName || "User",
            });
          } else {
            // User exists in Auth, but not in Firestore database
            console.error("No user profile found in Firestore!");
            setProfile(null);
          }
        } else {
          // User is logged out
          setCurrentUser(null);
          setProfile(null);
        }
      } catch (error) {
        // <-- CATCH ANY ERRORS
        console.error("Error in AuthContext:", error);
        setCurrentUser(null);
        setProfile(null);
      } finally {
        // <-- AND ALWAYS FINISH LOADING
        setLoading(false); // Done loading, no matter what
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  const value = { currentUser, profile, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 5. Create a custom "hook"
// This is a shortcut so components can easily get the data
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
