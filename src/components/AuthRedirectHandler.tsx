import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * This component has no UI. Its only job is to handle
 * automatic redirects based on auth state.
 */
export const AuthRedirectHandler: React.FC = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait until we're done loading auth info
    if (loading) {
      return;
    }

    // 1. User is LOGGED IN
    if (profile) {
      // And they are currently on the home page
      if (location.pathname === "/") {
        // Redirect them to their correct dashboard
        if (profile.role === "ADMIN") {
          navigate("/admin", { replace: true });
        } else if (profile.role === "SM") {
          navigate("/sm", { replace: true });
        } else if (profile.role === "OGL") {
          navigate("/ogl", { replace: true });
        }
      }
    }

    // 2. User is LOGGED OUT
    // This is handled by our <ProtectedRoute> components,
    // which will bounce them back to "/" if they try to
    // access /admin, etc.
  }, [profile, loading, location.pathname, navigate]);

  // This component renders nothing.
  return null;
};
