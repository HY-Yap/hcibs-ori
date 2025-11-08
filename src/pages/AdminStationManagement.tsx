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
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { StationModal } from "../components/StationModal";
import DeleteIcon from "@mui/icons-material/Delete";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  location?: string;
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
}

export const AdminStationManagement: React.FC = () => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<StationData | null>(
    null
  );
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
      // Sort by name alphabetically
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

  const handleDeleteClick = (station: StationData) => {
    setStationToDelete(station);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!stationToDelete) return;
    setDeleteLoading(true);
    try {
      // Ensure this region matches your Firebase console!
      const functions = getFunctions(undefined, "asia-southeast1");
      const deleteStationFn = httpsCallable(functions, "deleteStation");
      await deleteStationFn({ id: stationToDelete.id });
      setDeleteDialogOpen(false);
      setStationToDelete(null);
      fetchStations(); // Refresh list
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete station."); // Simple alert for now
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Station Management</Typography>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
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
                    <Chip
                      label={s.status.replace("_", " ")}
                      color={s.status === "OPEN" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(s)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <StationModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onStationAdded={fetchStations}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {stationToDelete?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This will permanently remove the station and its task
            details.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
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
