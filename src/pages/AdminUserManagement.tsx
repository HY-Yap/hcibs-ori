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
  IconButton, // <-- New
  Menu, // <-- New
  MenuItem, // <-- New
  ListItemIcon, // <-- New
  Dialog, // <-- New
  DialogActions, // <-- New
  DialogContent, // <-- New
  DialogContentText, // <-- New
  DialogTitle, // <-- New
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions"; // <-- New
import { db } from "../firebase";
import { AddUserModal } from "../components/AddUserModal";
import MoreVertIcon from "@mui/icons-material/MoreVert"; // <-- New
import DeleteIcon from "@mui/icons-material/Delete"; // <-- New

// Define the shape of our user data
interface UserData {
  id: string; // The Firestore document ID (which is the Auth UID)
  displayName: string;
  role: "ADMIN" | "SM" | "OGL";
  email?: string; // Optional field
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // --- New state for Delete logic ---
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // For the '...' menu
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null); // Which user are we acting on?
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // For the 'Are you sure?' dialog
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setDeleteError(null); // Clear delete errors on refresh
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

  const handleUserAdded = () => {
    setModalOpen(false);
    fetchUsers(); // Refresh the list
  };

  // --- Menu open/close handlers ---
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

  // --- Delete confirmation dialog open/close ---
  const openDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
    setAnchorEl(null); // Close the '...' menu
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    setSelectedUser(null);
  };

  // --- THE ACTUAL DELETE FUNCTION ---
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const functions = getFunctions();
      const deleteUserFn = httpsCallable(functions, "deleteUser");

      await deleteUserFn({ uid: selectedUser.id });

      // Success!
      closeDeleteConfirm();
      fetchUsers(); // Refresh the user list
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple user table">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell>Display Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>User ID (Auth UID)</TableCell>
              <TableCell align="right">Actions</TableCell>{" "}
              {/* <-- New Column */}
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
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              users.map((user) => (
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
                  {/* --- NEW ACTIONS CELL --- */}
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

      {/* --- NEW '...' MENU --- */}
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

      {/* --- NEW DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={isDeleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>Delete {selectedUser?.displayName}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this user? This will
            remove them from both Authentication and the database. This action
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

      {/* Add User Modal (already built) */}
      <AddUserModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </Box>
  );
};
