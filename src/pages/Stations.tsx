import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export const StationsPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 4,
          color: "#473321",
        }}
      >
        <LocationOnIcon sx={{ fontSize: 48, color: "#b97539" }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Stations
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 4,
          bgcolor: "#fef5e7",
          border: "2px solid #eec45c",
          textAlign: "center",
        }}
      >
        <Typography paragraph sx={{ color: "#8d6e63", fontSize: "1.1rem" }}>
          The list of all manned and unmanned stations will appear here.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};
