import React from "react";
import { Box, Typography } from "@mui/material";

export const OglDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        OGL Group Dashboard
      </Typography>
      <Typography paragraph>Only OGLs can see this.</Typography>
    </Box>
  );
};
