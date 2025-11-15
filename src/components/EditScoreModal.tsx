import { useState } from "react";
import type { FC } from "react";
import {
  TextField,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// const style = {
//   position: "absolute" as "absolute",
//   top: "50%",
//   left: "50%",
//   transform: "translate(-50%, -50%)",
//   width: { xs: "90%", sm: 400 },
//   bgcolor: "background.paper",
//   border: "2px solid #000",
//   boxShadow: 24,
//   p: 4,
//   display: "flex",
//   flexDirection: "column",
//   gap: 2,
// };

interface GroupData {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group: GroupData | null;
}

export const EditScoreModal: FC<Props> = ({
  open,
  onClose,
  onSuccess,
  group,
}) => {
  // --- 1. STATE CHANGED TO STRING ---
  const [points, setPoints] = useState(""); // Was 0

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    // --- 2. RESET TO EMPTY STRING ---
    setPoints(""); // Was 0
    setReason("");
    setError(null);
  };

  const handleSubmit = async () => {
    // --- 3. PARSE THE STRING INTO A NUMBER ---
    const pointsNum = parseInt(points, 10);

    // Check if the result is a valid number and not zero
    if (!group || !reason || isNaN(pointsNum) || pointsNum === 0) {
      setError("Points (cannot be 0) and Reason are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updateScoreFn = httpsCallable(functions, "adminUpdateScore");
      await updateScoreFn({ groupId: group.id, points: pointsNum, reason });
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error updating score.");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. VALIDATION LOGIC FOR BUTTON ---
  // Check if points is a valid, non-zero number
  const pointsAsNum = parseInt(points, 10);
  const isValidPoints = !isNaN(pointsAsNum) && pointsAsNum !== 0;
  const canSubmit = !loading && isValidPoints && !!reason;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Update Score for {group?.name}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Manually add or subtract points. This action will be logged.
        </DialogContentText>
        <TextField
          autoFocus
          label="Points to Add/Subtract (e.g., 50 or -20)"
          // --- 5. CHANGED TO 'text' but with 'decimal' input mode ---
          type="text"
          inputMode="decimal" // Gives mobile users a number-like pad
          fullWidth
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Reason for change"
          fullWidth
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., 'Correcting SM typo for Bishan station.'"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit} // Use our new validation
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={24} /> : "Submit Correction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
