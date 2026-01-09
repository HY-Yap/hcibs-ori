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
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Annotated MRT Map
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            color="primary"
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: "auto" },
            }}
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
            borderRadius: 1,
            bgcolor: "grey.100",
            p: { xs: 1, sm: 2 },
          }}
        >
          <img
            src="/mrt-map.jpg"
            alt="Annotated MRT Map"
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
              borderRadius: "4px",
            }}
          />
        </Box>
      </Paper>
    </Container>
  );
};
