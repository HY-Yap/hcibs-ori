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
  TextField,
  FormControl,
  InputLabel,
  Select,
  TableSortLabel,
  Checkbox,
  Fade, // ADDED
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  orderBy as firestoreOrderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  SideQuestModal,
  type SideQuestData,
} from "../components/SideQuestModal";

type SubmissionType = "none" | "photo" | "video" | "ALL";
type ManagerType = "SM" | "Self" | "ALL";
type SortableColumn = "name" | "points" | "submissionType" | "isSmManaged";
type Order = "asc" | "desc";

export const SideQuestManagement: React.FC = () => {
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [questToEdit, setQuestToEdit] = useState<SideQuestData | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuest, setSelectedQuest] = useState<SideQuestData | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- NEW: Multi-select State ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<SubmissionType>("ALL");
  const [filterManager, setFilterManager] = useState<ManagerType>("ALL");
  const [orderBy, setOrderBy] = useState<SortableColumn>("name");
  const [order, setOrder] = useState<Order>("asc");

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "sideQuests"), firestoreOrderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as SideQuestData)
        );
        setQuests(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredAndSortedQuests = useMemo(() => {
    return quests
      .filter((q) => {
        if (filterType !== "ALL" && q.submissionType !== filterType)
          return false;
        if (filterManager === "SM" && !q.isSmManaged) return false;
        if (filterManager === "Self" && q.isSmManaged) return false;
        if (
          searchTerm &&
          !q.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valueA = (a[orderBy] || "").toString().toLowerCase();
        const valueB = (b[orderBy] || "").toString().toLowerCase();

        if (orderBy === "points") {
          return order === "asc" ? a.points - b.points : b.points - a.points;
        }

        if (valueB < valueA) return order === "asc" ? 1 : -1;
        if (valueB > valueA) return order === "asc" ? -1 : 1;
        return 0;
      });
  }, [quests, searchTerm, filterType, filterManager, orderBy, order]);

  const handleRequestSort = (property: SortableColumn) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // --- NEW: Multi-select Handlers ---
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = filteredAndSortedQuests.map((n) => n.id as string);
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
      const deleteSideQuestFn = httpsCallable(
        firebaseFunctions,
        "deleteSideQuest"
      );
      await Promise.all(selectedIds.map((id) => deleteSideQuestFn({ id })));
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (err: any) {
      alert("Bulk delete failed: " + err.message);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    quest: SideQuestData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuest(quest);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleAddClick = () => {
    setQuestToEdit(null);
    setModalOpen(true);
  };
  const handleEditAction = () => {
    if (selectedQuest) setQuestToEdit(selectedQuest);
    setModalOpen(true);
    handleMenuClose();
  };
  const handleDeleteAction = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuest?.id) return;
    setDeleteLoading(true);
    try {
      const deleteSideQuestFn = httpsCallable(
        firebaseFunctions,
        "deleteSideQuest"
      );
      await deleteSideQuestFn({ id: selectedQuest.id });
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Side Quests</Typography>
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
          <Button variant="contained" onClick={handleAddClick}>
            + Add Quest
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "40%" },
              flexGrow: 1,
            }}
          >
            <TextField
              label="Search by name"
              variant="outlined"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "25%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) =>
                  setFilterType(e.target.value as SubmissionType)
                }
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="none">None (Honor)</MenuItem>
                <MenuItem value="photo">Photo</MenuItem>
                <MenuItem value="video">Video</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "30%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Manager</InputLabel>
              <Select
                value={filterManager}
                label="Manager"
                onChange={(e) =>
                  setFilterManager(e.target.value as ManagerType)
                }
              >
                <MenuItem value="ALL">All Managers</MenuItem>
                <MenuItem value="SM">Station Master</MenuItem>
                <MenuItem value="Self">Self (OGL)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    selectedIds.length > 0 &&
                    selectedIds.length < filteredAndSortedQuests.length
                  }
                  checked={
                    filteredAndSortedQuests.length > 0 &&
                    selectedIds.length === filteredAndSortedQuests.length
                  }
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleRequestSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "points"}
                  direction={orderBy === "points" ? order : "asc"}
                  onClick={() => handleRequestSort("points")}
                >
                  Points
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "submissionType"}
                  direction={orderBy === "submissionType" ? order : "asc"}
                  onClick={() => handleRequestSort("submissionType")}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "isSmManaged"}
                  direction={orderBy === "isSmManaged" ? order : "asc"}
                  onClick={() => handleRequestSort("isSmManaged")}
                >
                  Manager
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedQuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {quests.length === 0
                    ? "No side quests found."
                    : "No side quests match filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedQuests.map((q) => {
                const isSelected = selectedIds.indexOf(q.id as string) !== -1;
                return (
                  <TableRow
                    key={q.id}
                    hover
                    onClick={() => handleClick(q.id as string)}
                    role="checkbox"
                    aria-checked={isSelected}
                    selected={isSelected}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox color="primary" checked={isSelected} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>{q.name}</TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell>
                      <Chip
                        label={q.submissionType.toUpperCase()}
                        size="small"
                        color={
                          q.submissionType === "photo"
                            ? "primary"
                            : q.submissionType === "video"
                            ? "secondary"
                            : "default"
                        }
                        variant="outlined"
                        sx={{ fontWeight: "bold" }}
                      />
                    </TableCell>
                    <TableCell>{q.isSmManaged ? "SM" : "Self"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, q);
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
        onSuccess={() => {}}
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

      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
      >
        <DialogTitle>Delete {selectedIds.length} Quests?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This cannot be undone.
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
