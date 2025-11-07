import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, Box, Typography } from "@mui/material"; // Import Box and Typography for the 404 page

// Import all our pages
import { HomePage } from "./pages/HomePage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { SmDashboard } from "./pages/SmDashboard";
import { OglDashboard } from "./pages/OglDashboard";
import { AdminUserManagement } from "./pages/AdminUserManagement";
import { LeaderboardPage } from "./pages/Leaderboard";
import { StationsPage } from "./pages/Stations";
import { SideQuestsPage } from "./pages/SideQuests";

// Import all our components
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
// AuthRedirectHandler import is now GONE

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />

      {/* AuthRedirectHandler component is GONE */}

      <Routes>
        <Route path="/" element={<Layout />}>
          {/* GUEST ROUTES (public) */}
          <Route index element={<HomePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="stations" element={<StationsPage />} />
          <Route path="sidequests" element={<SideQuestsPage />} />

          {/* ADMIN ROUTES (protected) */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUserManagement />} />
          </Route>

          {/* SM ROUTES (protected) */}
          <Route element={<ProtectedRoute allowedRoles={["SM"]} />}>
            <Route path="sm" element={<SmDashboard />} />
          </Route>

          {/* OGL ROUTES (protected) */}
          <Route element={<ProtectedRoute allowedRoles={["OGL"]} />}>
            <Route path="ogl" element={<OglDashboard />} />
          </Route>

          {/* "Not Found" page, now also using MUI components */}
          <Route
            path="*"
            element={
              <Box>
                <Typography variant="h4">404 - Page Not Found</Typography>
              </Box>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
