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
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { FileUpload } from "../components/FileUpload"; // <-- 1. IMPORT UPLOADER
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import LockIcon from "@mui/icons-material/Lock";

interface SideQuestData {
  id: string;
  name: string;
  description: string;
  points: number;
  submissionType: "none" | "photo" | "video";
  isSmManaged: boolean;
}

export const OglSideQuests: FC = () => {
  const { profile, gameStatus } = useAuth();
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedQuest, setSelectedQuest] = useState<SideQuestData | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // --- 2. NEW STATE FOR UPLOAD ---
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  // helper to create safe slug from a name
  const slugify = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

  const getUploadPath = (quest?: SideQuestData) => {
    const gid = profile?.groupId || "unknown-group";
    const gslug = slugify(groupName) || gid;
    const qid = quest?.id || "unknown-quest";
    const qslug = slugify(quest?.name) || qid;
    return `submissions/${gslug}/${qslug}/`;
  };

  // Helper: extract a storage path from various download URL formats
  const extractStoragePathFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      let m = u.pathname.match(/\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      m = u.pathname.match(/\/b\/[^/]+\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      const parts = u.pathname.split("/");
      if (parts.length >= 3) {
        const maybe = parts.slice(2).join("/").split("?")[0];
        return decodeURIComponent(maybe);
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  };

  // Remove uploaded file: try client-side delete first, then fall back to callable 'deleteSubmission'
  const handleRemoveFile = async () => {
    if (!submissionUrl) return;
    if (
      !window.confirm(
        "Remove uploaded file? This will delete the file from storage."
      )
    )
      return;
    setSubmitting(true);
    try {
      const path = extractStoragePathFromUrl(submissionUrl);
      if (path) {
        try {
          const storage = getStorage();
          await deleteObject(storageRef(storage, path));
          console.log("Client-side storage delete succeeded:", path);
          setSubmissionUrl(null);
          return;
        } catch (err) {
          console.warn("Client-side delete failed, will try server-side:", err);
        }
      } else {
        console.warn(
          "Could not parse storage path from URL, will try server-side."
        );
      }

      // fallback to server-side deletion
      const fn = httpsCallable(firebaseFunctions, "deleteSubmission");
      await fn({ groupId: profile?.groupId, submissionUrl });
      console.log(
        "Server-side deleteSubmission succeeded for URL:",
        submissionUrl
      );
      setSubmissionUrl(null);
    } catch (err: any) {
      console.error("Failed to remove file:", err);
      alert(
        `Failed to remove file: ${err?.message || String(err)}. Check console.`
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        setGroupName(docSnap.data().name || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  const handleQuestClick = (quest: SideQuestData) => {
    setSelectedQuest(quest);
    setSubmissionUrl(null); // Clear any previous upload URL
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!selectedQuest || !profile?.groupId) return;

    // Check if upload is required but not done
    if (selectedQuest.submissionType !== "none" && !submissionUrl) {
      alert("Please upload a file first!");
      return;
    }

    setSubmitting(true);
    try {
      const submitScoreFn = httpsCallable(firebaseFunctions, "submitScore");

      // --- THIS IS THE FIX ---
      // We are now using the new "Unified" Score function.
      // We must pass 'sideQuestId' and 'sideQuestPoints'
      // (The old code was passing 'id', 'type', and 'points' which was wrong)
      await submitScoreFn({
        groupId: profile.groupId,
        sideQuestId: selectedQuest.id,
        sideQuestPoints: selectedQuest.points,
        submissionUrl: submissionUrl || null,
      });
      // -------------------------

      handleCloseDialog();
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

  if (gameStatus !== "RUNNING") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 4 }}>
        <LockIcon
          sx={{ fontSize: 80, color: "#8d6e63", mb: 2, opacity: 0.5 }}
        />
        <Typography
          variant="h4"
          sx={{ color: "#c62828", fontWeight: 600 }}
          gutterBottom
        >
          Game Paused
        </Typography>
        <Typography paragraph sx={{ color: "#473321" }}>
          Side quests are currently unavailable.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Side Quests</Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Complete these for bonus points!
      </Alert>

      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
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
                  !isCompleted && !quest.isSmManaged && handleQuestClick(quest)
                }
                sx={{
                  opacity: isCompleted ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1.5,
                  cursor:
                    !isCompleted && !quest.isSmManaged ? "pointer" : "default",
                  "&:hover":
                    !isCompleted && !quest.isSmManaged
                      ? {
                          bgcolor: "action.hover",
                        }
                      : {},
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mr: 1,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: isCompleted
                          ? "success.main"
                          : quest.isSmManaged
                          ? "warning.main"
                          : "primary.main",
                      }}
                    >
                      {isCompleted ? <CheckCircleIcon /> : <Icon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={quest.name}
                    secondary={
                      quest.isSmManaged
                        ? "Find a Station Master"
                        : "Click to submit"
                    }
                  />
                </Box>
                <Box sx={{ minWidth: "fit-content" }}>
                  {isCompleted ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Done"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label={`${quest.points} pts`}
                      color={quest.isSmManaged ? "warning" : "primary"}
                      variant={quest.isSmManaged ? "outlined" : "filled"}
                      size="small"
                    />
                  )}
                </Box>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          );
        })}
      </List>

      {/* Dialog stays mostly the same but simpler */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{selectedQuest?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            {selectedQuest?.description}
          </DialogContentText>

          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "primary.light",
              borderRadius: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              color="primary.dark"
              fontWeight="bold"
              align="center"
            >
              REWARD: {selectedQuest?.points} POINTS
            </Typography>
          </Box>

          {selectedQuest?.submissionType !== "none" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Upload Proof:
              </Typography>
              {submissionUrl ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "success.light",
                    borderColor: "success.main",
                    mt: 1,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="success.dark"
                    >
                      File uploaded
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <a
                        href={submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit" }}
                      >
                        View submission
                      </a>
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={handleRemoveFile}
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </Paper>
              ) : (
                <FileUpload
                  uploadPath={getUploadPath(selectedQuest || undefined)}
                  onUploadComplete={(url) => setSubmissionUrl(url)}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              submitting ||
              (selectedQuest?.submissionType !== "none" && !submissionUrl)
            }
          >
            {submitting ? <CircularProgress size={24} /> : "Claim Points"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
