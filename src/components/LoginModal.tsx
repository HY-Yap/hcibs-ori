import React, { useState } from "react";
import { Modal, Box, Typography, TextField, Button } from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // We only need auth
import { db } from "../firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

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

  // Create a helper to close the modal and reset state
  const handleClose = () => {
    onClose();
    setError("");
    setEmailOrUsername("");
    setPassword("");
  };

  const handleLogin = async () => {
    setError("");

    let email = emailOrUsername.trim();
    try {
      // If user typed a username (no @), look up their email in Firestore
      if (!email.includes("@")) {
        const q = query(
          collection(db, "users"),
          where("username", "==", email),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setError("No account found for that username.");
          return;
        }
        const userData = snap.docs[0].data() as any;
        // try common email fields
        email = userData.email || userData.emailAddress || userData.authEmail;
        if (!email) {
          setError("Found user but no email is associated with that username.");
          return;
        }
      }

      try {
        // 1. Sign in the user
        await signInWithEmailAndPassword(auth, email, password);

        // 2. That's it! Just close the modal.
        handleClose();
        // The AuthContext will automatically see the login
        // and update the Header for us.
      } catch (err) {
        console.error(err);
        // show firebase error if available, otherwise generic
        setError((err as any)?.message || "Failed to login. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to login. Please check your email and password.");
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
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        >
          Sign In
        </Button>
      </Box>
    </Modal>
  );
};
