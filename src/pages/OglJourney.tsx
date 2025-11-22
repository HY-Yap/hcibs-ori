import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Divider,
  IconButton,
  Badge,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { FileUpload } from "../components/FileUpload";
import { ChatWindow } from "../components/ChatWindow"; // <-- Chat Component

// Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import ClearIcon from "@mui/icons-material/Clear";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatIcon from "@mui/icons-material/Chat"; // <-- Chat Icon

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
  description?: string;
  points?: number;
}
interface GroupData {
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationId?: string;
  completedStations?: string[];
}

export const OglJourney: FC = () => {
  const { profile, gameStatus } = useAuth();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [travelDialogOpen, setTravelDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );
  const [eta, setEta] = useState("");

  // Submission State
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");

  // --- CHAT STATE (Restored) ---
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reset submission when arriving
  useEffect(() => {
    if (groupData?.status === "ARRIVED") {
      setSubmissionUrl(null);
      setTextAnswer("");
    }
  }, [groupData?.status, groupData?.destinationId]);

  // Listen to Group
  useEffect(() => {
    if (!profile?.groupId) return;
    const unsub = onSnapshot(doc(db, "groups", profile.groupId), (docSnap) => {
      if (docSnap.exists()) setGroupData(docSnap.data() as GroupData);
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  // Listen to Stations
  useEffect(() => {
    const q = query(collection(db, "stations"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      setStations(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StationData))
      );
    });
    return () => unsub();
  }, []);

  // --- LISTEN TO CHAT UNREAD COUNT (Restored) ---
  useEffect(() => {
    if (
      groupData?.status !== "TRAVELING" ||
      !groupData.destinationId ||
      !profile?.groupId
    ) {
      return;
    }
    const chatId = `chat_${profile.groupId}_${groupData.destinationId}`;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        setUnreadCount(snap.data().unreadCountOGL || 0);
      }
    });
    return () => unsub();
  }, [groupData?.status, groupData?.destinationId, profile?.groupId]);

  const callFunction = async (name: string, data: any = {}) => {
    setActionLoading(true);
    try {
      const fn = httpsCallable(firebaseFunctions, name);
      await fn(data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTravel = async () => {
    if (!selectedStation || !eta) return;
    await callFunction("oglStartTravel", {
      stationId: selectedStation.id,
      eta,
    });
    setTravelDialogOpen(false);
    setEta("");
    setSelectedStation(null);
  };
  const handleArrive = async () => await callFunction("oglArrive");
  const handleDepart = async () => {
    if (
      window.confirm(
        "Are you sure you want to skip this station without points?"
      )
    ) {
      await callFunction("oglDepart");
    }
  };
  const handleToggleLunch = async () => await callFunction("oglToggleLunch");

  const handleSubmitUnmanned = async (station: StationData) => {
    if (!profile?.groupId) return;
    if (!textAnswer && !submissionUrl) {
      alert("Please provide a text answer or upload a file.");
      return;
    }
    setActionLoading(true);
    try {
      const submitScoreFn = httpsCallable(firebaseFunctions, "submitScore");
      await submitScoreFn({
        groupId: profile.groupId,
        stationId: station.id,
        stationPoints: station.points || 50,
        type: "STATION",
        submissionUrl: submissionUrl || null,
        textAnswer: textAnswer || null,
      });
      setSubmissionUrl(null);
      setTextAnswer("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!groupData) return <Alert severity="error">Group data not found.</Alert>;

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
          The game is currently stopped by the Game Master.
        </Typography>
      </Box>
    );
  }

  // --- VIEW 1: TRAVELING ---
  if (groupData.status === "TRAVELING") {
    const dest = stations.find((s) => s.id === groupData.destinationId);
    return (
      <Box sx={{ textAlign: "center", mt: 4, p: 2 }}>
        <DirectionsRunIcon
          sx={{ fontSize: 80, color: "primary.main", mb: 2 }}
        />
        <Typography variant="h4" gutterBottom>
          Traveling...
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Destination: <strong>{dest?.name || "Unknown"}</strong>
        </Typography>

        {/* --- CHAT BUTTON (Restored) --- */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="outlined"
            color="info"
            size="large"
            startIcon={
              <Badge badgeContent={unreadCount} color="error">
                <ChatIcon />
              </Badge>
            }
            onClick={() => setChatOpen(true)}
            fullWidth
          >
            Chat with Station Master
          </Button>
        </Box>
        {/* ----------------------------- */}

        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          sx={{ py: 2, fontSize: "1.2rem" }}
          disabled={actionLoading}
          onClick={handleArrive}
        >
          I HAVE ARRIVED
        </Button>

        {/* --- CHAT WINDOW (Restored) --- */}
        {chatOpen && groupData.destinationId && (
          <ChatWindow
            chatId={`chat_${profile?.groupId}_${groupData.destinationId}`}
            title={`Chat with ${dest?.name || "SM"}`}
            onClose={() => setChatOpen(false)}
          />
        )}
      </Box>
    );
  }

  // --- VIEW 2: ARRIVED ---
  if (groupData.status === "ARRIVED") {
    const currentStation = stations.find(
      (s) => s.id === groupData.destinationId
    );
    const isManned = currentStation?.type === "manned";

    return (
      <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", p: 2 }}>
        <LocationOnIcon sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          You are at {currentStation?.name}
        </Typography>

        {isManned ? (
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#e3f2fd" }}>
            <Typography variant="h6" gutterBottom>
              WAITING FOR STATION MASTER
            </Typography>
            <Typography>
              Please wait for the SM to conduct the activity and award your
              points.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#fff3e0", textAlign: "left" }}>
            <Typography variant="h6" gutterBottom>
              UNMANNED STATION
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "#f0f7ff",
                borderRadius: 2,
                border: "1px solid #cce5ff",
                textAlign: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                color="primary.main"
                sx={{ fontWeight: "bold" }}
              >
                REWARD: {currentStation?.points || 50} POINTS
              </Typography>
            </Box>
            <Typography
              paragraph
              sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
            >
              {currentStation?.description || "No description available."}
            </Typography>

            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}
            >
              <TextField
                label="Text Answer (if required)"
                variant="outlined"
                fullWidth
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
              />
              {submissionUrl ? (
                <Alert
                  severity="success"
                  icon={<AttachFileIcon />}
                  action={
                    <IconButton
                      size="small"
                      onClick={() => setSubmissionUrl(null)}
                    >
                      <ClearIcon />
                    </IconButton>
                  }
                >
                  File uploaded successfully!
                </Alert>
              ) : (
                <FileUpload
                  uploadPath={`submissions/${profile?.groupId}/${currentStation?.id}/`}
                  onUploadComplete={(url) => setSubmissionUrl(url)}
                />
              )}
              <Button
                variant="contained"
                color="success"
                disabled={actionLoading || (!textAnswer && !submissionUrl)}
                onClick={() => handleSubmitUnmanned(currentStation!)}
                sx={{ mt: 1, py: 1.5 }}
              >
                {actionLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Submit & Complete Station"
                )}
              </Button>
            </Box>
          </Paper>
        )}
        <Button
          variant="outlined"
          color="error"
          fullWidth
          sx={{ mt: 4 }}
          disabled={actionLoading}
          onClick={handleDepart}
        >
          DEPART (SKIP STATION)
        </Button>
      </Box>
    );
  }

  // --- VIEW 3: ON LUNCH ---
  if (groupData.status === "ON_LUNCH") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 2 }}>
        <RestaurantIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          On Lunch Break
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          sx={{ py: 2, mt: 4 }}
          disabled={actionLoading}
          onClick={handleToggleLunch}
        >
          WE ARE BACK
        </Button>
      </Box>
    );
  }

  // --- VIEW 4: IDLE ---
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Select Next Station</Typography>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestaurantIcon />}
          disabled={actionLoading}
          onClick={handleToggleLunch}
        >
          Go on Lunch
        </Button>
      </Box>
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {stations.map((s) => {
          const isCompleted = groupData.completedStations?.includes(s.id);
          const isOpen = s.status === "OPEN";
          const isDisabled = isCompleted || !isOpen;
          return (
            <React.Fragment key={s.id}>
              <ListItem
                sx={{
                  opacity: isDisabled ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1.5,
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
                          ? "success.light"
                          : isOpen
                          ? "primary.main"
                          : "error.main",
                      }}
                    >
                      <LocationOnIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={s.name}
                    secondary={
                      <Box component="span" sx={{ display: "block" }}>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ fontWeight: "bold", mr: 1 }}
                        >
                          {s.type.toUpperCase()}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: "nowrap" }}
                        >{`(${s.travelingCount} inc / ${s.arrivedCount} wait)`}</Typography>
                      </Box>
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
                  ) : !isOpen ? (
                    <Chip
                      label={s.status.replace("_", " ")}
                      color="error"
                      size="small"
                    />
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setSelectedStation(s);
                        setTravelDialogOpen(true);
                      }}
                    >
                      GO
                    </Button>
                  )}
                </Box>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          );
        })}
      </List>
      <Dialog
        open={travelDialogOpen}
        onClose={() => setTravelDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Travel to {selectedStation?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your estimated time of arrival (ETA).
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="ETA (e.g. 2:45 PM)"
            fullWidth
            variant="outlined"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTravelDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartTravel}
            variant="contained"
            disabled={!eta || actionLoading}
          >
            Start Traveling
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
