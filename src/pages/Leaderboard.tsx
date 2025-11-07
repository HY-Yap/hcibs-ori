import React from "react";
import { Box, Typography } from "@mui/material";

export const LeaderboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Live Leaderboard
      </Typography>
      <Typography paragraph>The leaderboard will be displayed here.</Typography>
    </Box>
  );
};
