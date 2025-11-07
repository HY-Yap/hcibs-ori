import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// This component is for pages a logged-in user should NOT see,
// like the HomePage (we want to send them to their dashboard).
export const GuestOnlyRoute: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    // While we're checking who they are, don't show anything
    return null;
  }

  if (profile) {
    // User is logged in! Send them to their correct dashboard.
    if (profile.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === "SM") {
      return <Navigate to="/sm" replace />;
    }
    if (profile.role === "OGL") {
      return <Navigate to="/ogl" replace />;
    }
  }

  // If user is not logged in (profile is null),
  // show the page they asked for (e.g., HomePage).
  return <Outlet />;
};
