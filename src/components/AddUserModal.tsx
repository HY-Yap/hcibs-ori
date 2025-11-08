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
  const [role, setRole] = useState<"SM" | "OGL" | "ADMIN" | "">(""); // <-- UPDATED

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

  const handleSubmit = async () => {
    // This is where we will call our Cloud Function
    // For now, let's just log the data.
    console.log({
      username,
      password,
      displayName,
      role,
    });

    // We will add the real logic in the next step
    // For now, just show a placeholder error
    setError("Creating users is not implemented yet.");
    setLoading(false);
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
            } // <-- UPDATED
          >
            <MenuItem value="">
              <em>Select a role...</em>
            </MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem> {/* <-- ADDED */}
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
