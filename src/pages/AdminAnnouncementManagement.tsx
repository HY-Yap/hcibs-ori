import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Pagination,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from "@mui/material";
import { collection, query, orderBy, onSnapshot} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";
import SendIcon from "@mui/icons-material/Send";

interface AnnouncementData {
  id: string;
  message: string;
  timestamp: any;
  targets?: string[];
}

export const AdminAnnouncementManagement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stationMap, setStationMap] = useState<Record<string, string>>({}); // NEW: Map for station names

  // Broadcast State
  const [announcement, setAnnouncement] = useState("");
  const [targets, setTargets] = useState({
    OGL: true,
    SM: true,
    ADMIN: true,
    GUEST: true,
  });
  const [sending, setSending] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Delete All State
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnnouncementData))
      );
      setLoading(false);
    });

    // NEW: Fetch stations to resolve SM:{id} to SM (Station Name)
    const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((doc) => {
        map[doc.id] = doc.data().name;
      });
      setStationMap(map);
    });

    return () => {
      unsub();
      unsubStations(); // Cleanup
    };
  }, []);

  // NEW: Helper to format target string
  const formatTarget = (t: string) => {
    if (t.startsWith("SM:")) {
      const id = t.split(":")[1];
      const name = stationMap[id];
      return name ? `SM (${name})` : t;
    }
    return t;
  };

  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargets({
      ...targets,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSendAnnouncement = async () => {
    if (!announcement) return;

    const selectedTargets = Object.entries(targets)
      .filter(([_, checked]) => checked)
      .map(([role]) => role);

    if (selectedTargets.length === 0) {
      alert("Please select at least one target audience.");
      return;
    }

    setSending(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "makeAnnouncement"
      );
      await fn({ message: announcement, targets: selectedTargets });
      setAnnouncement("");
      setToastOpen(true);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      const fn = httpsCallable(getFunctions(undefined, "asia-southeast1"), "deleteAnnouncement");
      await fn({ id });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirm !== "DELETE") return;
    setActionLoading(true);
    try {
      const fn = httpsCallable(getFunctions(undefined, "asia-southeast1"), "deleteAllAnnouncements");
      await fn();
      setDeleteAllOpen(false);
      setDeleteAllConfirm("");
      alert("All announcements deleted.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(announcements.length / itemsPerPage);
  const displayedAnnouncements = announcements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", pb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CampaignIcon /> Announcement Management
      </Typography>

      {/* Broadcast Announcement Card */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          bgcolor: "#fff8e1", // Warm light yellow
          border: "2px solid #eec45c", // Your gold
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#473321", // Your dark brown
            fontWeight: 600,
          }}
        >
          <CampaignIcon sx={{ color: "#b97539" }} /> {/* Bronze icon */}
          Broadcast Announcement
        </Typography>

        {/* Target Selection Checkboxes - Optimized for Mobile Row */}
        <FormControl component="fieldset" sx={{ mb: 2, width: "100%" }}>
          <FormLabel component="legend" sx={{ fontSize: "0.875rem", mb: 0.5 }}>
          </FormLabel>
          <FormGroup
            row
            sx={{
              display: "flex",
              flexWrap: "nowrap", // Force single row
              justifyContent: "space-between", // Spread them out
              "& .MuiFormControlLabel-root": {
                mr: 0, // Remove default right margin
                ml: -1, // Pull closer slightly
              },
              "& .MuiTypography-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" } // Smaller text on mobile
              }
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={targets.OGL}
                  onChange={handleTargetChange}
                  name="OGL"
                  size="small"
                  sx={{ color: "#b97539", "&.Mui-checked": { color: "#b97539" } }}
                />
              }
              label="OGLs"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={targets.SM}
                  onChange={handleTargetChange}
                  name="SM"
                  size="small"
                  sx={{ color: "#b97539", "&.Mui-checked": { color: "#b97539" } }}
                />
              }
              label="SMs"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={targets.ADMIN}
                  onChange={handleTargetChange}
                  name="ADMIN"
                  size="small"
                  sx={{ color: "#b97539", "&.Mui-checked": { color: "#b97539" } }}
                />
              }
              label="Admins"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={targets.GUEST}
                  onChange={handleTargetChange}
                  name="GUEST"
                  size="small"
                  sx={{ color: "#b97539", "&.Mui-checked": { color: "#b97539" } }}
                />
              }
              label="Guests"
            />
          </FormGroup>
        </FormControl>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type message..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            size="small"
            sx={{
              bgcolor: "white",
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#b97539" },
                "&.Mui-focused fieldset": { borderColor: "#b97539" },
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            disabled={!announcement || sending}
            onClick={handleSendAnnouncement}
          >
            Send
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ mb: 4, overflow: "hidden" }}>
        <List disablePadding>
          {displayedAnnouncements.length === 0 ? (
            <ListItem>
              <ListItemText primary="No announcements found." />
            </ListItem>
          ) : (
            displayedAnnouncements.map((ann, index) => (
              <React.Fragment key={ann.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" color="error" onClick={() => handleDeleteSingle(ann.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={ann.message}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {ann.timestamp?.toDate().toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {/* UPDATED: Use formatTarget to show readable names */}
                          Targets: {ann.targets ? ann.targets.map(formatTarget).join(", ") : "ALL"}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}
      </Paper>

      {/* Danger Zone */}
      <Box sx={{ p: 3, border: "2px solid #c62828", borderRadius: 2, bgcolor: "#ffebee" }}>
        <Typography variant="h6" color="error" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon /> Danger Zone
        </Typography>
        <Typography paragraph>Permanently delete ALL announcements.</Typography>
        <Button
          variant="contained"
          color="error"
          onClick={() => setDeleteAllOpen(true)}
        >
          DELETE ALL ANNOUNCEMENTS
        </Button>
      </Box>

      {/* Delete All Dialog */}
      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)}>
        <DialogTitle sx={{ color: "#c62828" }}>DELETE ALL ANNOUNCEMENTS?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This action cannot be undone. Type DELETE to confirm.
          </DialogContentText>
          <TextField
            fullWidth
            value={deleteAllConfirm}
            onChange={(e) => setDeleteAllConfirm(e.target.value)}
            placeholder="DELETE"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAll}
            color="error"
            variant="contained"
            disabled={deleteAllConfirm !== "DELETE" || actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : "CONFIRM"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: "100%" }}>
          Announcement sent successfully.
        </Alert>
      </Snackbar>
    </Box>
  );
};
