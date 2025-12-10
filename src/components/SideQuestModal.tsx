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
  FormControlLabel,
  Checkbox,
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

// Define the data shape here so we can use it in props
export interface SideQuestData {
  id?: string;
  name: string;
  description: string;
  points: number;
  submissionType: "none" | "photo" | "video";
  isSmManaged: boolean;
  // ADDED
  hasSecondStage?: boolean;
  secondSubmissionType?: "none" | "photo" | "video";
  secondDescription?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: SideQuestData | null; // <-- NEW: Optional data for editing
}

export const SideQuestModal: FC<Props> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(50);
  const [submissionType, setSubmissionType] = useState<"none" | "photo" | "video">("none");
  const [isSmManaged, setIsSmManaged] = useState(false);
  // ADDED
  const [hasSecondStage, setHasSecondStage] = useState(false);
  const [secondSubmissionType, setSecondSubmissionType] = useState<"none" | "photo" | "video">("none");
  const [secondDescription, setSecondDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Populate form when opening in "Edit Mode" ---
  useEffect(() => {
    if (open && initialData) {
      // Edit Mode: Fill the form
      setName(initialData.name);
      setDescription(initialData.description);
      setPoints(initialData.points);
      setSubmissionType(initialData.submissionType);
      setIsSmManaged(initialData.isSmManaged);
      // ADDED
      setHasSecondStage(initialData.hasSecondStage || false);
      setSecondSubmissionType(initialData.secondSubmissionType || "none");
      setSecondDescription(initialData.secondDescription || "");
    } else if (open && !initialData) {
      // Create Mode: Reset the form
      setName("");
      setDescription("");
      setPoints(0);
      setSubmissionType("none");
      setIsSmManaged(false);
      // ADDED
      setHasSecondStage(false);
      setSecondSubmissionType("none");
      setSecondDescription("");
    }
    setError(null);
  }, [open, initialData]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");

      // --- NEW: Decide whether to CREATE or UPDATE ---
      if (initialData?.id) {
        // Update existing
        const updateFn = httpsCallable(functions, "updateSideQuest");
        await updateFn({
          id: initialData.id,
          name,
          description,
          points,
          submissionType,
          isSmManaged,
          hasSecondStage,
          secondSubmissionType,
          secondDescription,
        });
      } else {
        // Create new
        const createFn = httpsCallable(functions, "createSideQuest");
        await createFn({
          name,
          description,
          points,
          submissionType,
          isSmManaged,
          hasSecondStage,
          secondSubmissionType,
          secondDescription,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error saving quest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6">
          {initialData ? "Edit Side Quest" : "Add Side Quest"}
        </Typography>

        <TextField
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Points"
          type="number"
          fullWidth
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
        />

        <FormControl fullWidth>
          <InputLabel>Submission Type</InputLabel>
          <Select
            value={submissionType}
            label="Submission Type"
            onChange={(e) => setSubmissionType(e.target.value as any)}
          >
            <MenuItem value="none">None (Honor System)</MenuItem>
            <MenuItem value="photo">Photo Upload</MenuItem>
            <MenuItem value="video">Video Upload</MenuItem>
          </Select>
        </FormControl>

        {/* ADDED: 2nd Stage Configuration */}
        <FormControl fullWidth>
          <InputLabel>2nd Stage</InputLabel>
          <Select
            value={hasSecondStage ? "yes" : "no"}
            label="2nd Stage"
            onChange={(e) => setHasSecondStage(e.target.value === "yes")}
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </Select>
        </FormControl>

        {hasSecondStage && (
          <>
            <FormControl fullWidth>
              <InputLabel>2nd Submission Type</InputLabel>
              <Select
                value={secondSubmissionType}
                label="2nd Submission Type"
                onChange={(e) => setSecondSubmissionType(e.target.value as any)}
              >
                <MenuItem value="none">None (Honor System)</MenuItem>
                <MenuItem value="photo">Photo Upload</MenuItem>
                <MenuItem value="video">Video Upload</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="2nd Description"
              fullWidth
              multiline
              rows={3}
              value={secondDescription}
              onChange={(e) => setSecondDescription(e.target.value)}
            />
          </>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={isSmManaged}
              onChange={(e) => setIsSmManaged(e.target.checked)}
            />
          }
          label="Managed by Station Master?"
        />

        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          fullWidth
          disabled={loading || !name}
          onClick={handleSave}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : initialData ? (
            "Update Quest"
          ) : (
            "Add Quest"
          )}
        </Button>
      </Box>
    </Modal>
  );
};
