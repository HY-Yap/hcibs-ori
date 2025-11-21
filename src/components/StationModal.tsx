import { useState, useEffect } from "react";
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
  overflowY: "auto",
};

export interface StationData {
  id?: string;
  name: string;
  type: "manned" | "unmanned";
  location?: string;
  description?: string;
  status?: string;
}

interface StationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: StationData | null; // <-- NEW: For editing
}

export const StationModal: FC<StationModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"manned" | "unmanned" | "">("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<
    "OPEN" | "LUNCH_SOON" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY"
  >("OPEN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- POPULATE FORM ON OPEN (If editing) ---
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setLocation(initialData.location || "");
      setDescription(initialData.description || "");
      setStatus(initialData.status as any);
    } else if (open && !initialData) {
      // Reset if creating new
      setName("");
      setType("");
      setLocation("");
      setDescription("");
      setStatus("OPEN");
    }
    setError(null);
  }, [open, initialData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");

      if (initialData?.id) {
        // UPDATE existing
        const updateFn = httpsCallable(functions, "updateStation");
        await updateFn({
          id: initialData.id,
          name,
          type,
          location,
          description,
        });
      } else {
        // CREATE new
        const createFn = httpsCallable(functions, "createStation");
        await createFn({ name, type, location, description });
      }

      // If editing an existing station and status changed, call updateStationStatus
      if (initialData?.id && status !== initialData?.status) {
        const fn = httpsCallable(functions, "updateStationStatus");
        await fn({ stationId: initialData.id, newStatus: status });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving station:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          {initialData ? "Edit Station" : "Add New Station"}
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
        {/* Status selector shown when editing (or always if you prefer) */}
        <FormControl fullWidth>
          <InputLabel id="station-status-label">Status</InputLabel>
          <Select
            labelId="station-status-label"
            value={status}
            label="Status"
            onChange={(e) =>
              setStatus(
                e.target.value as "OPEN" | "LUNCH_SOON" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY"
              )
            }
          >
            <MenuItem value="OPEN">OPEN</MenuItem>
            <MenuItem value="CLOSED_LUNCH">CLOSED (LUNCH)</MenuItem>
            <MenuItem value="CLOSED_PERMANENTLY">CLOSED (PERMANENTLY)</MenuItem>
          </Select>
        </FormControl>
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !name || !type}
          onClick={handleSave}
        >
          {loading || saving ? (
            <CircularProgress size={24} />
          ) : initialData ? (
            "Update Station"
          ) : (
            "Add Station"
          )}
        </Button>
      </Box>
    </Modal>
  );
};
