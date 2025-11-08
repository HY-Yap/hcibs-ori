import React, { useState } from "react";
import type { FC } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions"; // <-- 1. IMPORT FUNCTIONS

// This is the style for the pop-up box
const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 400 },
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

// Define the props our modal will need
interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserAdded: () => void; // A function to tell the parent page to refresh the list
}

export const AddUserModal: FC<AddUserModalProps> = ({
  open,
  onClose,
  onUserAdded,
}) => {
  // Form state
  const [username, setUsername] = useState(""); // e.g., "SM-01" or "Group-01"
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); // e.g., "SM 1" or "Group 1"
  const [role, setRole] = useState<"SM" | "OGL" | "ADMIN" | "">("");

  // Logic state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    // Reset form on close
    onClose();
    setUsername("");
    setPassword("");
    setDisplayName("");
    setRole("");
    setError(null);
  };

  // --- 2. THIS IS THE NEW, REAL SUBMIT FUNCTION ---
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get a reference to our deployed 'createUser' function
      const functions = getFunctions();
      const createUserFn = httpsCallable(functions, "createUser");

      // 2. Prepare the data to send to the function
      const data = {
        username,
        password,
        displayName,
        role,
      };

      // 3. Call the function and wait for the result
      const result = await createUserFn(data);

      // 4. If successful, tell the parent page to refresh
      console.log("Function result:", result.data);
      onUserAdded(); // This will close the modal and refresh the list!
    } catch (err: any) {
      // 5. If it fails, show the error message
      console.error("Error calling createUser function:", err);
      // 'err.message' will be the nice, human-readable error
      // we wrote in the Cloud Function (e.g., "Only an Admin can create users.")
      setError(err.message || "An unknown error occurred.");
    } finally {
      // 6. Stop the spinner
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          Add New User
        </Typography>

        <TextField
          label="Username (e.g., SM-01)"
          variant="outlined"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Display Name (e.g., SM 1)"
          variant="outlined"
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel id="role-select-label">Role</InputLabel>
          <Select
            labelId="role-select-label"
            value={role}
            label="Role"
            onChange={(e) =>
              setRole(e.target.value as "SM" | "OGL" | "ADMIN" | "")
            }
          >
            <MenuItem value="">
              <em>Select a role...</em>
            </MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="SM">Station Master (SM)</MenuItem>
            <MenuItem value="OGL">Orientation Group Leader (OGL)</MenuItem>
          </Select>
        </FormControl>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !username || !password || !displayName || !role}
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={24} /> : "Add User"}
        </Button>
      </Box>
    </Modal>
  );
};
