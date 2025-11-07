import React from "react";
import type { FC } from "react"; // Import FC as a type for React.FC
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CircularProgress, Box } from "@mui/material";

// This component takes a list of roles that are allowed to see the page
interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    // Show a loading spinner while we check auth
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has a profile AND their role is in the allowed list
  const isAuthorized = profile && allowedRoles.includes(profile.role ?? "");

  if (!isAuthorized) {
    // If not authorized, send them back to the home page
    return <Navigate to="/" replace />;
  }

  // If they are authorized, show the page they're trying to access
  // The <Outlet /> is a placeholder for the page (e.g., AdminDashboard)
  return <Outlet />;
};
