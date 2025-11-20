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
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Menu,
  ListItemIcon,
} from "@mui/material";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit"; // <-- NEW
import MoreVertIcon from "@mui/icons-material/MoreVert"; // <-- NEW
import { HouseModal, type HouseData } from "../components/HouseModal";
import HouseIcon from "@mui/icons-material/House";

interface GroupData {
  id: string;
  name: string;
  houseId?: string;
}

export const AdminHouseManagement: React.FC = () => {
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [systemEnabled, setSystemEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [houseToEdit, setHouseToEdit] = useState<HouseData | null>(null); // <-- NEW

  // Menu & Delete State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedHouse, setSelectedHouse] = useState<HouseData | null>(null); // <-- NEW
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setLoading(true);
    // 1. Listen to Houses
    const unsubHouses = onSnapshot(collection(db, "houses"), (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as HouseData)
      );
      setHouses(list.sort((a, b) => a.name.localeCompare(b.name)));
    });

    // 2. Listen to Groups
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );
      // Natural sort groups
      setGroups(
        list.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        )
      );
    });

    // 3. Listen to Game Config (for Toggle)
    const unsubConfig = onSnapshot(doc(db, "game", "config"), (snap) => {
      if (snap.exists()) {
        setSystemEnabled(snap.data().houseSystemEnabled || false);
      }
      setLoading(false);
    });

    return () => {
      unsubHouses();
      unsubGroups();
      unsubConfig();
    };
  }, []);

  const handleToggleSystem = async (enabled: boolean) => {
    setSystemEnabled(enabled);
    try {
      const toggleFn = httpsCallable(functions, "toggleHouseSystem");
      await toggleFn({ enabled });
    } catch (err) {
      console.error(err);
      alert("Failed to toggle system.");
      setSystemEnabled(!enabled);
    }
  };

  // --- MENU HANDLERS ---
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    house: HouseData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedHouse(house);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddClick = () => {
    setHouseToEdit(null);
    setModalOpen(true);
  };

  const handleEditAction = () => {
    if (selectedHouse) {
      setHouseToEdit(selectedHouse);
      setModalOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteAction = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedHouse) return;
    setActionLoading(true);
    try {
      const deleteFn = httpsCallable(functions, "deleteHouse");
      await deleteFn({ id: selectedHouse.id });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignHouse = async (groupId: string, houseId: string) => {
    setAssigning(true);
    try {
      const assignFn = httpsCallable(functions, "assignGroupToHouse");
      await assignFn({
        groupId,
        houseId: houseId === "unassigned" ? null : houseId,
      });
    } catch (err: any) {
      alert("Failed to assign house: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      {/* HEADER & TOGGLE */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <HouseIcon fontSize="large" /> House Management
        </Typography>
        <Paper
          sx={{
            p: 1,
            px: 2,
            bgcolor: systemEnabled ? "#e8f5e9" : "#f5f5f5",
            border: "1px solid #ccc",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={systemEnabled}
                onChange={(e) => handleToggleSystem(e.target.checked)}
              />
            }
            label={
              <strong>
                {systemEnabled
                  ? "House System ENABLED"
                  : "House System DISABLED"}
              </strong>
            }
            sx={{ m: 0 }}
          />
        </Paper>
      </Box>

      {/* SECTION 1: MANAGE HOUSES */}
      <Box sx={{ mb: 6 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">1. Houses</Typography>
          <Button variant="contained" onClick={handleAddClick}>
            + Add House
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f4f4f4" }}>
                <TableCell>House Name</TableCell>
                <TableCell>Color</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {houses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No houses created.
                  </TableCell>
                </TableRow>
              ) : (
                houses.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      {h.name}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: h.color,
                            border: "1px solid #ccc",
                          }}
                        />
                        {h.color}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {/* --- MENU BUTTON --- */}
                      <IconButton onClick={(e) => handleMenuOpen(e, h)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Divider sx={{ mb: 6 }} />

      {/* SECTION 2: ASSIGN GROUPS */}
      <Box>
        <Typography variant="h5" gutterBottom>
          2. Allocate Groups to Houses
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f4f4f4" }}>
                <TableCell>Group Name</TableCell>
                <TableCell>Assigned House</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell sx={{ fontWeight: "bold" }}>{g.name}</TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={g.houseId || "unassigned"}
                        onChange={(e) =>
                          handleAssignHouse(g.id, e.target.value)
                        }
                        disabled={assigning || houses.length === 0}
                        displayEmpty
                      >
                        <MenuItem value="unassigned">
                          <em>Unassigned</em>
                        </MenuItem>
                        {houses.map((h) => (
                          <MenuItem key={h.id} value={h.id}>
                            <Box
                              component="span"
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                bgcolor: h.color,
                                display: "inline-block",
                                mr: 1,
                              }}
                            />
                            {h.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* MODALS & MENUS */}
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

      <HouseModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}}
        initialData={houseToEdit}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {selectedHouse?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will unassign any groups currently in this house.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
