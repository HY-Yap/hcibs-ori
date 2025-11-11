import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemButton,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { StationSelector } from "../components/StationSelector";
import { getFunctions, httpsCallable } from "firebase/functions";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { SmActionModal, type GroupForModal } from "../components/SmActionModal";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
}

interface GroupData {
  id: string;
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationEta?: string;
  totalScore: number;
}

export const SmDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stationId, setStationId] = useState<string | null>(null);
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [onTheWayGroups, setOnTheWayGroups] = useState<GroupData[]>([]);
  const [arrivedGroups, setArrivedGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"LUNCH" | "CLOSE" | null>(
    null
  );
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupForModal | null>(
    null
  );

  useEffect(() => {
    const check = async () => {
      if (!currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        setStationId(docSnap.data()?.selectedStationId || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [currentUser]);

  useEffect(() => {
    if (!stationId) return;
    const unsub = onSnapshot(
      doc(db, "stations", stationId),
      (d) => setStationData({ id: d.id, ...d.data() } as StationData),
      () => setError("Lost connection to station.")
    );
    return () => unsub();
  }, [stationId]);

  useEffect(() => {
    if (!stationId) return;
    const q = query(
      collection(db, "groups"),
      where("destinationId", "==", stationId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allGroups = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );
      setOnTheWayGroups(allGroups.filter((g) => g.status === "TRAVELING"));
      setArrivedGroups(allGroups.filter((g) => g.status === "ARRIVED"));
    });
    return () => unsub();
  }, [stationId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!stationId) return;
    setActionLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "updateStationStatus"
      );
      await fn({ stationId, newStatus });
      setConfirmOpen(false);
    } catch (err: any) {
      // show error in UI rather than alert
      setError(err?.message || "Failed to change station status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveStation = async () => {
    if (!window.confirm("Are you sure you want to leave this station?")) return;
    setLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "leaveStation"
      );
      await fn();
      window.location.reload();
    } catch (err: any) {
      alert("Failed: " + err.message);
      setLoading(false);
    }
  };

  // Reopen station when SM clicks "WE ARE BACK" by reusing updateStationStatus
  const handleToggleLunch = async () => {
    // delegate to handleStatusChange to keep actionLoading / error behavior consistent
    await handleStatusChange("OPEN");
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!stationId)
    return (
      <StationSelector onStationSelected={() => window.location.reload()} />
    );

  // New: stationData can be null while the realtime snapshot arrives.
  // Show a small spinner until we have stationData to avoid "object is possibly null" errors.
  if (!stationData)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  // stationData is now guaranteed non-null below; use a local const to avoid
  // repeated optional-chaining and TypeScript narrowing issues.
  const status = stationData.status;

  if (stationData.status === "CLOSED_LUNCH")
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

  return (
    <Box sx={{ pb: 4 }}>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          {/* --- UPDATED HEADER SECTION --- */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ mb: 0 }}>
              {stationData?.name}
            </Typography>
            <Button
              variant="text"
              size="small"
              color="inherit"
              startIcon={<ExitToAppIcon />}
              onClick={handleLeaveStation}
              sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
            >
              Change
            </Button>
          </Box>
          {/* ------------------------------ */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="subtitle1">Status:</Typography>
            <Chip
              label={(status || "OPEN").replace("_", " ")}
              color={status === "OPEN" ? "success" : "error"}
              sx={{ fontWeight: "bold" }}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {status === "OPEN" ? (
            <Button
              variant="contained"
              color="warning"
              startIcon={<RestaurantIcon />}
              disabled={actionLoading}
              onClick={() => {
                setConfirmAction("LUNCH");
                setConfirmOpen(true);
              }}
            >
              Lunch
            </Button>
          ) : status === "CLOSED_LUNCH" ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<LockOpenIcon />}
              disabled={actionLoading}
              onClick={() => handleStatusChange("OPEN")}
            >
              Re-open
            </Button>
          ) : null}
          {status !== "CLOSED_PERMANENTLY" && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<LockIcon />}
              disabled={actionLoading}
              onClick={() => {
                setConfirmAction("CLOSE");
                setConfirmOpen(true);
              }}
            >
              Close
            </Button>
          )}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        <Paper sx={{ flex: 1, p: 2, bgcolor: "#f8f9fa", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            🚍 On The Way ({onTheWayGroups.length})
          </Typography>
          <Divider />
          <List>
            {onTheWayGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="No groups traveling here." />
              </ListItem>
            ) : (
              onTheWayGroups.map((group) => (
                <ListItem
                  key={group.id}
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemText
                    primary={group.name}
                    secondary={`ETA: ${group.destinationEta || "Unknown"}`}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: "#e3f2fd", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            🧘 Arrived & Waiting ({arrivedGroups.length})
          </Typography>
          <Divider />
          <List>
            {arrivedGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="Queue is empty." />
              </ListItem>
            ) : (
              arrivedGroups.map((group) => (
                <ListItem
                  key={group.id}
                  disablePadding
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedGroup({ id: group.id, name: group.name });
                        setActionModalOpen(true);
                      }}
                    >
                      Score
                    </Button>
                  }
                >
                  <ListItemButton
                    onClick={() => {
                      setSelectedGroup({ id: group.id, name: group.name });
                      setActionModalOpen(true);
                    }}
                  >
                    <ListItemText
                      primary={group.name}
                      secondary="Ready for activity"
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmAction === "LUNCH" ? "Go on Lunch?" : "Close Station?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction === "LUNCH"
              ? "Mark station as CLOSED (LUNCH)?"
              : "WARNING: Permanently close station?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleStatusChange(
                confirmAction === "LUNCH"
                  ? "CLOSED_LUNCH"
                  : "CLOSED_PERMANENTLY"
              )
            }
            color={confirmAction === "CLOSE" ? "error" : "warning"}
            variant="contained"
            disabled={actionLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Only mount SmActionModal when we have required props to avoid TS/runtime errors */}
      {selectedGroup && stationId && (
        <SmActionModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          group={selectedGroup}
          stationId={stationId}
        />
      )}
    </Box>
  );
};
export default SmDashboard;
