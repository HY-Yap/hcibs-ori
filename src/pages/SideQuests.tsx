import { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import StarsIcon from "@mui/icons-material/Stars";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

interface SideQuestData {
  id: string;
  name: string;
  description: string;
  points: number;
  submissionType: "none" | "photo" | "video";
  isSmManaged: boolean;
}

export const SideQuestsPage: FC = () => {
  const [quests, setQuests] = useState<SideQuestData[]>([]);
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
        const sorted = data.sideQuests.sort(
          (a: SideQuestData, b: SideQuestData) => a.points - b.points
        );
        setQuests(sorted);
      } catch (err) {
        console.error(err);
        setError("Could not load quests.");
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
    <Box sx={{ maxWidth: 1000, mx: "auto", pb: 8, px: 2 }}>
      <Box sx={{ textAlign: "center", mb: 6, mt: 4 }}>
        <StarsIcon sx={{ fontSize: 60, color: "secondary.main", mb: 1 }} />
        <Typography
          variant="h3"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Side Quests
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Complete these challenges for bonus points.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {quests.map((quest) => {
          let Icon = AssignmentIcon;
          if (quest.isSmManaged) Icon = SportsEsportsIcon;
          else if (quest.submissionType === "photo") Icon = PhotoCameraIcon;
          else if (quest.submissionType === "video") Icon = VideocamIcon;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={quest.id}>
              <Card
                elevation={2}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "stretch",
                }}
              >
                {/* Left Color Bar (Visual Indicator) */}
                <Box
                  sx={{
                    width: 8,
                    bgcolor: quest.isSmManaged
                      ? "warning.light"
                      : "secondary.light",
                  }}
                />

                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                  }}
                >
                  {/* Top Row: Title */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Icon color="action" />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                    >
                      {quest.name}
                    </Typography>
                  </Box>

                  {/* Second Row: ALL Tags (Points + Type + Manager) */}
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}
                  >
                    {/* Points */}
                    <Chip
                      label={`+${quest.points} pts`}
                      color="success"
                      size="small"
                      sx={{
                        fontWeight: "900",
                        bgcolor: "#e8f5e9",
                        color: "#2e7d32",
                      }}
                    />

                    {/* Submission Type - only show if upload required */}
                    {quest.submissionType !== "none" && (
                      <Chip
                        label="Upload Required"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    )}

                    {/* Manager Type (if SM) */}
                    {quest.isSmManaged && (
                      <Chip
                        label="Find Station Master"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", fontWeight: "bold" }}
                      />
                    )}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Body: Description */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flexGrow: 1, lineHeight: 1.6 }}
                    component="div"
                  >
                    {/* MODIFIED: Enhanced Markdown Rendering */}
                    {(quest.description || "").split("\n").map((line, i) => {
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
                        // Split by images first
                        const parts = text.split(/(<img src=".*?">)/g);

                        return parts.map((part, i) => {
                          const imgMatch = part.match(/^<img src="(.*?)">$/);
                          if (imgMatch) {
                            return (
                              <Box
                                key={`img-${i}`}
                                component="img"
                                src={imgMatch[1]}
                                alt="Markdown Image"
                                sx={{ maxWidth: "100%", borderRadius: 1, my: 1, display: "block" }}
                              />
                            );
                          }

                          const linkParts = part.split(/(\[.*?\]\(.*?\))/g);
                          return linkParts.map((subPart, j) => {
                            const linkMatch = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
                            if (linkMatch) {
                              return (
                                <a
                                  key={`link-${i}-${j}`}
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
                            return parseStyles(subPart);
                          });
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
};
