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

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const SideQuestModal: FC<Props> = ({ open, onClose, onAdded }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(50);
  const [submissionType, setSubmissionType] = useState<
    "photo" | "video" | "none"
  >("none");
  const [isSmManaged, setIsSmManaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const createFn = httpsCallable(functions, "createSideQuest");
      await createFn({
        name,
        description,
        points,
        submissionType,
        isSmManaged,
      });
      onAdded();
      onClose();
      // Reset form
      setName("");
      setDescription("");
      setPoints(50);
      setSubmissionType("none");
      setIsSmManaged(false);
    } catch (err: any) {
      setError(err.message || "Error creating quest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6">Add Side Quest</Typography>
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

        <FormControlLabel
          control={
            <Checkbox
              checked={isSmManaged}
              onChange={(e) => setIsSmManaged(e.target.checked)}
            />
          }
          label="Managed by Station Master? (e.g. '24 Game')"
        />

        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          fullWidth
          disabled={loading || !name}
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={24} /> : "Add Quest"}
        </Button>
      </Box>
    </Modal>
  );
};
