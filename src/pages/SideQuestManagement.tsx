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
import MoreVertIcon from "@mui/icons-material/MoreVert"; // <-- NEW IMPORT
import {
  SideQuestModal,
  type SideQuestData,
} from "../components/SideQuestModal";

export const AdminSideQuestManagement: React.FC = () => {
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [questToEdit, setQuestToEdit] = useState<SideQuestData | null>(null);

  // --- NEW STANDARD MENU STATE ---
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuest, setSelectedQuest] = useState<SideQuestData | null>(
    null
  );

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchQuests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "sideQuests"));
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SideQuestData)
      );
      setQuests(list.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  // --- MENU HANDLERS ---
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    quest: SideQuestData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuest(quest);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    // Do not nullify selectedQuest here, we might need it for the action
  };

  // --- ACTION HANDLERS ---
  const handleAddClick = () => {
    setQuestToEdit(null);
    setModalOpen(true);
  };

  const handleEditAction = () => {
    if (selectedQuest) {
      setQuestToEdit(selectedQuest);
      setModalOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteAction = () => {
    // Just open the confirmation dialog, don't delete yet
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuest?.id) return;
    const functions = getFunctions(undefined, "asia-southeast1");
    await httpsCallable(functions, "deleteSideQuest")({ id: selectedQuest.id });
    setDeleteDialogOpen(false);
    fetchQuests();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Side Quests</Typography>
        <Button variant="contained" onClick={handleAddClick}>
          + Add Quest
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell>Name</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Manager</TableCell>
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
              quests.map((q) => (
                <TableRow key={q.id}>
                  <TableCell sx={{ fontWeight: "bold" }}>{q.name}</TableCell>
                  <TableCell>{q.points}</TableCell>
                  <TableCell>
                    <Chip label={q.submissionType.toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>{q.isSmManaged ? "SM" : "Self"}</TableCell>
                  <TableCell align="right">
                    {/* --- STANDARDIZED ACTION MENU --- */}
                    <IconButton onClick={(e) => handleMenuOpen(e, q)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- THE SHARED MENU --- */}
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

      <SideQuestModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchQuests}
        initialData={questToEdit}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {selectedQuest?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Irreversible.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
