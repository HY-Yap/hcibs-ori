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
  TableSortLabel, // <-- NEW IMPORT
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { AddUserModal } from "../components/AddUserModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";

// Define the shape of our user data
interface UserData {
  id: string;
  displayName: string;
  role: "ADMIN" | "SM" | "OGL";
  email?: string;
}

type UserRole = "ADMIN" | "SM" | "OGL" | "ALL";
// --- NEW! Define sortable columns for type safety ---
type SortableColumn = "displayName" | "role" | "email";
type Order = "asc" | "desc";

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Delete state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter/Search state
  const [filterRole, setFilterRole] = useState<UserRole>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // --- NEW! Sorting State ---
  const [orderBy, setOrderBy] = useState<SortableColumn>("displayName");
  const [order, setOrder] = useState<Order>("asc");

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

  // --- NEW! Handle sort clicks ---
  const handleRequestSort = (property: SortableColumn) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // --- UPDATED! Memoized, Filtered, and SORTED List ---
  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter((user) => {
        if (filterRole !== "ALL" && user.role !== filterRole) return false;
        if (
          searchTerm &&
          !user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Dynamic sorting logic
        const valueA = (a[orderBy] || "").toLowerCase();
        const valueB = (b[orderBy] || "").toLowerCase();

        if (valueB < valueA) {
          return order === "asc" ? 1 : -1;
        }
        if (valueB > valueA) {
          return order === "asc" ? -1 : 1;
        }
        return 0;
      });
  }, [users, filterRole, searchTerm, orderBy, order]); // Re-run when sort state changes

  // ... (Existing handlers for UserAdded, Menu, Delete remain the same)
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
      const functions = getFunctions();
      const deleteUserFn = httpsCallable(functions, "deleteUser");
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

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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
        <Button
          variant="contained"
          color="primary"
          onClick={() => setModalOpen(true)}
        >
          + Add New User
        </Button>
      </Box>

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
              label="Search by name or email"
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
              {/* --- UPDATED HEADERS WITH SORT LABELS --- */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === "displayName"}
                  direction={orderBy === "displayName" ? order : "asc"}
                  onClick={() => handleRequestSort("displayName")}
                >
                  Display Name
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
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredAndSortedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {users.length === 0
                    ? "No users found."
                    : "No users match your filters."}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredAndSortedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {user.displayName}
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.email || "N/A"}</TableCell>
                  <TableCell>
                    <code>{user.id}</code>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label="more"
                      onClick={(e) => handleMenuOpen(e, user)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

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

      <AddUserModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </Box>
  );
};
