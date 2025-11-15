import React, { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  // Removed Grid, it's causing errors
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
// Removed getFunctions, httpsCallable as we get 'functions' from ../firebase
import { db, functions } from "../firebase"; // Import our pre-configured instances
import { httpsCallable } from "firebase/functions"; // We only need this import for the *type*
import { doc, getDoc } from "firebase/firestore";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SecurityIcon from "@mui/icons-material/Security";
import InfoIcon from "@mui/icons-material/Info";

export const ProfilePage: FC = () => {
  const { profile, currentUser } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  // Fetched names
  const [stationName, setStationName] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  // Forms State
  // We initialize state, but we'll use an effect to update it if the profile re-loads
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [email, setEmail] = useState(currentUser?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- 1. DATA FETCHING (Cleaned up) ---
  useEffect(() => {
    // Fetch Station Name
    if (profile?.role === "SM" && profile.selectedStationId) {
      getDoc(doc(db, "stations", profile.selectedStationId)).then((snap) => {
        if (snap.exists()) setStationName(snap.data().name);
      });
    }
    // Fetch Group Name
    if (profile?.role === "OGL" && profile.groupId) {
      getDoc(doc(db, "groups", profile.groupId)).then((snap) => {
        if (snap.exists()) setGroupName(snap.data().name);
      });
    }
  }, [profile]); // Re-run if profile object changes

  // --- NEW: Sync local form state if profile changes ---
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
    }
    if (currentUser) {
      setEmail(currentUser.email || "");
    }
  }, [profile, currentUser]);

  const clearForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  const reauthenticate = async () => {
    if (!currentUser?.email) throw new Error("No user email.");
    const cred = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(currentUser, cred);
  };

  // --- 2. FORM HANDLERS ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Use the 'functions' instance we imported from ../firebase
      const updateFn = httpsCallable(functions, "updateUserProfile");
      await updateFn({ displayName, username });
      setSuccess("Profile info updated!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await reauthenticate();

      if (email !== currentUser?.email) {
        const emailFn = httpsCallable(functions, "updateUserEmail");
        await emailFn({ email });
      }

      if (newPassword) {
        if (newPassword !== confirmPassword)
          throw new Error("Passwords do not match.");
        await updatePassword(currentUser!, newPassword);
      }

      setSuccess("Account security updated!");
      clearForm();
    } catch (err: any) {
      setError(err.message || "Failed to update security.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Paper sx={{ overflow: "hidden", borderRadius: 3, boxShadow: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            variant="fullWidth"
            aria-label="Profile tabs"
          >
            <Tab icon={<InfoIcon />} iconPosition="start" label="My Info" />
            <Tab
              icon={<AccountCircleIcon />}
              iconPosition="start"
              label="Edit Profile"
            />
            <Tab
              icon={<SecurityIcon />}
              iconPosition="start"
              label="Security"
            />
          </Tabs>
        </Box>

        {/* --- TAB 1: INFO (FIXED WITH CSS GRID) --- */}
        <Box sx={{ p: 4, display: tabIndex === 0 ? "block" : "none" }}>
          <Typography variant="h5" gutterBottom>
            Hi, {profile?.displayName || "User"}!
          </Typography>
          <Divider sx={{ my: 2 }} />
          {/* Replaced buggy MUI Grid with CSS Grid for simple layout */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr", // 33% / 66% split
              gap: 1,
              alignItems: "center",
            }}
          >
            <Typography color="text.secondary">Role</Typography>
            <Typography>
              <strong>{profile?.role}</strong>
            </Typography>

            <Typography color="text.secondary">Login Email</Typography>
            <Typography>
              <strong>{currentUser?.email}</strong>
            </Typography>

            <Typography color="text.secondary">Username</Typography>
            <Typography>
              <strong>{profile?.username || "Not set"}</strong>
            </Typography>

            {profile?.role === "OGL" && (
              <>
                <Typography color="text.secondary">Group</Typography>
                <Typography>
                  <strong>{groupName || "..."}</strong>
                </Typography>
              </>
            )}
            {profile?.role === "SM" && (
              <>
                <Typography color="text.secondary">Station</Typography>
                <Typography>
                  <strong>{stationName || "..."}</strong>
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* --- TAB 2: EDIT PROFILE --- */}
        <Box sx={{ p: 4, display: tabIndex === 1 ? "block" : "none" }}>
          <Typography variant="h6" gutterBottom>
            Edit Public Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This information is visible to Admins.
          </Typography>
          <Box
            component="form"
            onSubmit={handleUpdateProfile}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              helperText="Your SM-01 / OGL-01 ID. This is how you log in without an email."
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ alignSelf: "flex-start" }}
            >
              {loading ? <CircularProgress size={24} /> : "Save Profile"}
            </Button>
          </Box>
        </Box>

        {/* --- TAB 3: ACCOUNT SECURITY --- */}
        <Box sx={{ p: 4, display: tabIndex === 2 ? "block" : "none" }}>
          <Typography variant="h6" gutterBottom>
            Account Security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To change your email or password, please re-enter your current
            password first.
          </Typography>
          <Box
            component="form"
            onSubmit={handleUpdateSecurity}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              fullWidth
              required
            />
            <Divider sx={{ my: 1 }} />
            <TextField
              label="New Login Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="New Password (optional)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              error={confirmPassword !== "" && newPassword !== confirmPassword}
              helperText={
                confirmPassword !== "" && newPassword !== confirmPassword
                  ? "Passwords do not match."
                  : ""
              }
            />
            {error && <Alert severity="error">{error}</Alert>}
            {/* --- FIXED TYPO: VMRt -> Alert --- */}
            {success && <Alert severity="success">{success}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !currentPassword}
              sx={{ alignSelf: "flex-start" }}
            >
              {loading ? <CircularProgress size={24} /> : "Update Security"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
