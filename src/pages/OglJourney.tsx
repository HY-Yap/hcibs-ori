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
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db, functions as firebaseFunctions } from "../firebase"; // Import main instance
import { FileUpload } from "../components/FileUpload"; // <-- IMPORT UPLOADER
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { httpsCallable } from "firebase/functions";

// --- UPDATED INTERFACE ---
// We need 'description' and 'points' for the unmanned stations!
interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
  description?: string;
  points?: number; // <-- This field MUST exist on your Unmanned Stations
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
  const [error, setError] = useState<string | null>(null);

  // clear submission when destination changes so we don't keep stale uploads
  const currentDestinationId = groupData?.destinationId;
  useEffect(() => {
    setSubmissionUrl(null);
    setTextAnswer("");
  }, [currentDestinationId]);

  const [travelDialogOpen, setTravelDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );
  const [eta, setEta] = useState("");

  // --- NEW STATE FOR SUBMISSIONS ---
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");

  useEffect(() => {
    if (!profile?.groupId) return;
    const unsub = onSnapshot(doc(db, "groups", profile.groupId), (docSnap) => {
      if (docSnap.exists()) setGroupData(docSnap.data() as GroupData);
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    const q = query(collection(db, "stations"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      setStations(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StationData))
      );
    });
    return () => unsub();
  }, []);

  const callFunction = async (name: string, data: any = {}) => {
    setActionLoading(true);
    try {
      // Use the pre-configured 'functions' instance
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

  // --- NEW HANDLER FOR UNMANNED STATION SUBMISSION ---
  const handleSubmitUnmanned = async (station: StationData) => {
    if (!profile?.groupId) return;

    // We assume unmanned stations require EITHER text OR a file, or just pressing submit
    // (We can make this logic stricter later if needed)

    setActionLoading(true);
    try {
      const submitScoreFn = httpsCallable(firebaseFunctions, "submitScore");
      await submitScoreFn({
        groupId: profile.groupId,
        stationId: station.id,
        stationPoints: station.points || 50, // Default to 50 if points not set
        type: "STATION",
        submissionUrl: submissionUrl || null,
        textAnswer: textAnswer || null,
      });
      // Success! submitScore automatically sets status to IDLE
      setSubmissionUrl(null);
      setTextAnswer("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: extract a storage path from various download URL formats
  const extractStoragePathFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      // Common firebase download URL contains '/o/<encodedPath>'
      let m = u.pathname.match(/\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      // Try pattern with '/b/<bucket>/o/<encodedPath>'
      m = u.pathname.match(/\/b\/[^/]+\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      // Fallback: some URLs may include the raw path after bucket (less common)
      const parts = u.pathname.split("/");
      if (parts.length >= 3) {
        // attempt to join everything after the bucket segment
        const maybe = parts.slice(2).join("/").split("?")[0];
        return decodeURIComponent(maybe);
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  };

  // Try client-side delete; if it fails, fall back to the server callable 'deleteSubmission'
  const handleRemoveFile = async () => {
    if (!submissionUrl) return;
    if (
      !window.confirm(
        "Remove uploaded file? This will delete the file from storage."
      )
    )
      return;

    setActionLoading(true);
    const path = extractStoragePathFromUrl(submissionUrl);
    // 1) Attempt client-side delete if we could parse a storage path
    if (path) {
      try {
        const storage = getStorage();
        await deleteObject(storageRef(storage, path));
        console.log("Client-side storage delete succeeded:", path);
        setSubmissionUrl(null);
        setActionLoading(false);
        return;
      } catch (err: any) {
        console.warn("Client-side delete failed, will try server-side:", err);
      }
    } else {
      console.warn(
        "Could not parse storage path from URL, will try server-side."
      );
    }

    // 2) Fallback: call server-side function to delete (deployed deleteSubmission)
    try {
      const fn = httpsCallable(firebaseFunctions, "deleteSubmission");
      await fn({
        groupId: profile?.groupId,
        stationId: groupData?.destinationId || undefined,
        submissionUrl,
      });
      console.log(
        "Server-side deleteSubmission succeeded for URL:",
        submissionUrl
      );
      setSubmissionUrl(null);
    } catch (err: any) {
      console.error("Server-side deleteSubmission failed:", err);
      alert(
        `Failed to remove file. Server delete error: ${
          err?.message || String(err)
        }. Check console for details.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // helper to create safe slug from a name
  const slugify = (s?: string) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

  // build readable upload path using group name + station name (falls back to IDs)
  const getUploadPath = (station?: StationData) => {
    const gid = profile?.groupId || "unknown-group";
    const gslug = slugify(groupData?.name) || gid;
    const sid = station?.id || "unknown-station";
    const sslug = slugify(station?.name) || sid;
    return `submissions/${gslug}/${sslug}/`;
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
        <Typography color="text.secondary">
          Please wait for further instructions.
        </Typography>
      </Box>
    );
  }

  // --- VIEW 2: ARRIVED (AT STATION) ---
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
          // --- UPDATED UNMANNED STATION FORM ---
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
            <Typography paragraph sx={{ whiteSpace: "pre-wrap" }}>
              {currentStation?.description ||
                "No description for this station."}
            </Typography>

            {/* We'll show BOTH options. The task description should tell them which to use. */}
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
              {/* If a file has been uploaded, show a persistent banner with actions.
                  Hide the uploader while a submission exists so the user must Remove to replace. */}
              {submissionUrl ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "#e8f5e9",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      File uploaded
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <a
                        href={submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View submission
                      </a>
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={handleRemoveFile}
                      disabled={actionLoading}
                    >
                      Remove file
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <FileUpload
                  uploadPath={getUploadPath(currentStation)}
                  onUploadComplete={(url) => setSubmissionUrl(url)}
                />
              )}

              <Button
                variant="contained"
                color="success"
                // require an uploaded file before enabling submit
                disabled={actionLoading || !submissionUrl}
                onClick={() => handleSubmitUnmanned(currentStation!)}
                sx={{ mt: 1, py: 1.5 }}
              >
                Submit & Complete Station
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

  // --- (OTHER VIEWS: TRAVELING, LUNCH, IDLE) ---
  // (These are unchanged from the file you have)

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
        <Typography paragraph>
          Walk safely! Click below when you are physically there.
        </Typography>
        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          sx={{ py: 2, mt: 4, fontSize: "1.2rem" }}
          disabled={actionLoading}
          onClick={handleArrive}
        >
          I HAVE ARRIVED
        </Button>
      </Box>
    );
  }

  if (groupData.status === "ON_LUNCH") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 2 }}>
        <RestaurantIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          On Lunch Break
        </Typography>
        <Typography paragraph>
          Enjoy your meal! Click below when you are ready to resume.
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
                        >
                          {`(${s.travelingCount} inc / ${s.arrivedCount} wait)`}
                        </Typography>
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
