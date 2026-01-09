import React from "react";
import { Box, Typography, Button, Paper, Container } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

export const MRTMapPage: React.FC = () => {
  const handleDownload = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = "/mrt-map.jpg";
    link.download = "annotated-mrt-map.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" component="h1">
            Annotated MRT Map
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            color="primary"
          >
            Download Map
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            overflow: "auto",
          }}
        >
          <img
            src="/mrt-map.jpg"
            alt="Annotated MRT Map"
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </Box>
      </Paper>
    </Container>
  );
};
