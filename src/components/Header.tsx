import React, { useState, Fragment, type MouseEvent } from "react";
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
  Menu,
  MenuItem,
  Collapse,
  Divider,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { LoginModal } from "./LoginModal";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

type MenuItemType =
  | { type: "link"; name: string; path: string }
  | {
      type: "menu";
      name: string;
      items: { name: string; path: string; isDivider?: boolean }[];
    };

const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  // --- GET gameStatus FROM CONTEXT ---
  const { currentUser, profile, gameStatus } = useAuth();
  const navigate = useNavigate();

  const [menuAnchors, setMenuAnchors] = useState<{
    [key: string]: null | HTMLElement;
  }>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState<{
    [key: string]: boolean;
  }>({});

  const handleLoginOpen = () => setLoginOpen(true);
  const handleLoginClose = () => setLoginOpen(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const handleDesktopMenuOpen = (
    event: MouseEvent<HTMLElement>,
    menuName: string
  ) => {
    setMenuAnchors({ ...menuAnchors, [menuName]: event.currentTarget });
  };
  const handleDesktopMenuClose = (menuName: string) => {
    setMenuAnchors({ ...menuAnchors, [menuName]: null });
  };

  const handleMobileMenuToggle = (menuName: string) => {
    setMobileMenuOpen({
      ...mobileMenuOpen,
      [menuName]: !mobileMenuOpen[menuName],
    });
  };

  const universalLinks: MenuItemType[] = [
    { type: "link", name: "Home", path: "/" },
    {
      type: "menu",
      name: "Game Info",
      items: [
        { name: "Station List", path: "/stations" },
        { name: "Side Quest List", path: "/sidequests" },
      ],
    },
    { type: "link", name: "Leaderboard", path: "/leaderboard" },
  ];

  let roleLinks: MenuItemType[] = [];
  if (profile?.role === "ADMIN") {
    roleLinks = [
      { type: "link", name: "Dashboard", path: "/admin" },
      {
        type: "menu",
        name: "Admin Tools",
        items: [
          // { name: "Live Status (Mission Control)", path: "/admin/status" },
          // { name: "DIVIDER", path: "", isDivider: true },
          { name: "Manage Users", path: "/admin/users" },
          { name: "Manage Groups", path: "/admin/groups" },
          { name: "Manage Stations", path: "/admin/stations" },
          { name: "Manage Side Quests", path: "/admin/sidequests" },
          { name: "DIVIDER", path: "", isDivider: true },
          { name: "Game Controls", path: "/admin/controls" },
          { name: "Score Log", path: "/admin/scorelog" },
          { name: "Submission Gallery", path: "/admin/submissions" },
        ],
      },
    ];
  } else if (profile?.role === "SM") {
    roleLinks = [{ type: "link", name: "My Station", path: "/sm" }];
  } else if (profile?.role === "OGL") {
    roleLinks = [{ type: "link", name: "My Dashboard", path: "/ogl" }];
    // --- ONLY SHOW THESE IF GAME IS RUNNING ---
    if (gameStatus === "RUNNING") {
      roleLinks.push({
        type: "link",
        name: "My Journey",
        path: "/ogl/journey",
      });
      roleLinks.push({
        type: "link",
        name: "Side Quests",
        path: "/ogl/sidequests",
      });
    }
  }

  // NEW: ensure "My Profile" appears in the menu for logged-in SM / OGL / ADMIN
  if (profile?.role && ["SM", "OGL", "ADMIN"].includes(profile.role)) {
    roleLinks.unshift({ type: "link", name: "My Profile", path: "/profile" });
  }
  const allLinks = [...universalLinks, ...roleLinks];

  const drawer = (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }} onClick={handleDrawerToggle}>
        HCIBSO Amazing Race
      </Typography>
      <Divider />
      <List>
        {allLinks.map((item) => {
          if (item.type === "link") {
            return (
              <ListItem key={item.name} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={handleDrawerToggle}
                  sx={{ textAlign: "center" }}
                >
                  <ListItemText primary={item.name} />
                </ListItemButton>
              </ListItem>
            );
          } else {
            const isOpen = mobileMenuOpen[item.name] || false;
            return (
              <Fragment key={item.name}>
                <ListItemButton
                  onClick={() => handleMobileMenuToggle(item.name)}
                  sx={{ textAlign: "center", justifyContent: "center" }}
                >
                  <ListItemText primary={item.name} />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List
                    component="div"
                    disablePadding
                    sx={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                  >
                    {item.items.map((subItem, index) =>
                      subItem.isDivider ? (
                        <Divider key={index} />
                      ) : (
                        <ListItemButton
                          key={subItem.name}
                          component={Link}
                          to={subItem.path}
                          onClick={handleDrawerToggle}
                          sx={{ pl: 4, textAlign: "center" }}
                        >
                          <ListItemText primary={subItem.name} />
                        </ListItemButton>
                      )
                    )}
                  </List>
                </Collapse>
              </Fragment>
            );
          }
        })}
        <Divider sx={{ my: 2 }} />
        <ListItem disablePadding>
          {currentUser ? (
            <ListItemButton
              onClick={() => {
                handleLogout();
                handleDrawerToggle();
              }}
              sx={{ justifyContent: "center" }}
            >
              <Button variant="contained" color="secondary" fullWidth>
                Logout
              </Button>
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={() => {
                handleLoginOpen();
                handleDrawerToggle();
              }}
              sx={{ justifyContent: "center" }}
            >
              <Button variant="contained" color="primary" fullWidth>
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
      <AppBar component="nav" position="sticky">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              display: { xs: "block", sm: "block" },
              textDecoration: "none",
              color: "inherit",
            }}
          >
            HCIBSO Amazing Race
          </Typography>

          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 1,
              alignItems: "center",
            }}
          >
            {allLinks.map((item) => {
              if (item.type === "link") {
                return (
                  <Button
                    key={item.name}
                    component={Link}
                    to={item.path}
                    sx={{ color: "#fff" }}
                  >
                    {item.name}
                  </Button>
                );
              } else {
                return (
                  <Fragment key={item.name}>
                    <Button
                      color="inherit"
                      endIcon={<ExpandMore />}
                      onClick={(e) => handleDesktopMenuOpen(e, item.name)}
                    >
                      {item.name}
                    </Button>
                    <Menu
                      anchorEl={menuAnchors[item.name]}
                      open={Boolean(menuAnchors[item.name])}
                      onClose={() => handleDesktopMenuClose(item.name)}
                    >
                      {item.items.map((subItem, index) =>
                        subItem.isDivider ? (
                          <Divider key={index} />
                        ) : (
                          <MenuItem
                            key={subItem.name}
                            component={Link}
                            to={subItem.path}
                            onClick={() => handleDesktopMenuClose(item.name)}
                          >
                            {subItem.name}
                          </MenuItem>
                        )
                      )}
                    </Menu>
                  </Fragment>
                );
              }
            })}

            {currentUser ? (
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{ ml: 2, border: "1px solid rgba(255,255,255,0.5)" }}
              >
                Logout
              </Button>
            ) : (
              <Button
                color="inherit"
                onClick={handleLoginOpen}
                sx={{ ml: 2, border: "1px solid white" }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
        }}
      >
        {drawer}
      </Drawer>

      {!currentUser && (
        <LoginModal open={isLoginOpen} onClose={handleLoginClose} />
      )}
    </Fragment>
  );
};

export { Header };
