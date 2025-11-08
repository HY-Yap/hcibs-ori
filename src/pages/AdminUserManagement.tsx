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
  Button, // <-- 1. IMPORT BUTTON
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { AddUserModal } from "../components/AddUserModal"; // <-- 2. IMPORT THE MODAL

// Define the shape of our user data
interface UserData {
  id: string;
  displayName: string;
  role: "ADMIN" | "SM" | "OGL";
  email?: string;
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 3. ADD STATE FOR THE MODAL ---
  const [isModalOpen, setModalOpen] = useState(false);

  const fetchUsers = async () => {
    // We move fetchUsers outside so we can call it again
    setLoading(true);
    setError(null);
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
  }, []); // The empty array [] means this runs once on mount

  const handleUserAdded = () => {
    // This is our callback function
    setModalOpen(false); // Close the modal
    fetchUsers(); // And refresh the user list!
  };

  if (loading && users.length === 0) {
    // Only show full-page spinner on initial load
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
        {/* --- 4. ADD THE BUTTON --- */}
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
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Show a mini-spinner if we are just refreshing */}
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
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
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- 5. ADD THE MODAL (IT'S INVISIBLE) --- */}
      <AddUserModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </Box>
  );
};
