import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, Box, Typography, ThemeProvider } from "@mui/material"; // Import Box and Typography for the 404 page
import { theme } from "./theme";

// Import all our pages
import { HomePage } from "./pages/HomePage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { SmDashboard } from "./pages/SmDashboard";
import { OglDashboard } from "./pages/OglDashboard";
import { AdminUserManagement } from "./pages/AdminUserManagement";
import { LeaderboardPage } from "./pages/Leaderboard";
import { StationsPage } from "./pages/Stations";
import { SideQuestsPage } from "./pages/SideQuests";
import { AdminStationManagement } from "./pages/AdminStationManagement";
import { SideQuestManagement } from "./pages/SideQuestManagement";
import { AdminGroupManagement } from "./pages/AdminGroupManagement";
import { AdminHouseManagement } from "./pages/AdminHouseManagement";
import { OglJourney } from "./pages/OglJourney";
import { OglSideQuests } from "./pages/OglSideQuests";
import { AdminGameControls } from "./pages/AdminGameControls";
import { AdminScoreLog } from "./pages/AdminScoreLog";
import { ProfilePage } from "./pages/Profile";
import { AdminSubmissionGallery } from "./pages/AdminSubmissionGallery";
import { AdminAnnouncementManagement } from "./pages/AdminAnnouncementManagement";
import { AdminRequestManagement } from "./pages/AdminRequestManagement";
import { MRTMapPage } from "./pages/MRTMap";

// Import all our components
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotificationHandler } from "./components/NotificationHandler";
// AuthRedirectHandler import is now GONE

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <CssBaseline />
        <NotificationHandler />
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* GUEST ROUTES (public) */}
            <Route index element={<HomePage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="stations" element={<StationsPage />} />
            <Route path="sidequests" element={<SideQuestsPage />} />
            <Route path="mrt-map" element={<MRTMapPage />} />
            {/* Protected profile route for logged-in roles (ADMIN, SM, OGL) */}
            <Route
              element={<ProtectedRoute allowedRoles={["ADMIN", "SM", "OGL"]} />}
            >
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            {/* ADMIN ROUTES (protected) */}
            <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUserManagement />} />
              <Route path="admin/groups" element={<AdminGroupManagement />} />
              <Route path="admin/houses" element={<AdminHouseManagement />} />
              <Route
                path="admin/stations"
                element={<AdminStationManagement />}
              />
              <Route
                path="admin/sidequests"
                element={<SideQuestManagement />}
              />
              <Route
                path="admin/announcements"
                element={<AdminAnnouncementManagement />}
              />
              <Route
                path="admin/requests"
                element={<AdminRequestManagement />}
              />
              <Route path="admin/controls" element={<AdminGameControls />} />
              <Route path="admin/scorelog" element={<AdminScoreLog />} />
              <Route
                path="admin/submissions"
                element={<AdminSubmissionGallery />}
              />
            </Route>
            {/* SM ROUTES (protected) */}
            <Route element={<ProtectedRoute allowedRoles={["SM"]} />}>
              <Route path="sm" element={<SmDashboard />} />
            </Route>
            {/* OGL ROUTES (protected) */}
            <Route element={<ProtectedRoute allowedRoles={["OGL"]} />}>
              <Route path="ogl" element={<OglDashboard />} />
              <Route path="ogl/journey" element={<OglJourney />} />
              <Route path="ogl/sidequests" element={<OglSideQuests />} />
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
    </ThemeProvider>
  );
}

export default App;
