import React, { useState } from "react";
import type { FC } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  maxHeight: "90vh",
  overflowY: "auto", // In case description is long
};

interface StationModalProps {
  open: boolean;
  onClose: () => void;
  onStationAdded: () => void;
}

export const StationModal: FC<StationModalProps> = ({
  open,
  onClose,
  onStationAdded,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"manned" | "unmanned" | "">("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setName("");
    setType("");
    setLocation("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(undefined, "asia-southeast1"); // Ensure correct region!
      const createStationFn = httpsCallable(functions, "createStation");
      await createStationFn({ name, type, location, description });
      onStationAdded();
      handleClose();
    } catch (err: any) {
      console.error("Error creating station:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          Add New Station
        </Typography>
        <TextField
          label="Station Name (e.g. Bishan)"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel id="type-label">Type</InputLabel>
          <Select
            labelId="type-label"
            value={type}
            label="Type"
            onChange={(e) =>
              setType(e.target.value as "manned" | "unmanned" | "")
            }
          >
            <MenuItem value="manned">Manned (Has SM)</MenuItem>
            <MenuItem value="unmanned">Unmanned (Task only)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Location (Optional)"
          variant="outlined"
          fullWidth
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Junction 8 Roof"
        />
        <TextField
          label="Task Description"
          variant="outlined"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Only shown to OGLs if Unmanned."
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !name || !type}
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={24} /> : "Add Station"}
        </Button>
      </Box>
    </Modal>
  );
};
