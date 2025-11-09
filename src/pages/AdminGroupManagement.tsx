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
  Menu,
  MenuItem,
  ListItemIcon,
  Select,
  MenuItem as DropdownItem,
  FormControl,
} from "@mui/material";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { GroupModal } from "../components/GroupModal";

interface GroupData {
  id: string;
  name: string;
  // We don't need score/status here anymore
}

interface OglUserData {
  id: string;
  displayName: string;
  groupId?: string; // The group they are currently assigned to
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
  const [assigning, setAssigning] = useState(false); // Loading state for dropdowns

  // 1. FETCH GROUPS (Real-time)
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

    // 2. FETCH OGL USERS (Real-time)
    // We only want users where role == 'OGL'
    const q = query(collection(db, "users"), where("role", "==", "OGL"));
    const unsubOgls = onSnapshot(q, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as OglUserData)
      );
      setOgls(list.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setLoading(false); // Both listeners are active now
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
      const functions = getFunctions(undefined, "asia-southeast1");
      await httpsCallable(functions, "deleteGroup")({ id: selectedGroup.id });
      setDeleteDialogOpen(false);
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- NEW! HANDLE OGL ASSIGNMENT ---
  const handleAssignOgl = async (groupId: string, userId: string) => {
    setAssigning(true);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const assignFn = httpsCallable(functions, "assignOglToGroup");
      // If userId is "unassigned", we send null/empty to clear it
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

  // Helper to find which OGL is currently assigned to a group
  const getAssignedOglId = (groupId: string) => {
    const ogl = ogls.find((user) => user.groupId === groupId);
    return ogl ? ogl.id : "unassigned";
  };

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
              groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell sx={{ fontWeight: "bold" }}>{g.name}</TableCell>

                  {/* --- NEW ASSIGNMENT DROPDOWN --- */}
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={getAssignedOglId(g.id)}
                        onChange={(e) => handleAssignOgl(g.id, e.target.value)}
                        disabled={assigning}
                        displayEmpty
                      >
                        <DropdownItem value="unassigned">
                          <em>Unassigned</em>
                        </DropdownItem>
                        {ogls.map((ogl) => {
                          // Only show OGLs who are unassigned OR assigned to *this* group
                          // (This prevents accidentally stealing an OGL from another group without realizing it)
                          const isAvailable =
                            !ogl.groupId || ogl.groupId === g.id;
                          // Optional: You could disable them instead of hiding them if you prefer
                          return (
                            <DropdownItem
                              key={ogl.id}
                              value={ogl.id}
                              disabled={!isAvailable}
                            >
                              {ogl.displayName}{" "}
                              {ogl.groupId && ogl.groupId !== g.id
                                ? "(Already Assigned)"
                                : ""}
                            </DropdownItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedGroup(g);
                      }}
                    >
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
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

      <GroupModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}}
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
