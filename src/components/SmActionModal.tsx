import { useState, useEffect } from "react";
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
  const [sideQuestNote, setSideQuestNote] = useState(""); // ADDED

  useEffect(() => {
    if (open) {
      // Always fetch side quests when opening
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

      // We will collect all necessary API calls in this array
      const promises = [];

      // 1. If Station Points are entered, queue that call
      if (stationPoints) {
        promises.push(
          submitScoreFn({
            groupId: group.id,
            points: Number(stationPoints),
            type: "STATION",
            id: stationId,
            textAnswer: adminNote, // Changed to textAnswer to ensure backend saves it
          })
        );
      }

      // 2. If Side Quest is selected, queue that call too
      if (selectedQuestId) {
        const quest = sideQuests.find((sq) => sq.id === selectedQuestId);
        if (quest) {
          promises.push(
            submitScoreFn({
              groupId: group.id,
              points: quest.points,
              type: "SIDE_QUEST",
              id: selectedQuestId,
              textAnswer: sideQuestNote, // Changed to textAnswer to ensure backend saves it
            })
          );
        }
      }

      // 3. Wait for ALL calls to finish successfully
      await Promise.all(promises);

      onClose();
      // Reset forms
      setStationPoints("");
      setAdminNote("");
      setSelectedQuestId("");
      setSideQuestNote(""); // ADDED
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

        {/* We use 'display: none' to keep state alive between tabs */}
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

          {/* ADDED: Side Quest Note Field */}
          <TextField
            label="Admin Note (Optional)"
            fullWidth
            multiline
            rows={2}
            value={sideQuestNote}
            onChange={(e) => setSideQuestNote(e.target.value)}
          />
        </Box>

        {/* SUMMARY: Show them if they are about to submit BOTH */}
        {stationPoints && selectedQuestId ? (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "#e8f5e9",
              borderRadius: 1,
              border: "1px solid #c8e6c9",
            }}
          >
            <Typography variant="subtitle2" gutterBottom color="success.main">
              You are about to submit BOTH:
            </Typography>
            <Typography variant="body2">
              • Station Score: <strong>{stationPoints}</strong> pts
            </Typography>
            <Typography variant="body2">
              • Side Quest: <strong>Selected</strong>
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
