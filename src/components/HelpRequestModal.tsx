import React, { useState } from "react";
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tooltip,
} from "@mui/material";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export const HelpRequestModal: React.FC = () => {
  const { profile, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  // Only show for OGL or SM
  if (!profile || (profile.role !== "OGL" && profile.role !== "SM")) {
    return null;
  }

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setTitle("");
    setDetails("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !details.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "requests"), {
        title: title.trim(),
        details: details.trim(),
        timestamp: serverTimestamp(),
        status: "OPEN",
        sentByUid: currentUser?.uid || "UNKNOWN",
        sentByName: profile.displayName,
        groupId: profile.groupId || null,
        senderRole: profile.role,
        selectedStationId: (profile as any).selectedStationId || null,
      });
      handleClose();
      alert("Help request submitted.");
    } catch (error) {
      console.error("Error sending help request:", error);
      alert("Failed to send help request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Request Help">
        <Fab
          color="primary"
          aria-label="help"
          onClick={handleOpen}
          sx={{
            position: "fixed",
            bottom: 24,
            left: 40,
            zIndex: 1300, // High z-index to be on top of everything
          }}
        >
          <QuestionMarkIcon />
        </Fab>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Request Help</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Details"
              variant="outlined"
              fullWidth
              required
              multiline
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !title.trim() || !details.trim()}
          >
            {loading ? "Sending..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
