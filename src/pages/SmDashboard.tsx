import React from "react";
import { Box, Typography } from "@mui/material";

export const SmDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Station Master Dashboard
      </Typography>
      <Typography paragraph>Only SMs can see this.</Typography>
    </Box>
  );
};
