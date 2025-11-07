import React from "react";
import { Box, Typography } from "@mui/material";

export const AdminUserManagement: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      <Typography paragraph>
        Here you will be able to create, view, and delete all users.
      </Typography>
    </Box>
  );
};
