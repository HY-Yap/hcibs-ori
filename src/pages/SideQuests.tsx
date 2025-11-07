import React from "react";
import { Box, Typography } from "@mui/material";

export const SideQuestsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Side Quests
      </Typography>
      <Typography paragraph>
        The list of all available side quests will be here.
      </Typography>
    </Box>
  );
};
