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
  Divider,
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
  type: "manned" | "unmanned" | "ending_location";
  description: string;
  location: string;
  points?: number;
  status?: string;
  travelingCount?: number;
  arrivedCount?: number;
  hasSecondStage?: boolean;
  secondDescription?: string;
  area?: string;
}

interface StationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: StationData | null;
  existingAreas: string[]; // ADDED: List of existing areas
}

export const StationModal: FC<StationModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
  existingAreas,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"manned" | "unmanned" | "ending_location" | "">("");
  const [points, setPoints] = useState(50);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  
  // Area State
  const [areaSelection, setAreaSelection] = useState(""); 
  const [customAreaName, setCustomAreaName] = useState("");

  const [hasSecondStage, setHasSecondStage] = useState(false);
  const [secondDescription, setSecondDescription] = useState("");

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
      setPoints(initialData.points || 0);
      
      // Handle Area Population
      const currentArea = initialData.area || "Others";
      setAreaSelection(currentArea);
      setCustomAreaName("");

      setHasSecondStage(initialData.hasSecondStage || false);
      setSecondDescription(initialData.secondDescription || "");
    } else if (open && !initialData) {
      // Reset if creating new
      setName("");
      setType("");
      setLocation("");
      setDescription("");
      setStatus("OPEN");
      setPoints(0);
      
      setAreaSelection(""); // Force user to choose
      setCustomAreaName("");
      
      setHasSecondStage(false);
      setSecondDescription("");
    }
    setError(null);
  }, [open, initialData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Determine Final Area
    let finalArea = areaSelection;
    if (areaSelection === "__NEW__") {
      if (!customAreaName.trim()) {
        setError("Please enter a name for the new area.");
        setSaving(false);
        return;
      }
      finalArea = customAreaName.trim();
    }
    if (!finalArea) {
      setError("Please select an Area.");
      setSaving(false);
      return;
    }

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
          points,
          area: finalArea,
          hasSecondStage,
          secondDescription,
        });
      } else {
        // CREATE new
        const createFn = httpsCallable(functions, "createStation");
        await createFn({ 
          name, 
          type, 
          location, 
          description, 
          points,
          area: finalArea,
          hasSecondStage,
          secondDescription,
        });
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

  // Prepare Area Options: Unique list + "Others" + "Create New"
  const areaOptions = Array.from(new Set([...existingAreas, "Others"])).sort();

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
              setType(e.target.value as "manned" | "unmanned" | "ending_location" | "")
            }
          >
            <MenuItem value="manned">Manned (Has SM)</MenuItem>
            <MenuItem value="unmanned">Unmanned (Task only)</MenuItem>
            <MenuItem value="ending_location">Ending Location</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Points"
          type="number"
          fullWidth
          margin="normal"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          required
          inputProps={{ min: 0 }}
          helperText="Points awarded for completing this station. For manned stations, this is the maximum points."
        />
        <TextField
          label="Location (Optional)"
          variant="outlined"
          fullWidth
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Junction 8 Roof"
        />
        
        {/* AREA SELECTION */}
        <FormControl fullWidth required>
          <InputLabel id="area-label">Area</InputLabel>
          <Select
            labelId="area-label"
            value={areaSelection}
            label="Area"
            onChange={(e) => setAreaSelection(e.target.value)}
          >
            {areaOptions.map((area) => (
              <MenuItem key={area} value={area}>
                {area}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem value="__NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
              + Create New Area...
            </MenuItem>
          </Select>
        </FormControl>

        {areaSelection === "__NEW__" && (
          <TextField
            label="New Area Name"
            variant="outlined"
            fullWidth
            value={customAreaName}
            onChange={(e) => setCustomAreaName(e.target.value)}
            placeholder="e.g. North-East Line Area"
            autoFocus
          />
        )}

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

        {/* 2nd Stage Configuration */}
        <FormControl fullWidth>
          <InputLabel id="second-stage-label">2nd Stage</InputLabel>
          <Select
            labelId="second-stage-label"
            value={hasSecondStage ? "yes" : "no"}
            label="2nd Stage"
            onChange={(e) => setHasSecondStage(e.target.value === "yes")}
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </Select>
        </FormControl>

        {hasSecondStage && (
          <TextField
            label="2nd Description"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={secondDescription}
            onChange={(e) => setSecondDescription(e.target.value)}
            placeholder="Description for the 2nd stage."
          />
        )}

        {/* Status selector shown when editing (or always if you prefer) */}
        <FormControl fullWidth>
          <InputLabel id="station-status-label">Status</InputLabel>
          <Select
            labelId="station-status-label"
            value={status}
            label="Status"
            onChange={(e) =>
              setStatus(
                e.target.value as
                  | "OPEN"
                  | "LUNCH_SOON"
                  | "CLOSED_LUNCH"
                  | "CLOSED_PERMANENTLY"
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
