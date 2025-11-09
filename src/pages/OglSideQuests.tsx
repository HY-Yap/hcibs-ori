import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import LockIcon from "@mui/icons-material/Lock"; // <-- NEW IMPORT

interface SideQuestData {
  id: string;
  name: string;
  description: string;
  points: number;
  submissionType: "none" | "photo" | "video";
  isSmManaged: boolean;
}

export const OglSideQuests: FC = () => {
  // --- GET gameStatus ---
  const { profile, gameStatus } = useAuth();
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedQuest, setSelectedQuest] = useState<SideQuestData | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchQuests = async () => {
      const q = query(collection(db, "sideQuests"), orderBy("name"));
      const snap = await getDocs(q);
      setQuests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as SideQuestData))
      );
    };
    fetchQuests();
  }, []);

  useEffect(() => {
    if (!profile?.groupId) return;
    const unsub = onSnapshot(doc(db, "groups", profile.groupId), (docSnap) => {
      if (docSnap.exists()) {
        setCompletedQuests(docSnap.data().completedSideQuests || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  const handleQuestClick = (quest: SideQuestData) => {
    setSelectedQuest(quest);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedQuest || !profile?.groupId) return;
    setSubmitting(true);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const submitScoreFn = httpsCallable(functions, "submitScore");

      await submitScoreFn({
        groupId: profile.groupId,
        points: selectedQuest.points,
        type: "SIDE_QUEST",
        id: selectedQuest.id,
      });

      setDialogOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  // --- NEW: BLOCK IF GAME IS STOPPED ---
  if (gameStatus !== "RUNNING") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 4 }}>
        <LockIcon
          sx={{ fontSize: 80, color: "text.secondary", mb: 2, opacity: 0.5 }}
        />
        <Typography variant="h4" color="error" gutterBottom>
          Game Paused
        </Typography>
        <Typography paragraph>
          Side quests are currently unavailable.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Side Quests
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Complete these for bonus points!
      </Alert>

      <Paper>
        <List disablePadding>
          {quests.map((quest, index) => {
            const isCompleted = completedQuests.includes(quest.id);
            let Icon = AssignmentIcon;
            if (quest.isSmManaged) Icon = SportsEsportsIcon;
            else if (quest.submissionType === "photo") Icon = PhotoCameraIcon;
            else if (quest.submissionType === "video") Icon = VideocamIcon;

            return (
              <React.Fragment key={quest.id}>
                {index > 0 && <Divider />}
                <ListItem
                  onClick={() =>
                    !isCompleted &&
                    !quest.isSmManaged &&
                    handleQuestClick(quest)
                  }
                  sx={{
                    opacity: isCompleted ? 0.6 : 1,
                    bgcolor: isCompleted ? "action.hover" : "inherit",
                    cursor:
                      !isCompleted && !quest.isSmManaged
                        ? "pointer"
                        : "default",
                    display: "flex",
                    alignItems: "center",
                    py: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                      mr: 1,
                      minWidth: 0,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: isCompleted
                            ? "success.light"
                            : quest.isSmManaged
                            ? "warning.light"
                            : "secondary.main",
                        }}
                      >
                        {isCompleted ? <CheckCircleIcon /> : <Icon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={quest.name}
                      secondaryTypographyProps={{ noWrap: true }}
                      secondary={
                        quest.isSmManaged
                          ? "Find a Station Master"
                          : "Click to submit"
                      }
                    />
                  </Box>
                  <Box sx={{ minWidth: "fit-content" }}>
                    {isCompleted ? (
                      <Chip label="Done" color="success" size="small" />
                    ) : quest.isSmManaged ? (
                      <Chip
                        label={`${quest.points} pts`}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label={`${quest.points} pts`}
                        color="primary"
                        size="small"
                      />
                    )}
                  </Box>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{selectedQuest?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph sx={{ color: "text.primary" }}>
            {selectedQuest?.description}
          </DialogContentText>

          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "#f0f7ff",
              borderRadius: 2,
              border: "1px solid #cce5ff",
            }}
          >
            <Typography variant="subtitle2" color="primary.main" align="center">
              REWARD: {selectedQuest?.points} POINTS
            </Typography>
          </Box>

          {selectedQuest?.submissionType !== "none" && (
            <Typography
              variant="caption"
              display="block"
              textAlign="center"
              sx={{ mt: 2, color: "text.secondary" }}
            >
              (File upload will be added in the next update)
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : "Claim Points"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
