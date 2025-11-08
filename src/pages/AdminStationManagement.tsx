import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore"; // <-- CHANGED: use onSnapshot
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { StationModal, type StationData } from "../components/StationModal";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export const AdminStationManagement: React.FC = () => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Menu state
  const [isModalOpen, setModalOpen] = useState(false);
  const [stationToEdit, setStationToEdit] = useState<StationData | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- NEW! REAL-TIME LISTENER ---
  useEffect(() => {
    setLoading(true);
    // onSnapshot listens for ANY change in the 'stations' collection
    const unsubscribe = onSnapshot(
      collection(db, "stations"),
      (snapshot) => {
        const stationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StationData[];

        // Sort alphabetically
        setStations(stationList.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching stations:", err);
        setError("Failed to load stations live.");
        setLoading(false);
      }
    );

    // Cleanup listener when leaving page
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    station: StationData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedStation(station);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddClick = () => {
    setStationToEdit(null);
    setModalOpen(true);
  };

  const handleEditAction = () => {
    if (selectedStation) {
      setStationToEdit(selectedStation);
      setModalOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteAction = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStation?.id) return;
    setDeleteLoading(true);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const deleteStationFn = httpsCallable(functions, "deleteStation");
      await deleteStationFn({ id: selectedStation.id });
      setDeleteDialogOpen(false);
      // No need to manually fetch! onSnapshot will see the deletion and update automatically.
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete station.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Station Management</Typography>
        <Button variant="contained" onClick={handleAddClick}>
          + Add Station
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : stations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No stations found.
                </TableCell>
              </TableRow>
            ) : (
              stations.map((s) => (
                <TableRow key={s.id}>
                  <TableCell sx={{ fontWeight: "bold" }}>{s.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={s.type.toUpperCase()}
                      color={s.type === "manned" ? "primary" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{s.location || "-"}</TableCell>
                  <TableCell>
                    {/* --- LIVE STATUS CHIP --- */}
                    <Chip
                      label={(s.status || "OPEN").replace("_", " ")}
                      color={
                        s.status === "OPEN"
                          ? "success"
                          : s.status === "CLOSED_LUNCH"
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => handleMenuOpen(e, s)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditAction}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteAction}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

      {/* We use 'onSuccess' now to match the new component definition */}
      <StationModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}} // <-- FIXED!
        initialData={stationToEdit}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {selectedStation?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This will permanently remove the station.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
