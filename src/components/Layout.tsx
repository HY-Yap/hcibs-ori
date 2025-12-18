import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { HelpRequestModal } from "./HelpRequestModal";

export const Layout: FC = () => {
  const { profile } = useAuth(); // Removed currentUser, not needed for layout logic anymore

  // REMOVED: Global announcement listener (Yellow Toast) to fix duplicates

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <Box
        component="main"
        sx={{ flex: 1, p: { xs: 2, md: 4 }, bgcolor: "#f8f9fa" }}
      >
        <Outlet />
      </Box>

      <HelpRequestModal />

      {/* REMOVED: Snackbar component */}

      {/* Admin Tools Section */}
      {profile?.role === "ADMIN" && (
        <Box
          component="nav"
          sx={{
            bgcolor: "#fff",
            borderTop: "1px solid #e0e0e0",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* REMOVED: Manage Announcements link from here */}
        </Box>
      )}
    </Box>
  );
};
