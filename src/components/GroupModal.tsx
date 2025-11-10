import { useState } from "react";
import type { FC } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";

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

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupModal: FC<Props> = ({ open, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Remember: Use the correct region!
      const functions = getFunctions(undefined, "asia-southeast1");
      const createGroupFn = httpsCallable(functions, "createGroup");
      await createGroupFn({ name });
      onSuccess();
      onClose();
      setName("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error creating group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6">Add New Group</Typography>
        <TextField
          label="Group Name (e.g. Group 1)"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          fullWidth
          disabled={loading || !name}
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={24} /> : "Create Group"}
        </Button>
      </Box>
    </Modal>
  );
};
