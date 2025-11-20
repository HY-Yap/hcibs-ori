import { useState, useEffect } from "react";
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
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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

export interface HouseData {
  id?: string;
  name: string;
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: HouseData | null; // <-- NEW: For editing
}

export const HouseModal: FC<Props> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- POPULATE FORM ---
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setColor(initialData.color);
    } else if (open && !initialData) {
      setName("");
      setColor("#000000");
    }
    setError(null);
  }, [open, initialData]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use our pre-configured functions instance

      if (initialData?.id) {
        // UPDATE existing
        const updateFn = httpsCallable(functions, "updateHouse");
        await updateFn({ id: initialData.id, name, color });
      } else {
        // CREATE new
        const createFn = httpsCallable(functions, "createHouse");
        await createFn({ name, color });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving house.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6">
          {initialData ? "Edit House" : "Add New House"}
        </Typography>

        <TextField
          label="House Name (e.g. Gryffindor)"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography>House Color:</Typography>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ height: 40, width: 60, cursor: "pointer" }}
          />
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          fullWidth
          disabled={loading || !name}
          onClick={handleSubmit}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : initialData ? (
            "Update House"
          ) : (
            "Create House"
          )}
        </Button>
      </Box>
    </Modal>
  );
};
