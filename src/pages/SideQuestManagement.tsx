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
import DeleteIcon from "@mui/icons-material/Delete";
import { SideQuestModal } from "../components/SideQuestModal";

interface SideQuestData {
  id: string;
  name: string;
  points: number;
  submissionType: "photo" | "video" | "none";
  isSmManaged: boolean;
}

export const AdminSideQuestManagement: React.FC = () => {
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questToDelete, setQuestToDelete] = useState<SideQuestData | null>(
    null
  );

  const fetchQuests = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "sideQuests"));
    setQuests(
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as SideQuestData))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!questToDelete) return;
    const functions = getFunctions(undefined, "asia-southeast1");
    await httpsCallable(functions, "deleteSideQuest")({ id: questToDelete.id });
    setDeleteDialogOpen(false);
    fetchQuests();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Side Quests</Typography>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
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
                    <IconButton
                      color="error"
                      onClick={() => {
                        setQuestToDelete(q);
                        setDeleteDialogOpen(true);
                      }}
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

      <SideQuestModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={fetchQuests}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {questToDelete?.name}?</DialogTitle>
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
