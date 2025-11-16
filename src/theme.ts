import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#b97539", // Grey Orange (Bronze) - Your main buttons
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#473321", // Dark Grey Brown - Your accents
    },
    background: {
      default: "#faf9f6", // "Alabaster" - A very subtle, warm off-white (not stark white)
      paper: "#ffffff",
    },
    text: {
      primary: "#473321", // Dark Brown for main text (instead of black)
      secondary: "#8d6e63", // Lighter brown for secondary text
    },
    warning: {
      main: "#eec45c", // Your Gold/Orange color (Good for alerts/highlights)
      contrastText: "#473321",
    },
    info: {
      main: "#d4a574", // Light bronze/tan
      contrastText: "#473321",
    },
  },
  typography: {
    // We can customize headers to use the Bronze color automatically
    h1: { color: "#473321", fontWeight: 700 },
    h2: { color: "#473321", fontWeight: 700 },
    h3: { color: "#473321", fontWeight: 700 },
    h4: { color: "#473321", fontWeight: 700 },
    h5: { color: "#473321", fontWeight: 600 },
    h6: { color: "#473321", fontWeight: 600 },
  },
  components: {
    // Customizing the Header Bar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#473321", // Dark Brown Header
          color: "#eec45c", // Gold Text/Icons on Header
        },
      },
    },
    // Making buttons feel a bit more "magical" (rounded)
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none", // Optional: Removes ALL CAPS for a friendlier look
          fontWeight: "bold",
        },
      },
    },
    // Customizing Cards to pop a bit more
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});
