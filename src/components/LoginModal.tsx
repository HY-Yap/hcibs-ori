import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, functions } from "../firebase"; // <-- Import 'functions'
import { httpsCallable } from "firebase/functions";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 400 },
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state

  const handleClose = () => {
    onClose();
    setError("");
    setEmailOrUsername("");
    setPassword("");
    setLoading(false);
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    let emailToLogin = emailOrUsername.trim();

    try {
      // 1. If it's not an email, ask the server to find the email
      if (!emailToLogin.includes("@")) {
        try {
          const getUserEmailFn = httpsCallable(
            functions,
            "getUserEmailFromUsername"
          );
          // Note: Ensure 'getUserEmailFromUsername' exists in your functions/src/index.ts!
          const result = await getUserEmailFn({ username: emailToLogin });
          emailToLogin = (result.data as any).email;
        } catch (err: any) {
          // If the function fails (e.g., user not found), throw specific error
          if (err.message) throw new Error(err.message);
          throw new Error("Could not find a user with that username.");
        }
      }

      // 2. Sign in using the resolved email
      await signInWithEmailAndPassword(auth, emailToLogin, password);

      handleClose();
    } catch (err: any) {
      console.error(err);
      // Handle specific firebase errors for better UX
      if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found.");
      } else {
        setError(err.message || "Failed to login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="login-modal-title"
    >
      <Box sx={style}>
        <Typography id="login-modal-title" variant="h6" component="h2">
          Login
        </Typography>

        <TextField
          label="Email or Username"
          variant="outlined"
          fullWidth
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          disabled={loading}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {error && (
          <Typography color="error" sx={{ textAlign: "center" }}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleLogin}
          disabled={loading || !emailOrUsername || !password}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
        </Button>
      </Box>
    </Modal>
  );
};
