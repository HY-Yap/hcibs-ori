import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Divider,
  Badge,
  ListSubheader, // Added
  Grid, // Added
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { FileUpload } from "../components/FileUpload";
import { ChatWindow } from "../components/ChatWindow";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";

// Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import ChatIcon from "@mui/icons-material/Chat";

// REMOVED: AREA_CONFIG constant

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

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned" | "ending_location";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
  description?: string;
  points?: number;
  minPoints?: number; // ADDED
  maxPoints?: number; // ADDED
  // ADDED
  hasSecondStage?: boolean;
  secondDescription?: string;
  area?: string; // ADDED
  bonusType?: "none" | "early-bird" | "late-game";
}
interface GroupData {
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationId?: string;
  completedStations?: string[];
  // ADDED
  stageOneCompletedStations?: string[];
}

// ADDED: Markdown Renderer Component
const MarkdownRenderer = ({ text }: { text: string }) => {
  if (!text) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {(() => {
        const lines = text.split("\n");
        const nodes: any[] = [];
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
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
          if (line.startsWith("### ")) {
            nodes.push(
              <Typography key={`h3-${i}`} variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, color: "text.primary" }}>
                {parseInline(line.slice(4))}
              </Typography>
            );
            i++; continue;
          }
          if (line.startsWith("## ")) {
            nodes.push(
              <Typography key={`h2-${i}`} variant="subtitle1" sx={{ fontWeight: "bold", mt: 1.5, color: "text.primary" }}>
                {parseInline(line.slice(3))}
              </Typography>
            );
            i++; continue;
          }
          if (line.startsWith("# ")) {
            nodes.push(
              <Typography key={`h1-${i}`} variant="h6" sx={{ fontWeight: "bold", mt: 2, color: "text.primary" }}>
                {parseInline(line.slice(2))}
              </Typography>
            );
            i++; continue;
          }

          // Grouped Blockquote
          if (line.startsWith("> ")) {
            const quotePieces: any[] = [];
            const start = i;
            while (i < lines.length && lines[i].startsWith("> ")) {
              const content = parseInline(lines[i].slice(2));
              quotePieces.push(<span key={`qline-${i}`}>{content}</span>);
              if (i + 1 < lines.length && lines[i + 1].startsWith("> ")) {
                quotePieces.push(<br key={`qbr-${i}`} />);
              }
              i++;
            }
            nodes.push(
              <Box key={`quote-${start}`} sx={{ borderLeft: "4px solid #ccc", pl: 2, py: 0.5, my: 1, bgcolor: "rgba(0,0,0,0.03)", fontStyle: "italic" }}>
                <Typography variant="body2">{quotePieces}</Typography>
              </Box>
            );
            continue;
          }

          // Unordered List
          if (line.startsWith("- ")) {
            nodes.push(
              <Box key={`ul-${i}`} sx={{ display: "flex", ml: 1 }}>
                <Typography sx={{ mr: 1 }}>•</Typography>
                <Typography variant="body2">{parseInline(line.slice(2))}</Typography>
              </Box>
            );
            i++; continue;
          }

          // Ordered List
          const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
          if (orderedMatch) {
            nodes.push(
              <Box key={`ol-${i}`} sx={{ display: "flex", ml: 1 }}>
                <Typography sx={{ mr: 1, fontWeight: "bold" }}>{orderedMatch[1]}.</Typography>
                <Typography variant="body2">{parseInline(orderedMatch[2])}</Typography>
              </Box>
            );
            i++; continue;
          }

          nodes.push(
            <Typography key={`p-${i}`} paragraph sx={{ whiteSpace: "pre-wrap", color: "text.secondary", mb: 1 }}>
              {parseInline(line)}
            </Typography>
          );
          i++;
        }
        return nodes;
      })()}
    </Box>
  );
};

