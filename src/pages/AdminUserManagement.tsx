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
  MenuItem,
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
  TableSortLabel,
  Checkbox,
  Fade, // ADDED
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase"; // Use the named 'functions' export
import { AddUserModal } from "../components/AddUserModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";

// Define the shape of our user data
interface UserData {
  id: string;
  displayName: string;
  role: "ADMIN" | "SM" | "OGL";
  email?: string;
  username?: string; // <-- 1. ADDED USERNAME
}

type UserRole = "ADMIN" | "SM" | "OGL" | "ALL";
type SortableColumn = "displayName" | "role" | "email" | "username"; // <-- 2. ADDED USERNAME
type Order = "asc" | "desc";

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Delete ONE user state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter/Search/Sort state
  const [filterRole, setFilterRole] = useState<UserRole>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<SortableColumn>("displayName");
  const [order, setOrder] = useState<Order>("asc");

  // --- NEW! MULTI-SELECT STATE ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // --- NEW! DANGER ZONE STATE ---
  const [isDeleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [deleteAllSuccess, setDeleteAllSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setDeleteError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch user list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRequestSort = (property: SortableColumn) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // --- NEW! MULTI-SELECT HANDLERS ---
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = filteredAndSortedUsers.map((n) => n.id);
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
      const deleteUserFn = httpsCallable(firebaseFunctions, "deleteUser");
      await Promise.all(selectedIds.map((uid) => deleteUserFn({ uid })));
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert("Error deleting users: " + err.message);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter((user) => {
        if (filterRole !== "ALL" && user.role !== filterRole) return false;
        if (
          searchTerm &&
          !user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !user.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          // --- 3. ADD USERNAME TO SEARCH ---
          !user.username?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Handle sorting for potentially undefined fields
        const valueA = (a[orderBy] || "").toString().toLowerCase();
        const valueB = (b[orderBy] || "").toString().toLowerCase();

        if (valueB < valueA) return order === "asc" ? 1 : -1;
        if (valueB > valueA) return order === "asc" ? -1 : 1;
        return 0;
      });
  }, [users, filterRole, searchTerm, orderBy, order]);

  const handleUserAdded = () => {
    setModalOpen(false);
    fetchUsers();
  };
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    user: UserData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };
  const openDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
    setAnchorEl(null);
  };
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    setSelectedUser(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      // Use the imported 'functions' instance
      const deleteUserFn = httpsCallable(firebaseFunctions, "deleteUser");
      await deleteUserFn({ uid: selectedUser.id });
      closeDeleteConfirm();
      fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setDeleteError(err.message || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteAll = () => {
    setDeleteAllOpen(true);
    setDeleteAllConfirmation("");
    setDeleteAllError(null);
    setDeleteAllSuccess(null);
  };
  const closeDeleteAll = () => {
    setDeleteAllOpen(false);
  };
  const handleDeleteAllUsers = async () => {
    if (deleteAllConfirmation !== "DELETE") return;
    setDeleteAllLoading(true);
    setDeleteAllError(null);
    try {
      const deleteAllUsersFn = httpsCallable(
        firebaseFunctions,
        "deleteAllUsers"
      );
      const result = await deleteAllUsersFn();
      const data = result.data as any;

      setDeleteAllSuccess(data.message);
      closeDeleteAll();
      fetchUsers();
    } catch (err: any) {
      console.error("Error deleting all users:", err);
      setDeleteAllError(err.message || "Failed to delete all users.");
    } finally {
      setDeleteAllLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Fade in={selectedIds.length > 0} unmountOnExit>
            <Button
              variant="contained"
              color="error"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </Fade>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setModalOpen(true)}
          >
            + Add New User
          </Button>
        </Box>
      </Box>
      {deleteAllSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setDeleteAllSuccess(null)}
        >
          {deleteAllSuccess}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box sx={{ flexGrow: 1, flexBasis: { xs: "100%", sm: "66.66%" } }}>
            <TextField
              label="Search by name, email, or username" // <-- Updated label
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
          <Box sx={{ flexGrow: 1, flexBasis: { xs: "100%", sm: "33.33%" } }}>
            <FormControl fullWidth>
              <InputLabel id="filter-role-label">Filter by Role</InputLabel>
              <Select
                labelId="filter-role-label"
                value={filterRole}
                label="Filter by Role"
                onChange={(e) => setFilterRole(e.target.value as UserRole)}
              >
                <MenuItem value="ALL">All Roles</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="SM">Station Master (SM)</MenuItem>
                <MenuItem value="OGL">Orientation Group Leader (OGL)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple user table">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    selectedIds.length > 0 &&
                    selectedIds.length < filteredAndSortedUsers.length
                  }
                  checked={
                    filteredAndSortedUsers.length > 0 &&
                    selectedIds.length === filteredAndSortedUsers.length
                  }
                  onChange={handleSelectAllClick}
                  inputProps={{
                    "aria-label": "select all users",
                  }}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "displayName"}
                  direction={orderBy === "displayName" ? order : "asc"}
                  onClick={() => handleRequestSort("displayName")}
                >
                  Display Name
                </TableSortLabel>
              </TableCell>
              {/* --- 4. ADDED USERNAME HEADER --- */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === "username"}
                  direction={orderBy === "username" ? order : "asc"}
                  onClick={() => handleRequestSort("username")}
                >
                  Username
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "role"}
                  direction={orderBy === "role" ? order : "asc"}
                  onClick={() => handleRequestSort("role")}
                >
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? order : "asc"}
                  onClick={() => handleRequestSort("email")}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>User ID (Auth UID)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                {/* --- 6. UPDATED COLSPAN --- */}
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredAndSortedUsers.length === 0 && (
              <TableRow>
                {/* --- 6. UPDATED COLSPAN --- */}
                <TableCell colSpan={7} align="center">
                  {users.length === 0
                    ? "No users found."
                    : "No users match filters."}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredAndSortedUsers.map((user) => {
                const isSelected = selectedIds.indexOf(user.id) !== -1;
                return (
                  <TableRow
                    key={user.id}
                    hover
                    onClick={() => handleClick(user.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    selected={isSelected}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 }, cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isSelected}
                        inputProps={{
                          "aria-labelledby": `enhanced-table-checkbox-${user.id}`,
                        }}
                      />
                    </TableCell>
                    <TableCell component="th" scope="row">
                      {user.displayName}
                    </TableCell>
                    {/* --- 5. ADDED USERNAME CELL --- */}
                    <TableCell>{user.username || "N/A"}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                    <TableCell>
                      <code>{user.id}</code>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="more"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleMenuOpen(e, user);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* --- DANGER ZONE SECTION --- */}
      <Box
        sx={{
          mt: 8,
          p: 3,
          border: "1px solid #d32f2f",
          borderRadius: 1,
          backgroundColor: "#fff5f5",
        }}
      >
        <Typography
          variant="h5"
          color="error"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <WarningIcon /> Danger Zone
        </Typography>
        <Typography paragraph>
          These actions are destructive and cannot be undone. Use with extreme
          caution.
        </Typography>
        <Button variant="outlined" color="error" onClick={openDeleteAll}>
          Delete ALL Users
        </Button>
        {deleteAllError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deleteAllError}
          </Alert>
        )}
      </Box>
      {/* Menu & Single Delete Dialog (Same as before) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={openDeleteConfirm}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete User</Typography>
        </MenuItem>
      </Menu>
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={closeDeleteConfirm}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete {selectedUser?.displayName}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this user? This action
            cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* --- NEW: BULK DELETE CONFIRMATION DIALOG --- */}
      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete {selectedIds.length} Users?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete these {selectedIds.length} users? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleteLoading}>
            Cancel
          </Button>
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

      {/* --- DELETE ALL CONFIRMATION DIALOG --- */}
      <Dialog
        open={isDeleteAllOpen}
        onClose={closeDeleteAll}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <WarningIcon /> DELETE ALL USERS?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontWeight: "bold" }}>
            WARNING: This will delete EVERY user account (OGLs, SMs) except for
            your own Admin account. This action is IRREVERSIBLE.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            To confirm, please type <strong>DELETE</strong> in the box below.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            placeholder="Type DELETE to confirm"
            value={deleteAllConfirmation}
            onChange={(e) => setDeleteAllConfirmation(e.target.value)}
            error={
              deleteAllConfirmation.length > 0 &&
              deleteAllConfirmation !== "DELETE"
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteAll} disabled={deleteAllLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAllUsers}
            color="error"
            variant="contained"
            disabled={deleteAllLoading || deleteAllConfirmation !== "DELETE"}
          >
            {deleteAllLoading ? (
              <CircularProgress size={24} />
            ) : (
              "I UNDERSTAND, DELETE ALL"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      <AddUserModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </Box>
  );
};
