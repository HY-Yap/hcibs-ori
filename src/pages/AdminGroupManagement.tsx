import React, { useState, useEffect, useMemo } from "react";
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
  Menu,
  MenuItem, // <-- This is the correct name
  ListItemIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { GroupModal } from "../components/GroupModal";
import { EditScoreModal } from "../components/EditScoreModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

interface GroupData {
  id: string;
  name: string;
}

interface OglUserData {
  id: string;
  displayName: string;
  groupId?: string;
}

export const AdminGroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [ogls, setOgls] = useState<OglUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [isScoreModalOpen, setScoreModalOpen] = useState(false);

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );
      setGroups(
        list.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        )
      );
    });

    const q = query(collection(db, "users"), where("role", "==", "OGL"));
    const unsubOgls = onSnapshot(q, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as OglUserData)
      );
      setOgls(list.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setLoading(false);
    });

    return () => {
      unsubGroups();
      unsubOgls();
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;
    setDeleteLoading(true);
    try {
      const deleteGroupFn = httpsCallable(firebaseFunctions, "deleteGroup");
      await deleteGroupFn({ id: selectedGroup.id });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignOgl = async (groupId: string, userId: string) => {
    setAssigning(true);
    try {
      const assignFn = httpsCallable(firebaseFunctions, "assignOglToGroup");
      await assignFn({
        groupId,
        userId: userId === "unassigned" ? null : userId,
      });
    } catch (err: any) {
      alert("Failed to assign OGL: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    group: GroupData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };
  const handleEditScoreAction = () => {
    setScoreModalOpen(true);
    setAnchorEl(null);
  };
  const handleDeleteAction = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };
  const handleGroupModalSuccess = () => {
    setModalOpen(false);
  };
  const handleScoreModalSuccess = () => {
    setScoreModalOpen(false);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Group Management</Typography>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          + Add Group
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f4f4f4" }}>
              <TableCell>Group Name</TableCell>
              <TableCell>Assigned OGL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => {
                const assignedOglId =
                  ogls.find((user) => user.groupId === g.id)?.id ||
                  "unassigned";
                return (
                  <TableRow key={g.id}>
                    <TableCell sx={{ fontWeight: "bold" }}>{g.name}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={assignedOglId}
                          onChange={(e) =>
                            handleAssignOgl(g.id, e.target.value)
                          }
                          disabled={assigning}
                          displayEmpty
                        >
                          {/* --- FIXED: DropdownItem -> MenuItem --- */}
                          <MenuItem value="unassigned">
                            <em>Unassigned</em>
                          </MenuItem>
                          {ogls.map((ogl) => {
                            const isAvailable =
                              !ogl.groupId || ogl.groupId === g.id;
                            return (
                              <MenuItem
                                key={ogl.id}
                                value={ogl.id}
                                disabled={!isAvailable}
                              >
                                {ogl.displayName}{" "}
                                {ogl.groupId && ogl.groupId !== g.id
                                  ? "(Assigned)"
                                  : ""}
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuOpen(e, g)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditScoreAction}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Score
        </MenuItem>
        <MenuItem onClick={handleDeleteAction}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete Group</Typography>
        </MenuItem>
      </Menu>

      <GroupModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleGroupModalSuccess}
      />

      <EditScoreModal
        open={isScoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        onSuccess={handleScoreModalSuccess}
        group={selectedGroup}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {selectedGroup?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Irreversible.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
