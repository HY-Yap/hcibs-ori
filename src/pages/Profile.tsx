import { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import type { User } from "firebase/auth";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const ProfilePage: FC = () => {
  const { profile, currentUser } = useAuth();

  // fetched display names for station/group
  const [fetchedStationName, setFetchedStationName] = useState<string | null>(null);
  const [fetchedGroupName, setFetchedGroupName] = useState<string | null>(null);

  // derive IDs safely (SM uses selectedStationId, OGL uses groupId)
  const selectedStationId =
    (profile as any)?.selectedStationId || (profile as any)?.stationId || null;
  const profileGroupId = profile?.groupId || null;

  useEffect(() => {
    setFetchedStationName(null);
    if (!selectedStationId) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "stations", String(selectedStationId)));
        if (!cancelled) {
          setFetchedStationName(
            snap.exists() ? ((snap.data() as any).name || String(selectedStationId)) : String(selectedStationId)
          );
        }
      } catch {
        if (!cancelled) setFetchedStationName(String(selectedStationId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStationId]);

  useEffect(() => {
    setFetchedGroupName(null);
    if (!profileGroupId) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "groups", String(profileGroupId)));
        if (!cancelled) {
          setFetchedGroupName(
            snap.exists() ? ((snap.data() as any).name || String(profileGroupId)) : String(profileGroupId)
          );
        }
      } catch {
        if (!cancelled) setFetchedGroupName(String(profileGroupId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileGroupId]);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Safely derive display name and username using profile and currentUser
  const displayName =
    profile?.displayName ||
    (currentUser as User | null)?.displayName ||
    (profile as any)?.username ||
    "User";
  const role = profile?.role || "—";
  const email = currentUser?.email || "—";
  const username =
    (profile as any)?.username || (currentUser as User | null)?.uid || "—";

  // conditional fields — prefer fetched names, fallback to profile values / ids
  const oglGroup = fetchedGroupName || (profile as any)?.groupName || profile?.groupId || null;
  const smStation =
    fetchedStationName ||
    (profile as any)?.stationName ||
    selectedStationId ||
    (profile as any)?.station ||
    null;

  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const canSubmit =
    !loading && currentPassword !== "" && newPassword !== "" && passwordsMatch;

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentUser || !currentUser.email) {
      setError("Unable to change password: no signed-in user found.");
      return;
    }

    // narrow currentUser to firebase User for TypeScript
    const user = currentUser as User;

    if (!canSubmit) {
      setError("Please fill out the form correctly. Ensure passwords match.");
      return;
    }

    setLoading(true);
    try {
      // assert email is non-null (we already checked above)
      const cred = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      // Prefer friendly messages when possible
      const msg =
        err?.message ||
        (err?.code ? `Error: ${String(err.code)}` : "Failed to change password.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, px: 2, display: "grid", gap: 3 }}>
      {/* Profile header */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {displayName}
        </Typography>

        <Typography variant="body1" sx={{ mt: 1 }}>
          Role: <strong>{role}</strong>
        </Typography>
        <Typography variant="body1">
          Email: <strong>{email}</strong>
        </Typography>
        <Typography variant="body1">
          Username: <strong>{username}</strong>
        </Typography>

        {role === "OGL" && oglGroup && (
          <Typography variant="body1">
            Group: <strong>{oglGroup}</strong>
          </Typography>
        )}

        {role === "SM" && smStation && (
          <Typography variant="body1">
            Station: <strong>{smStation}</strong>
          </Typography>
        )}
      </Paper>

      {/* Account settings: change password */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account settings
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Change your account password. You must verify your current password to
          proceed.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "1fr",
            mt: 1,
          }}
        >
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            required
            autoComplete="current-password"
          />

          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
          />

          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            error={confirmPassword !== "" && !passwordsMatch}
            helperText={
              confirmPassword !== "" && !passwordsMatch
                ? "Passwords do not match."
                : ""
            }
            autoComplete="new-password"
          />

          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleChangePassword}
              disabled={!canSubmit}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Change Password"}
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
                setSuccess(null);
              }}
            >
              Reset
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export { ProfilePage };
export default ProfilePage;
