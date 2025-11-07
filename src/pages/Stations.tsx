import React from "react";
import { Box, Typography } from "@mui/material";

export const StationsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Stations
      </Typography>
      <Typography paragraph>
        The list of all manned and unmanned stations will be here.
      </Typography>
    </Box>
  );
};
