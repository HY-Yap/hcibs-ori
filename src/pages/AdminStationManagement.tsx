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
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
// Import the interface and component
import { StationModal, type StationData } from "../components/StationModal";

export const AdminStationManagement: React.FC = () => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [stationToEdit, setStationToEdit] = useState<StationData | null>(null);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStations = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, "stations"));
      const stationList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StationData[];
      setStations(stationList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error fetching stations:", err);
      setError("Failed to load stations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
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
      fetchStations();
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
                    <Chip
                      label={(s.status || "OPEN").replace("_", " ")}
                      color={s.status === "OPEN" ? "success" : "error"}
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

      <StationModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onStationAdded={fetchStations}
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
