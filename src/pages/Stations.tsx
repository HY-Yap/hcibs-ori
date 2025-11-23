import { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  Card,
  CardContent,
  useTheme,
  Alert,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapIcon from "@mui/icons-material/Map";
import StarIcon from "@mui/icons-material/Star";
import PersonIcon from "@mui/icons-material/Person";
import SmartphoneIcon from "@mui/icons-material/Smartphone";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  location?: string;
  description?: string;
  points: number;
}

export const StationsPage: FC = () => {
  const theme = useTheme();
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          "https://asia-southeast1-hcibso.cloudfunctions.net/getPublicGameInfo"
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setStations(data.stations);
      } catch (err) {
        console.error(err);
        setError("Could not load stations. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 4, mx: 2 }}>
        {error}
      </Alert>
    );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", pb: 8, px: 2 }}>
      {/* PAGE HEADER */}
      <Box sx={{ textAlign: "center", mb: 6, mt: 4 }}>
        <MapIcon sx={{ fontSize: 60, color: "primary.main", mb: 1 }} />
        <Typography
          variant="h3"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Race Stations
        </Typography>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          Your journey across Singapore. Visit these locations to earn points
          and glory for your team.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stations.map((station) => {
          // Determine Color Theme based on Type
          // Manned = Warning/Orange (Action)
          // Unmanned = Info/Blue (Digital)
          const isManned = station.type === "manned";
          const headerColor = isManned
            ? theme.palette.warning.main
            : theme.palette.info.main;
          const headerText = theme.palette.getContrastText(headerColor);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={station.id}>
              <Card
                elevation={3}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  overflow: "hidden", // Ensures header bg doesn't spill out
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
                }}
              >
                {/* COHESIVE COLORED HEADER */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: headerColor,
                    color: headerText,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  {/* Top Row: Title */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon sx={{ color: "inherit" }} />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                    >
                      {station.name}
                    </Typography>
                  </Box>

                  {/* Bottom Row: Tags (All in header now) */}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {/* Points Tag */}
                    <Chip
                      label={
                        isManned
                          ? `Up to ${station.points} pts`
                          : `${station.points} pts`
                      }
                      size="small"
                      icon={<StarIcon style={{ color: headerColor }} />}
                      sx={{
                        bgcolor: "white",
                        color: "inherit",
                        fontWeight: "bold",
                        "& .MuiChip-icon": { color: headerColor },
                      }}
                    />
                    {/* Type Tag */}
                    <Chip
                      label={isManned ? "MANNED" : "UNMANNED"}
                      size="small"
                      icon={
                        isManned ? (
                          <PersonIcon style={{ color: headerColor }} />
                        ) : (
                          <SmartphoneIcon style={{ color: headerColor }} />
                        )
                      }
                      variant="outlined"
                      sx={{
                        bgcolor: "white",
                        color: "inherit",
                        fontWeight: "bold",
                        border: "1px solid rgba(255,255,255,0.4)",
                      }}
                    />
                  </Box>
                </Box>

                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  {station.location && (
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 2,
                        color: "text.secondary",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      }}
                    >
                      📍 {station.location}
                    </Typography>
                  )}

                  <Typography
                    variant="body1"
                    color="text.primary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {station.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
