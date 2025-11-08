import React, { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Typography,
  Divider,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export interface GroupForModal {
  id: string;
  name: string;
}

interface SideQuest {
  id: string;
  name: string;
  points: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupForModal | null;
  stationId: string | null;
}

export const SmActionModal: FC<Props> = ({
  open,
  onClose,
  group,
  stationId,
}) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [stationPoints, setStationPoints] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [sideQuests, setSideQuests] = useState<SideQuest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState("");

  useEffect(() => {
    if (open) {
      // Always fetch side quests when opening, just in case they switch tabs
      const fetchSideQuests = async () => {
        const q = query(
          collection(db, "sideQuests"),
          where("isSmManaged", "==", true)
        );
        const snap = await getDocs(q);
        setSideQuests(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as SideQuest))
        );
      };
      fetchSideQuests();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!group || !stationId) return;

    // Validation: Must have AT LEAST one thing to submit
    if (!stationPoints && !selectedQuestId) {
      setError("Please enter Station Points OR select a Side Quest.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const submitScoreFn = httpsCallable(functions, "submitScore");

      // Prepare the data payload
      const payload: any = {
        groupId: group.id,
        stationId: stationId,
      };

      // Add Station Score if entered
      if (stationPoints) {
        payload.stationPoints = Number(stationPoints);
        payload.adminNote = adminNote;
      }

      // Add Side Quest if selected
      if (selectedQuestId) {
        const quest = sideQuests.find((sq) => sq.id === selectedQuestId);
        if (quest) {
          payload.sideQuestId = quest.id;
          payload.sideQuestPoints = quest.points;
        }
      }

      await submitScoreFn(payload);

      onClose();
      // Reset forms
      setStationPoints("");
      setAdminNote("");
      setSelectedQuestId("");
      setTab(0);
    } catch (err: any) {
      setError(err.message || "Failed to submit score.");
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Action for {group.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
            <Tab label="Station Score" />
            <Tab label="Award Side Quest" />
          </Tabs>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* We use 'display: none' instead of conditional rendering so the state 
            preserves if they switch tabs before submitting */}
        <Box
          sx={{
            display: tab === 0 ? "flex" : "none",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Enter total points (Base + Bonus). This will mark the group as
            DEPARTED.
          </Typography>
          <TextField
            label="Points"
            type="number"
            fullWidth
            value={stationPoints}
            onChange={(e) => setStationPoints(e.target.value)}
          />
          <TextField
            label="Admin Note (Optional)"
            fullWidth
            multiline
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </Box>

        <Box
          sx={{
            display: tab === 1 ? "flex" : "none",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Select Side Quest</InputLabel>
            <Select
              value={selectedQuestId}
              label="Select Side Quest"
              onChange={(e) => setSelectedQuestId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {sideQuests.map((sq) => (
                <MenuItem key={sq.id} value={sq.id}>
                  {sq.name} ({sq.points} pts)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* SUMMARY: Show them what they are about to submit if they have data in the HIDDEN tab */}
        {(stationPoints && tab === 1) || (selectedQuestId && tab === 0) ? (
          <Box sx={{ mt: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Summary of what will be submitted:
            </Typography>
            {stationPoints && (
              <Typography variant="body2">
                • Station Score: {stationPoints} pts
              </Typography>
            )}
            {selectedQuestId && (
              <Typography variant="body2">• Side Quest: Selected</Typography>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Submit All"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
