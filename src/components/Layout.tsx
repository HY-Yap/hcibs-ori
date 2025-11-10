import React, { useEffect, useState } from "react";
import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Snackbar, Alert, Box, Typography } from "@mui/material";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export const Layout: FC = () => {
  const { currentUser } = useAuth();
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  // --- NEW: Track when this user loaded the app ---
  const [loadTime] = useState(() => new Date());

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "announcements"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestDoc = snapshot.docs[0];
        const latestData = latestDoc.data();
        const msgTime = latestData.timestamp?.toDate();

        // --- UPDATED CHECK ---
        // Only show toast if:
        // 1. It's a different message than the last one we saw
        // 2. AND it was created AFTER we loaded the app (filters out old messages on reset)
        if (
          lastMessageId &&
          latestDoc.id !== lastMessageId &&
          msgTime &&
          msgTime > loadTime
        ) {
          setToastMessage(latestData.message);
          setToastOpen(true);
        }
        setLastMessageId(latestDoc.id);
      }
    });

    return () => unsubscribe();
  }, [currentUser, lastMessageId, loadTime]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <Box
        component="main"
        sx={{ flex: 1, p: { xs: 2, md: 4 }, bgcolor: "#f8f9fa" }}
      >
        <Outlet />
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: { xs: 7, sm: 8 } }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="warning"
          variant="filled"
          sx={{
            width: "100%",
            boxShadow: 3,
            fontWeight: "bold",
            "& .MuiAlert-message": {
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxWidth: "600px",
            },
          }}
        >
          <span>📢 NEW ANNOUNCEMENT:</span>
          <br />
          <Typography
            variant="body2"
            component="span"
            sx={{ fontWeight: "normal" }}
          >
            {toastMessage}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};
