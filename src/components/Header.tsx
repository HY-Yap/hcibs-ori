import React, { useState, Fragment } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import { LoginModal } from "./LoginModal";
import { useAuth } from "../context/AuthContext"; // <-- 1. We need this
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// --- 2. DEFINE ALL OUR LINKS ---

// Links for Guests (not logged in)
const guestNavLinks = [
  { name: "Home", path: "/" },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Stations", path: "/stations" },
  { name: "Side Quests", path: "/sidequests" },
];

// Links for a logged-in Admin
const adminNavLinks = [
  { name: "Admin Dashboard", path: "/admin" },
  { name: "Manage Users", path: "/admin/users" },
  { name: "Manage Stations", path: "/admin/stations" },
  { name: "Manage Side Quests", path: "/admin/sidequests" },
  // We'll add 'Game Control', 'Score Log', etc. here later
];

// We'll add OGL and SM links later
// const oglNavLinks = [ ... ];
// const smNavLinks = [ ... ];

export const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);

  const { currentUser, profile } = useAuth(); // <-- 3. Get the user and their role

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // --- 4. CHOOSE THE RIGHT LINKS ---
  let navLinks = guestNavLinks; // Start with guest links

  if (profile?.role === "ADMIN") {
    // Add the admin links AFTER the guest links
    navLinks = [...guestNavLinks, ...adminNavLinks];
  }
  // else if (profile?.role === 'OGL') {
  //   navLinks = [...guestNavLinks, ...oglNavLinks];
  // }
  // else if (profile?.role === 'SM') {
  //   navLinks = [...guestNavLinks, ...smNavLinks];
  // }

  const handleLoginOpen = () => {
    setLoginOpen(true);
  };

  const handleLoginClose = () => {
    setLoginOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  // This is the content of the mobile "drawer" (hamburger menu)
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        HCIBSO Amazing Race
      </Typography>
      <List>
        {/* 5. Use the DYNAMIC navLinks here */}
        {navLinks.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              sx={{ textAlign: "center" }}
            >
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
        {/* Show Login or Logout */}
        <ListItem disablePadding>
          {currentUser ? (
            <ListItemButton
              onClick={handleLogout}
              sx={{ textAlign: "center", justifyContent: "center" }}
            >
              <Button variant="contained" color="secondary">
                Logout
              </Button>
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={handleLoginOpen}
              sx={{ textAlign: "center", justifyContent: "center" }}
            >
              <Button variant="contained" color="primary">
                Login
              </Button>
            </ListItemButton>
          )}
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Fragment>
      {" "}
      {/* Changed from <> to Fragment for clarity */}
      <Box sx={{ display: "flex" }}>
        <AppBar component="nav" position="static">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
            >
              HCIBSO Amazing Race
            </Typography>

            {/* 6. Use the DYNAMIC navLinks here */}
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              {navLinks.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.path}
                  sx={{ color: "#fff" }}
                >
                  {item.name}
                </Button>
              ))}
            </Box>

            {/* Show Login or Logout */}
            {currentUser ? (
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{ ml: 2, display: { xs: "none", sm: "block" } }}
              >
                Logout
              </Button>
            ) : (
              <Button
                color="inherit"
                onClick={handleLoginOpen}
                sx={{ ml: 2, display: { xs: "none", sm: "block" } }}
              >
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      {!currentUser && (
        <LoginModal open={isLoginOpen} onClose={handleLoginClose} />
      )}
    </Fragment>
  );
};
