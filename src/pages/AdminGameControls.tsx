import { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from "@mui/material";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import WarningIcon from "@mui/icons-material/Warning";
import SettingsIcon from "@mui/icons-material/Settings";

export const AdminGameControls: FC = () => {
  const [gameStatus, setGameStatus] = useState<"RUNNING" | "STOPPED" | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "config"), (docSnap) => {
      if (docSnap.exists()) setGameStatus(docSnap.data().status);
      else setGameStatus("STOPPED");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleStatus = async (newStatus: "RUNNING" | "STOPPED") => {
    setActionLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "toggleGameStatus"
      );
      await fn({ status: newStatus });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetGame = async () => {
    if (resetConfirm !== "RESET") return;
    setActionLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "resetGame"
      );
      await fn();
      setResetOpen(false);
      setResetConfirm("");
      alert("Game has been reset.");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    // --- ADDED textAlign: 'center' TO MAIN BOX ---
    <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          mb: 4,
        }}
      >
        <SettingsIcon fontSize="large" /> Game Controls
      </Typography>

      <Paper
        sx={{
          p: 4,
          mb: 4,
          bgcolor: gameStatus === "RUNNING" ? "#e8f5e9" : "#ffebee",
        }}
      >
        <Typography variant="h6" gutterBottom>
          CURRENT STATUS
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            color: gameStatus === "RUNNING" ? "success.main" : "error.main",
            mb: 3,
          }}
        >
          {gameStatus}
        </Typography>
        {gameStatus === "STOPPED" ? (
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<PlayArrowIcon />}
            disabled={actionLoading}
            onClick={() => handleToggleStatus("RUNNING")}
            sx={{ py: 1.5, px: 4, fontSize: "1.2rem" }}
          >
            START GAME
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<StopIcon />}
            disabled={actionLoading}
            onClick={() => handleToggleStatus("STOPPED")}
            sx={{ py: 1.5, px: 4, fontSize: "1.2rem" }}
          >
            STOP GAME
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {gameStatus === "STOPPED"
            ? "OGLs cannot see 'My Journey' or submit quests."
            : "Game is live! OGLs can play."}
        </Typography>
      </Paper>

      <Box
        sx={{
          mt: 8,
          p: 3,
          border: "1px solid #d32f2f",
          borderRadius: 1,
          backgroundColor: "#fff5f5",
        }}
      >
        <Typography
          variant="h5"
          color="error"
          gutterBottom
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <WarningIcon /> Danger Zone
        </Typography>
        <Typography paragraph>
          Resetting the game will{" "}
          <strong>
            delete ALL scores, progress, logs, and uploaded submissions
          </strong>
          . It will return all groups to 0 points and 'IDLE' status and remove
          files stored under the submissions/ prefix in Cloud Storage.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setResetOpen(true)}
        >
          RESET GAME COMPLETELY
        </Button>
      </Box>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle
          sx={{
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <WarningIcon /> RESET EVERYTHING?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontWeight: "bold" }}>
            This action cannot be undone. It will also delete all user-uploaded
            submission files from Cloud Storage.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            placeholder="Type RESET to confirm"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleResetGame}
            color="error"
            variant="contained"
            disabled={actionLoading || resetConfirm !== "RESET"}
          >
            {actionLoading ? (
              <CircularProgress size={24} />
            ) : (
              "I UNDERSTAND, RESET ALL"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