export const OglJourney: FC = () => {
  const { profile, gameStatus } = useAuth();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [travelDialogOpen, setTravelDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false); // ADDED
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );
  const [eta, setEta] = useState("");

  // Submission State
  const [submissionUrls, setSubmissionUrls] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [groupName, setGroupName] = useState<string | null>(null); // ADD THIS

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Helper to create safe slug from a name
  const slugify = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

  const getUploadPath = (station?: StationData) => {
    const gid = profile?.groupId || "unknown-group";
    const gslug = slugify(groupName) || gid;
    const sid = station?.id || "unknown-station";
    const sslug = slugify(station?.name) || sid;
    return `submissions/${gslug}/${sslug}/`;
  };

  // Helper: extract a storage path from various download URL formats
  const extractStoragePathFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      let m = u.pathname.match(/\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      m = u.pathname.match(/\/b\/[^/]+\/o\/([^?]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      const parts = u.pathname.split("/");
      if (parts.length >= 3) {
        const maybe = parts.slice(2).join("/").split("?")[0];
        return decodeURIComponent(maybe);
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  };

  // Remove uploaded file
  const handleRemoveFile = async (urlToRemove: string) => {
    if (
      !window.confirm(
        "Remove uploaded file? This will delete the file from storage."
      )
    )
      return;
    setActionLoading(true);
    try {
      const path = extractStoragePathFromUrl(urlToRemove);
      if (path) {
        try {
          const storage = getStorage();
          await deleteObject(storageRef(storage, path));
          console.log("Client-side storage delete succeeded:", path);
          setSubmissionUrls((prev) => prev.filter((u) => u !== urlToRemove));
          return;
        } catch (err) {
          console.warn("Client-side delete failed, will try server-side:", err);
        }
      } else {
        console.warn(
          "Could not parse storage path from URL, will try server-side."
        );
      }

      // fallback to server-side deletion
      const fn = httpsCallable(firebaseFunctions, "deleteSubmission");
      await fn({ groupId: profile?.groupId, submissionUrl: urlToRemove });
      console.log(
        "Server-side deleteSubmission succeeded for URL:",
        urlToRemove
      );
      setSubmissionUrls((prev) => prev.filter((u) => u !== urlToRemove));
    } catch (err: any) {
      console.error("Failed to remove file:", err);
      alert(
        `Failed to remove file: ${err?.message || String(err)}. Check console.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Reset submission when arriving
  useEffect(() => {
    if (groupData?.status === "ARRIVED") {
      setSubmissionUrls([]);
      setTextAnswer("");
    }
  }, [groupData?.status, groupData?.destinationId]);

  // Listen to Group
  useEffect(() => {
    if (!profile?.groupId) return;
    const unsub = onSnapshot(doc(db, "groups", profile.groupId), (docSnap) => {
      if (docSnap.exists()) {
        setGroupData(docSnap.data() as GroupData);
        setGroupName(docSnap.data().name || null); // STORE GROUP NAME
      }
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  // Listen to Stations
  useEffect(() => {
    const q = query(collection(db, "stations"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedStations = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as StationData)
      );


      setStations(fetchedStations);
    });
    return () => unsub();
  }, []);

  // Listen to Chat Unread Count
  useEffect(() => {
    if (
      groupData?.status !== "TRAVELING" ||
      !groupData.destinationId ||
      !profile?.groupId
    ) {
      return;
    }
    const chatId = `chat_${profile.groupId}_${groupData.destinationId}`;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        setUnreadCount(snap.data().unreadCountOGL || 0);
      }
    });
    return () => unsub();
  }, [groupData?.status, groupData?.destinationId, profile?.groupId]);

  const callFunction = async (name: string, data: any = {}) => {
    setActionLoading(true);
    try {
      const fn = httpsCallable(firebaseFunctions, name);
      await fn(data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTravel = async () => {
    if (!selectedStation || !eta) return;

    // Double check capacity before calling function
    const currentS = stations.find(s => s.id === selectedStation.id);
    if (currentS && currentS.area !== "Others") {
      const occupancy = (currentS.travelingCount || 0) + (currentS.arrivedCount || 0);
      if (occupancy >= 3) {
        alert("Station is full! Please choose another.");
        setTravelDialogOpen(false);
        setSelectedStation(null);
        return;
      }

      // Check Area Capacity
      const areaStations = stations.filter(s => (s.area || "Others") === (currentS.area || "Others"));
      const areaOccupancy = areaStations.reduce((sum, s) => sum + (s.travelingCount || 0) + (s.arrivedCount || 0), 0);
      if (areaOccupancy >= 8) {
        alert(`Area '${currentS.area}' is full! Please choose another.`);
        setTravelDialogOpen(false);
        setSelectedStation(null);
        return;
      }
    }

    await callFunction("oglStartTravel", {
      stationId: selectedStation.id,
      eta,
    });
    setTravelDialogOpen(false);
    setWarningDialogOpen(false); // Close warning if open
    setEta("");
    setSelectedStation(null);
  };
  const handleArrive = async () => await callFunction("oglArrive");
  const handleDepart = async () => {
    const currentStation = stations.find(
      (s) => s.id === groupData?.destinationId
    );
    const isEnding = currentStation?.type === "ending_location";
    const message = isEnding
      ? "Are you sure you want to leave?"
      : "Are you sure you want to skip this station without points?";

    if (window.confirm(message)) {
      await callFunction("oglDepart");
    }
  };
  const handleToggleLunch = async () => await callFunction("oglToggleLunch");

  const handleSubmitUnmanned = async (station: StationData) => {
    if (!profile?.groupId) return;
    if (!textAnswer && submissionUrls.length === 0) {
      alert("Please provide a text answer or upload at least one file.");
      return;
    }
    setActionLoading(true);
    try {
      const submitScoreFn = httpsCallable(firebaseFunctions, "submitScore");
      await submitScoreFn({
        groupId: profile.groupId,
        stationId: station.id,
        type: "STATION",
        submissionUrl: submissionUrls.length > 0 ? submissionUrls : null,
        textAnswer: textAnswer || null,
      });
      setSubmissionUrls([]);
      setTextAnswer("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!groupData) return <Alert severity="error">Group data not found.</Alert>;

  if (gameStatus !== "RUNNING") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 4 }}>
        <LockIcon
          sx={{ fontSize: 80, color: "text.secondary", mb: 2, opacity: 0.5 }}
        />
        <Typography variant="h4" color="error" gutterBottom>
          Game Paused
        </Typography>
        <Typography paragraph>
          The game is currently stopped by the Game Master.
        </Typography>
      </Box>
    );
  }

  // --- VIEW 1: TRAVELING ---
  if (groupData.status === "TRAVELING") {
    const dest = stations.find((s) => s.id === groupData.destinationId);
    const isDestinationManned = dest?.type === "manned";

    return (
      <Box sx={{ textAlign: "center", mt: 4, p: 2 }}>
        <DirectionsRunIcon
          sx={{ fontSize: 80, color: "primary.main", mb: 2 }}
        />
        <Typography variant="h4" gutterBottom>
          Traveling...
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Destination: <strong>{dest?.name || "Unknown"}</strong>
        </Typography>

        {dest && dest.type !== "ending_location" && (
          <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: "bold" }}>
            Potential Points: {(() => {
                const min = dest.minPoints ?? dest.points ?? 0;
                const max = dest.maxPoints ?? dest.points ?? 0;
                return min === max ? `${min}` : `${min}-${max}`;
            })()}
          </Typography>
        )}

        {/* ADDED: Station Details while Traveling */}
        {dest && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#f5f5f5", textAlign: "left", maxHeight: 300, overflowY: "auto" }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: "bold", color: "text.secondary", textTransform: "uppercase", letterSpacing: 1 }}>
              Station Details
            </Typography>
            <MarkdownRenderer text={dest.description || "No description available."} />
          </Paper>
        )}

        {isDestinationManned && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="outlined"
              color="info"
              size="large"
              startIcon={
                <Badge badgeContent={unreadCount} color="error">
                  <ChatIcon />
                </Badge>
              }
              onClick={() => setChatOpen(true)}
              fullWidth
            >
              Chat with Station Master
            </Button>
          </Box>
        )}

        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          sx={{
            py: 2,
            fontSize: "1.2rem",
            mt: isDestinationManned ? 0 : 4,
          }}
          disabled={actionLoading}
          onClick={handleArrive}
        >
          I HAVE ARRIVED
        </Button>

        {chatOpen && isDestinationManned && groupData.destinationId && (
          <ChatWindow
            chatId={`chat_${profile?.groupId}_${groupData.destinationId}`}
            title={`Chat with ${dest?.name || "SM"}`}
            onClose={() => setChatOpen(false)}
          />
        )}
      </Box>
    );
  }

  // --- VIEW 2: ARRIVED ---
  if (groupData.status === "ARRIVED") {
    const currentStation = stations.find(
      (s) => s.id === groupData.destinationId
    );

    // Check if prerequisites are met for current station
    let isPrereqMissing = false;
    if (currentStation) {
      const areaName = currentStation.area || "Others";
      // Find all manned stations in this area
      const areaMannedStations = stations.filter(
        (s) => (s.area || "Others") === areaName && s.type === "manned"
      );
      const prereqStationIds = areaMannedStations.map((s) => s.id);
      
      const completedIds = groupData?.completedStations || [];
      isPrereqMissing = !prereqStationIds.every((id) =>
        completedIds.includes(id)
      );
    }

    // Special handling for Marina Barrage
    if (currentStation?.name === "Marina Barrage") {
      return (
        <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", p: 2 }}>
          <LocationOnIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            You are at Marina Barrage
          </Typography>
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#fff9c4" }}>
            <Typography variant="h6" gutterBottom>
              DINNER LOCATION
            </Typography>
            <Typography>
              Please patiently wait for other groups to arrive and for dinner to
              start.
            </Typography>
          </Paper>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            sx={{ mt: 4 }}
            disabled={actionLoading}
            onClick={handleDepart}
          >
            LEAVE
          </Button>
        </Box>
      );
    }

    const isManned = currentStation?.type === "manned";
    // ADDED: Check stage
    const hasSecondStage = currentStation?.hasSecondStage;
    const isStageOneDone = groupData.stageOneCompletedStations?.includes(currentStation?.id || "");
    const displayDescription = (hasSecondStage && isStageOneDone) ? currentStation?.secondDescription : currentStation?.description;
    const buttonText = (hasSecondStage && !isStageOneDone) ? "Proceed to 2nd Stage" : "Submit & Complete Station";

    return (
      <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", p: 2 }}>
        <LocationOnIcon sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          You are at {currentStation?.name}
        </Typography>

        {isManned ? (
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#e3f2fd" }}>
            <Typography variant="h6" gutterBottom>
              WAITING FOR STATION MASTER
            </Typography>
            <Typography>
              Please wait for the SM to conduct the activity and award your
              points.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, mt: 3, bgcolor: "#fff3e0", textAlign: "left" }}>
            <Typography variant="h6" gutterBottom>
              UNMANNED STATION
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "#f0f7ff",
                borderRadius: 2,
                border: "1px solid #cce5ff",
                textAlign: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                color="primary.main"
                sx={{ fontWeight: "bold" }}
              >
                REWARD: {(() => {
                    const min = currentStation?.minPoints ?? currentStation?.points ?? 0;
                    const max = currentStation?.maxPoints ?? currentStation?.points ?? 0;
                    return min === max ? `${min} POINTS` : `${min}-${max} POINTS`;
                })()}
              </Typography>
              {/* ADDED: Warning Text */}
              {isPrereqMissing && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 1, fontWeight: "bold" }}
                >
                  Points will not be given until the corresponding area's manned stations have been completed.
                </Typography>
              )}
            </Box>
            
            {/* MODIFIED: Enhanced Markdown Rendering */}
            <MarkdownRenderer text={displayDescription || "No description available."} />

            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}
            >
              <TextField
                label="Text Answer (if required)"
                variant="outlined"
                fullWidth
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
              />

              {/* UPDATED FILE UPLOAD SECTION - Match OglSideQuests */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Upload Proof:
                </Typography>
                <FileUpload
                  uploadPath={getUploadPath(currentStation || undefined)}
                  onUploadComplete={(url) =>
                    setSubmissionUrls((prev) => [...prev, url])
                  }
                />
                {submissionUrls.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Uploaded Files:
                    </Typography>
                    {submissionUrls.map((url, idx) => (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 1,
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderColor: "success.main",
                          bgcolor: "rgba(0,0,0,0.02)",
                        }}
                      >
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="success.dark"
                          >
                            File {idx + 1}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit" }}
                            >
                              View submission
                            </a>
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleRemoveFile(url)}
                          disabled={actionLoading}
                        >
                          Remove
                        </Button>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>

              <Button
                variant="contained"
                color="success"
                disabled={actionLoading || submissionUrls.length === 0}
                onClick={() => handleSubmitUnmanned(currentStation!)}
                sx={{ mt: 1, py: 1.5 }}
              >
                {actionLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  buttonText
                )}
              </Button>
            </Box>
          </Paper>
        )}
        <Button
          variant="outlined"
          color="error"
          fullWidth
          sx={{ mt: 4 }}
          disabled={actionLoading}
          onClick={handleDepart}
        >
          DEPART (SKIP STATION)
        </Button>
      </Box>
    );
  }

  // --- VIEW 3: ON LUNCH ---
  if (groupData.status === "ON_LUNCH") {
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 2 }}>
        <RestaurantIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          On Lunch Break
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          sx={{ py: 2, mt: 4 }}
          disabled={actionLoading}
          onClick={handleToggleLunch}
        >
          WE ARE BACK
        </Button>
      </Box>
    );
  }

  // --- VIEW 4: IDLE ---
  // Group stations by Area
  const groupedStations: Record<string, StationData[]> = {};
  
  stations.forEach((s) => {
    const areaKey = s.area || "Others";
    if (!groupedStations[areaKey]) {
        groupedStations[areaKey] = [];
    }
    groupedStations[areaKey].push(s);
  });

  // Sort stations within each area: Manned first
  Object.keys(groupedStations).forEach((key) => {
    groupedStations[key].sort((a, b) => {
      if (a.type === "manned" && b.type !== "manned") return -1;
      if (a.type !== "manned" && b.type === "manned") return 1;
      return 0;
    });
  });

  // Sort areas: Alphabetical, Others last
  const allAreaKeys = Object.keys(groupedStations).sort((a, b) => {
      if (a === "Others") return 1;
      if (b === "Others") return -1;
      return a.localeCompare(b);
  });

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Select Next Station</Typography>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestaurantIcon />}
          disabled={actionLoading}
          onClick={handleToggleLunch}
        >
          Go on Lunch
        </Button>
      </Box>

      {/* BONUS LEGEND */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: "#fff3e0", border: "1px dashed #ffb74d" }}>
        <Typography variant="subtitle2" fontWeight="bold" color="#e65100" gutterBottom>
          Active Bonuses
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" display="block" fontWeight="bold" color="#e65100">
              Early-Bird (Before 3:30 PM)
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Manned: +150 pts | Unmanned: +100 pts
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" display="block" fontWeight="bold" color="#e65100">
              Late-Game (After 3:30 PM)
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Manned: +200 pts | Unmanned: +100 pts
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {allAreaKeys.map((areaName, index) => {
          const areaStations = groupedStations[areaName];
          if (!areaStations || areaStations.length === 0) return null;

          // Determine Color
          const areaColor = areaName === "Others" 
            ? "#f5f5f5" 
            : RAINBOW_COLORS[index % RAINBOW_COLORS.length];

          // 1. Calculate Area Occupancy (Limit: 8)
          const areaOccupancy = areaStations.reduce(
            (sum, s) => sum + s.travelingCount + s.arrivedCount,
            0
          );
          // No limit for "Others"
          const isAreaFull = areaName === "Others" ? false : areaOccupancy >= 8;

          // 2. Check Prerequisites (All manned stations in this area)
          const prereqStationIds = areaStations
            .filter((s) => s.type === "manned")
            .map((s) => s.id);
          const completedIds = groupData?.completedStations || [];
          const arePrereqsMet = prereqStationIds.every((id) =>
            completedIds.includes(id)
          );

          return (
            <React.Fragment key={areaName}>
              <ListSubheader
                sx={{
                  bgcolor: areaColor,
                  color: "text.primary",
                  fontWeight: "bold",
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{areaName}</span>
                <Typography variant="caption" sx={{ alignSelf: "center" }}>
                  {areaName === "Others" ? "" : `${areaOccupancy}/8 Groups`}
                </Typography>
              </ListSubheader>
              {areaStations.map((s) => {
                const isCompleted = groupData.completedStations?.includes(s.id);
                const isOpen = s.status === "OPEN";

                // 3. Station Capacity (Limit: 3)
                const stationOccupancy = s.travelingCount + s.arrivedCount;
                const isStationFull = areaName === "Others" ? false : stationOccupancy >= 3;

                // 4. Progression Lock
                const isPrereqStation = s.type === "manned";
                const isProgressionLocked = !isPrereqStation && !arePrereqsMet;

                // Determine Status & Disable State
                let isDisabled = false;
                let statusLabel = "";
                let statusColor:
                  | "default"
                  | "primary"
                  | "secondary"
                  | "error"
                  | "info"
                  | "success"
                  | "warning" = "default";
                let icon = <LocationOnIcon />;
                
                // Use area color for icon background, or grey for Others
                let iconBgColor = areaName === "Others" ? "#bdbdbd" : areaColor;
                // Darken the pastel color slightly for the icon background to be visible against white?
                // Actually, the previous logic used specific colors. Let's use a slightly darker shade or just the area color.
                // To ensure contrast, let's map the pastel to a "main" color if possible, or just use primary.
                // For simplicity and rainbow effect, let's use the areaColor but maybe ensure the icon is visible.
                // Since areaColor is light, we can use it as background.

                if (isCompleted) {
                  isDisabled = true;
                  statusLabel = "Done";
                  statusColor = "success";
                  icon = <CheckCircleIcon />;
                  iconBgColor = "success.light";
                } else if (!isOpen) {
                  isDisabled = true;
                  statusLabel = s.status.replace("_", " ");
                  statusColor = "error";
                  iconBgColor = "error.main";
                } else if (isStationFull) {
                  isDisabled = true;
                  statusLabel = "Full";
                  statusColor = "warning";
                } else if (isAreaFull) {
                  isDisabled = true;
                  statusLabel = "Area Full";
                  statusColor = "warning";
                }

                return (
                  <React.Fragment key={s.id}>
                    <ListItem
                      sx={{
                        opacity: isDisabled ? 0.6 : 1,
                        bgcolor: isDisabled
                          ? "rgba(0,0,0,0.02)"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mr: 1,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: iconBgColor,
                              // If background is very light, make icon dark
                              color: "rgba(0,0,0,0.7)"
                            }}
                          >
                            {icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={s.name}
                          secondary={
                            <Box component="span" sx={{ display: "block" }}>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                sx={{ fontWeight: "bold", mr: 1 }}
                              >
                                {s.type.replace("_", " ").toUpperCase()}
                                {s.type !== "ending_location" && (
                                  <>
                                    {" • "}
                                    {(() => {
                                      const min = s.minPoints ?? s.points ?? 0;
                                      const max = s.maxPoints ?? s.points ?? 0;
                                      return min === max ? `${min} pts` : `${min}-${max} pts`;
                                    })()}
                                  </>
                                )}
                              </Typography>
                              {/* MODIFIED: Simplified count for Ending Locations only */}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                {s.type === "ending_location" 
                                  ? `(${s.travelingCount} arr)` 
                                  : `(${s.travelingCount} arr / ${s.arrivedCount} trav)`}
                              </Typography>
                              {/* Bonus Chip */}
                              {s.bonusType && s.bonusType !== "none" && (
                                <Chip
                                  label={s.bonusType === "early-bird" ? "Early-Bird" : "Late-Game"}
                                  size="small"
                                  sx={{ 
                                    ml: 1, 
                                    height: 20, 
                                    fontSize: "0.65rem",
                                    bgcolor: areaColor,
                                    color: "rgba(0,0,0,0.7)",
                                    fontWeight: "bold",
                                    border: "1px solid rgba(0,0,0,0.1)"
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </Box>
                      <Box sx={{ minWidth: "fit-content" }}>
                        {isDisabled ? (
                          <Chip
                            label={statusLabel}
                            color={statusColor}
                            size="small"
                            icon={
                              statusLabel === "Locked" ? <LockIcon /> : undefined
                            }
                          />
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            color={isProgressionLocked ? "warning" : "primary"} // Visual cue
                            onClick={() => {
                              setSelectedStation(s);
                              if (isProgressionLocked) {
                                setWarningDialogOpen(true);
                              } else {
                                setTravelDialogOpen(true);
                              }
                            }}
                          >
                            GO
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </List>
      
      {/* ADDED: Warning Dialog */}
      <Dialog
        open={warningDialogOpen}
        onClose={() => setWarningDialogOpen(false)}
      >
        <DialogTitle>Warning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Points will not be given until the corresponding area's manned stations have been completed. Are you sure you would like to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setWarningDialogOpen(false); // Close warning first
              setTravelDialogOpen(true);   // Then open ETA dialog
            }} 
            color="warning" 
            autoFocus
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={travelDialogOpen}
        onClose={() => setTravelDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Travel to {selectedStation?.name}?</DialogTitle>
        <DialogContent>
          {(() => {
            const currentS = stations.find(s => s.id === selectedStation?.id);
            if (!currentS || currentS.area === "Others") return null;

            const occupancy = (currentS.travelingCount || 0) + (currentS.arrivedCount || 0);
            const isStationFull = occupancy >= 3;

            const areaStations = stations.filter(s => (s.area || "Others") === (currentS.area || "Others"));
            const areaOccupancy = areaStations.reduce((sum, s) => sum + (s.travelingCount || 0) + (s.arrivedCount || 0), 0);
            const isAreaFull = areaOccupancy >= 8;
            
            if (isStationFull) {
              return (
                <Alert severity="error" sx={{ mb: 2 }}>
                  This station just became full! Please close this dialog and pick another.
                </Alert>
              );
            }
            if (isAreaFull) {
              return (
                <Alert severity="error" sx={{ mb: 2 }}>
                  This area just became full! Please close this dialog and pick another.
                </Alert>
              );
            }
            return null;
          })()}
          <DialogContentText sx={{ mb: 2 }}>
            Enter your estimated time of arrival (ETA).
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="ETA (e.g. 2:45 PM)"
            fullWidth
            variant="outlined"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTravelDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartTravel}
            variant="contained"
            disabled={
              !eta || 
              actionLoading || 
              (() => {
                const currentS = stations.find(s => s.id === selectedStation?.id);
                if (!currentS || currentS.area === "Others") return false;

                const occupancy = (currentS.travelingCount || 0) + (currentS.arrivedCount || 0);
                if (occupancy >= 3) return true;

                const areaStations = stations.filter(s => (s.area || "Others") === (currentS.area || "Others"));
                const areaOccupancy = areaStations.reduce((sum, s) => sum + (s.travelingCount || 0) + (s.arrivedCount || 0), 0);
                return areaOccupancy >= 8;
              })()
            }
          >
            Start Traveling
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
