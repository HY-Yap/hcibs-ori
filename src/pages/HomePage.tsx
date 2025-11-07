import React from "react";
import { Box, Typography } from "@mui/material";

export const HomePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to the HCIBSO Amazing Race
      </Typography>
      <Typography paragraph>
        This is the public-facing home page. Please log in to participate.
      </Typography>
    </Box>
  );
};
