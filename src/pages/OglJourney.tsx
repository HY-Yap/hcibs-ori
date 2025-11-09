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
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface GroupData {
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationId?: string;
  completedStations?: string[];
}

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
}

export const OglJourney: FC = () => {
  const { profile } = useAuth();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [travelDialogOpen, setTravelDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );
  const [eta, setEta] = useState("");

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
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        name
      );
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

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!groupData) return <Alert severity="error">Group data not found.</Alert>;

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

  if (groupData.status === "ARRIVED") {
    const currentStation = stations.find(
      (s) => s.id === groupData.destinationId
    );
    const isManned = currentStation?.type === "manned";
    return (
      <Box sx={{ textAlign: "center", mt: 4, p: 2 }}>
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
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#fff3e0" }}>
            <Typography variant="h6">UNMANNED STATION</Typography>
            <Typography>(Task submission coming soon!)</Typography>
          </Paper>
        )}
        <Button
          variant="outlined"
          color="error"
          fullWidth
          sx={{ mt: 6 }}
          disabled={actionLoading}
          onClick={handleDepart}
        >
          DEPART (SKIP STATION)
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
              {/* --- UPDATED LIST ITEM FOR BETTER MOBILE LAYOUT --- */}
              <ListItem
                sx={{
                  opacity: isDisabled ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1.5,
                }}
              >
                {/* LEFT SIDE: Avatar + Text (Allowed to shrink/wrap) */}
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
                    // We use a Box for secondary text so we can control wrapping better
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

                {/* RIGHT SIDE: Action (Fixed width, won't shrink) */}
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
