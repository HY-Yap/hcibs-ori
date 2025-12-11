import { useEffect, useState, useMemo } from "react";
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
import FlagIcon from "@mui/icons-material/Flag";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned" | "ending_location";
  location?: string;
  description?: string;
  points: number;
  area?: string; // ADDED
}

// REMOVED: AREA_ORDER, AREA_CONFIG, AREA_COLORS

// ADDED: Rainbow Colors
const RAINBOW_COLORS = [
  "#ffcdd2", // Red
  "#ffe0b2", // Orange
  "#fff9c4", // Yellow
  "#c8e6c9", // Green
  "#bbdefb", // Blue
  "#c5cae9", // Indigo
  "#ce93d8", // Purple (Changed for better contrast with Red)
];

const getStationArea = (station: StationData) => {
  return station.area || "Others";
};

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

        // Inject Marina Barrage if missing (Safety fallback)
        const stationsList = data.stations as StationData[];
        if (!stationsList.find((s) => s.name === "Marina Barrage")) {
          stationsList.push({
            id: "marina_barrage_virtual",
            name: "Marina Barrage",
            type: "ending_location",
            location: "Marina Barrage",
            description: "Dinner Location",
            points: 0,
            area: "Others", // ADDED
          });
        }

        const sorted = stationsList.sort((a: StationData, b: StationData) => {
          const areaA = getStationArea(a);
          const areaB = getStationArea(b);

          // 1. Sort by Area (Alphabetical, Others last)
          if (areaA !== areaB) {
            if (areaA === "Others") return 1;
            if (areaB === "Others") return -1;
            return areaA.localeCompare(areaB);
          }

          // 2. Sort by Type (Manned first, then Unmanned, then Ending)
          const typePriority: Record<string, number> = { manned: 0, unmanned: 1, ending_location: 2 };
          const pA = typePriority[a.type] ?? 99;
          const pB = typePriority[b.type] ?? 99;
          if (pA !== pB) return pA - pB;

          // 3. Sort by Name alphabetically
          return a.name.localeCompare(b.name);
        });

        setStations(sorted);
      } catch (err) {
        console.error(err);
        setError("Could not load stations. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group stations by area for rendering
  const stationsByArea = useMemo(() => {
    const groups: Record<string, StationData[]> = {};
    stations.forEach((s) => {
      const area = getStationArea(s);
      if (!groups[area]) groups[area] = [];
      groups[area].push(s);
    });
    return groups;
  }, [stations]);

  // Get sorted area keys
  const sortedAreaKeys = useMemo(() => {
    return Object.keys(stationsByArea).sort((a, b) => {
      if (a === "Others") return 1;
      if (b === "Others") return -1;
      return a.localeCompare(b);
    });
  }, [stationsByArea]);

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

      {sortedAreaKeys.map((area, index) => {
        const areaStations = stationsByArea[area];
        if (!areaStations || areaStations.length === 0) return null;
        
        // Determine Color
        const areaColor = area === "Others" 
          ? "#f5f5f5" 
          : RAINBOW_COLORS[index % RAINBOW_COLORS.length];

        return (
          <Box key={area} sx={{ mb: 6 }}>
            <Box
              sx={{
                bgcolor: areaColor,
                p: 2,
                borderRadius: 2,
                mb: 3,
                borderLeft: "6px solid",
                borderColor: "rgba(0,0,0,0.1)",
              }}
            >
              <Typography variant="h5" fontWeight="bold" color="text.primary">
                {area}
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {areaStations.map((station) => {
                // Determine Color Theme based on Type
                // Manned = Warning/Orange (Action)
                // Unmanned = Info/Blue (Digital)
                // Ending = Success/Green (Goal)
                const isManned = station.type === "manned";
                const isEnding = station.type === "ending_location";

                const headerColor = isManned
                  ? theme.palette.warning.main
                  : isEnding
                  ? "#2e7d32" // Dark Green for Ending Location (High contrast)
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
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 6,
                        },
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                              isEnding
                                ? "0 pts"
                                : isManned
                                ? `Up to ${station.points || 0} pts`
                                : `${station.points || 0} pts`
                            }
                            size="small"
                            icon={<StarIcon style={{ color: headerColor }} />}
                            sx={{
                              bgcolor: "white",
                              color: headerColor,
                              fontWeight: "bold",
                              "& .MuiChip-icon": { color: headerColor },
                            }}
                          />
                          {/* Type Tag */}
                          <Chip
                            label={
                              isManned
                                ? "MANNED"
                                : isEnding
                                ? "ENDING LOCATION"
                                : "UNMANNED"
                            }
                            size="small"
                            icon={
                              isManned ? (
                                <PersonIcon style={{ color: headerColor }} />
                              ) : isEnding ? (
                                <FlagIcon style={{ color: headerColor }} />
                              ) : (
                                <SmartphoneIcon
                                  style={{ color: headerColor }}
                                />
                              )
                            }
                            variant="outlined"
                            sx={{
                              bgcolor: "white",
                              color: headerColor,
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
                          component="div"
                        >
                          {/* MODIFIED: Enhanced Markdown Rendering */}
                          {(station.description || "").split("\n").map((line, i) => {
                            const parseStyles = (text: string) => {
                              // Added _.*?_ for underline
                              const parts = text.split(
                                /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|_.*?_)/g
                              );
                              return parts.map((part, j) => {
                                if (part.startsWith("***") && part.endsWith("***")) {
                                  return (
                                    <span
                                      key={j}
                                      style={{
                                        fontWeight: "bold",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {part.slice(3, -3)}
                                    </span>
                                  );
                                }
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return <strong key={j}>{part.slice(2, -2)}</strong>;
                                }
                                if (part.startsWith("*") && part.endsWith("*")) {
                                  return <em key={j}>{part.slice(1, -1)}</em>;
                                }
                                if (part.startsWith("_") && part.endsWith("_")) {
                                  return <u key={j}>{part.slice(1, -1)}</u>;
                                }
                                return <span key={j}>{part}</span>;
                              });
                            };

                            const parseInline = (text: string) => {
                              const linkParts = text.split(/(\[.*?\]\(.*?\))/g);
                              return linkParts.map((part, i) => {
                                const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                                if (linkMatch) {
                                  return (
                                    <a
                                      key={i}
                                      href={linkMatch[2]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "#1976d2",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {parseStyles(linkMatch[1])}
                                    </a>
                                  );
                                }
                                return parseStyles(part);
                              });
                            };

                            // Headers
                            if (line.startsWith("### "))
                              return (
                                <Typography
                                  key={i}
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: "bold",
                                    mt: 1,
                                    color: "text.primary",
                                  }}
                                >
                                  {parseInline(line.slice(4))}
                                </Typography>
                              );
                            if (line.startsWith("## "))
                              return (
                                <Typography
                                  key={i}
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: "bold",
                                    mt: 1.5,
                                    color: "text.primary",
                                  }}
                                >
                                  {parseInline(line.slice(3))}
                                </Typography>
                              );
                            if (line.startsWith("# "))
                              return (
                                <Typography
                                  key={i}
                                  variant="h6"
                                  sx={{
                                    fontWeight: "bold",
                                    mt: 2,
                                    color: "text.primary",
                                  }}
                                >
                                  {parseInline(line.slice(2))}
                                </Typography>
                              );

                            // Blockquote
                            if (line.startsWith("> ")) {
                              return (
                                <Box
                                  key={i}
                                  sx={{
                                    borderLeft: "4px solid #ccc",
                                    pl: 2,
                                    py: 0.5,
                                    my: 1,
                                    bgcolor: "rgba(0,0,0,0.03)",
                                    fontStyle: "italic",
                                  }}
                                >
                                  <Typography variant="body2">
                                    {parseInline(line.slice(2))}
                                  </Typography>
                                </Box>
                              );
                            }

                            // Unordered List
                            if (line.startsWith("- ")) {
                              return (
                                <Box key={i} sx={{ display: "flex", ml: 1 }}>
                                  <Typography sx={{ mr: 1 }}>•</Typography>
                                  <Typography variant="body2">
                                    {parseInline(line.slice(2))}
                                  </Typography>
                                </Box>
                              );
                            }

                            // Ordered List
                            const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
                            if (orderedMatch) {
                              return (
                                <Box key={i} sx={{ display: "flex", ml: 1 }}>
                                  <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                                    {orderedMatch[1]}.
                                  </Typography>
                                  <Typography variant="body2">
                                    {parseInline(orderedMatch[2])}
                                  </Typography>
                                </Box>
                              );
                            }

                            return (
                              <Box key={i} sx={{ minHeight: line ? "auto" : "1em" }}>
                                {parseInline(line)}
                              </Box>
                            );
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};
