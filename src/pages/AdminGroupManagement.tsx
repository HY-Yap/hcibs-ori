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
  Menu,
  MenuItem, // <-- This is the correct name
  ListItemIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Select,
  Checkbox,
  Fade,
  Chip,
  TextField, // ADDED
} from "@mui/material";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
// REMOVED: import { GroupModal } from "../components/GroupModal";
import { EditScoreModal } from "../components/EditScoreModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

interface GroupData {
  id: string;
  name: string;
  totalScore?: number; // UPDATED: Changed from score to totalScore
  completedStations?: string[]; // ADDED
  completedSideQuests?: string[]; // ADDED
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

  // --- NEW: Add Group State ---
  const [groupCount, setGroupCount] = useState(1);
  const [newGroupNames, setNewGroupNames] = useState<string[]>([""]);
  const [createLoading, setCreateLoading] = useState(false);

  // ADDED: Totals for progress calculation
  const [totalStations, setTotalStations] = useState(0);
  const [totalSideQuests, setTotalSideQuests] = useState(0);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [isScoreModalOpen, setScoreModalOpen] = useState(false);

  // --- NEW: Multi-select State ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

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

    // ADDED: Listen for totals
    const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
      setTotalStations(snap.size);
    });
    const unsubSideQuests = onSnapshot(collection(db, "sideQuests"), (snap) => {
      setTotalSideQuests(snap.size);
    });

    return () => {
      unsubGroups();
      unsubOgls();
      unsubStations(); // ADDED
      unsubSideQuests(); // ADDED
    };
  }, []);

  // --- NEW: Multi-select Handlers ---
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = groups.map((n) => n.id);
      setSelectedIds(newSelecteds);
      return;
    }
    setSelectedIds([]);
  };

  const handleClick = (id: string) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelected = newSelected.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1)
      );
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const deleteGroupFn = httpsCallable(firebaseFunctions, "deleteGroup");
      await Promise.all(selectedIds.map((id) => deleteGroupFn({ id })));
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (err: any) {
      alert("Bulk delete failed: " + err.message);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

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

  // --- NEW: Add Group Handlers ---
  const handleGroupCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(50, count));
    setGroupCount(newCount);
    setNewGroupNames((prev) => {
      const newNames = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) newNames.push("");
      } else {
        newNames.length = newCount;
      }
      return newNames;
    });
  };

  const handleGroupNameChange = (index: number, value: string) => {
    const newNames = [...newGroupNames];
    newNames[index] = value;
    setNewGroupNames(newNames);
  };

  const handleCreateGroups = async () => {
    setCreateLoading(true);
    try {
      const createGroupFn = httpsCallable(firebaseFunctions, "createGroup");
      const namesToCreate = newGroupNames.filter((n) => n.trim() !== "");
      
      if (namesToCreate.length === 0) {
        alert("Please enter at least one group name.");
        setCreateLoading(false);
        return;
      }

      await Promise.all(namesToCreate.map((name) => createGroupFn({ name })));

      setModalOpen(false);
      setGroupCount(1);
      setNewGroupNames([""]);
    } catch (err: any) {
      alert("Error creating groups: " + err.message);
    } finally {
      setCreateLoading(false);
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
        <Box sx={{ display: "flex", gap: 2 }}>
          <Fade in={selectedIds.length > 0} unmountOnExit>
            <Button
              variant="contained"
              color="error"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </Fade>
          <Button variant="contained" onClick={() => setModalOpen(true)}>
            + Add Group
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f4f4f4" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    selectedIds.length > 0 && selectedIds.length < groups.length
                  }
                  checked={
                    groups.length > 0 && selectedIds.length === groups.length
                  }
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>Group Name</TableCell>
              <TableCell>Score</TableCell> {/* ADDED */}
              <TableCell>Stations</TableCell> {/* ADDED */}
              <TableCell>Side Quests</TableCell> {/* ADDED */}
              <TableCell>Assigned OGL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center"> {/* UPDATED colSpan */}
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => {
                const assignedOglId =
                  ogls.find((user) => user.groupId === g.id)?.id ||
                  "unassigned";
                const isSelected = selectedIds.indexOf(g.id) !== -1;

                return (
                  <TableRow
                    key={g.id}
                    hover
                    onClick={() => handleClick(g.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    selected={isSelected}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox color="primary" checked={isSelected} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>{g.name}</TableCell>
                    
                    {/* ADDED: Score */}
                    <TableCell>
                      <Chip 
                        label={g.totalScore || 0} // UPDATED: Use totalScore
                        size="small" 
                        color="primary" 
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>

                    {/* ADDED: Stations Progress */}
                    <TableCell>
                      <Typography variant="body2">
                        {g.completedStations?.length || 0} / {totalStations}
                      </Typography>
                    </TableCell>

                    {/* ADDED: Side Quests Progress */}
                    <TableCell>
                      <Typography variant="body2">
                        {g.completedSideQuests?.length || 0} / {totalSideQuests}
                      </Typography>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, g);
                        }}
                      >
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

      {/* --- REPLACED GroupModal with Custom Dialog --- */}
      <Dialog 
        open={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>Add Groups</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <TextField
              label="Number of Groups"
              type="number"
              fullWidth
              value={groupCount}
              onChange={(e) => handleGroupCountChange(parseInt(e.target.value) || 0)}
              inputProps={{ min: 1, max: 50 }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto', p: 1 }}>
            {newGroupNames.map((name, index) => (
              <TextField
                key={index}
                label={`Group Name ${index + 1}`}
                value={name}
                onChange={(e) => handleGroupNameChange(index, e.target.value)}
                fullWidth
                autoFocus={index === 0}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGroups} 
            variant="contained" 
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : `Create ${newGroupNames.filter(n => n.trim()).length} Groups`}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
      >
        <DialogTitle>Delete {selectedIds.length} Groups?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This will delete all selected groups.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleteLoading}
          >
            {bulkDeleteLoading ? <CircularProgress size={24} /> : "Delete Selected"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
