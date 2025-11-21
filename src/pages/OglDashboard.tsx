import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  Alert,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  getCountFromServer,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CampaignIcon from "@mui/icons-material/Campaign";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { ProgressRing } from "../components/ProgressRing";

interface GroupData {
  name: string;
  totalScore: number;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  completedStations: string[];
  completedSideQuests: string[];
}

interface AnnouncementData {
  id: string;
  message: string;
  timestamp: any;
}

export const OglDashboard: FC = () => {
  const { profile } = useAuth();
  const theme = useTheme();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalStations, setTotalStations] = useState(0);
  const [totalSideQuests, setTotalSideQuests] = useState(0);

  // 1. Fetch Totals (Run once on mount)
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const sSnap = await getCountFromServer(collection(db, "stations"));
        const sqSnap = await getCountFromServer(collection(db, "sideQuests"));
        setTotalStations(sSnap.data().count);
        setTotalSideQuests(sqSnap.data().count);
      } catch (err) {
        console.error("Error fetching totals:", err);
      }
    };
    fetchTotals();
  }, []);

  // 2. Real-time listeners
  useEffect(() => {
    if (!profile?.groupId) {
      setLoading(false);
      return;
    }

    // A. Listen to MY group
    const unsubGroup = onSnapshot(
      doc(db, "groups", profile.groupId),
      (docSnap) => {
        if (docSnap.exists()) setGroupData(docSnap.data() as GroupData);
        else setError("Group not found.");
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Lost connection.");
        setLoading(false);
      }
    );

    // B. Listen to ALL groups to calculate RANK (Score DESC, Time ASC for tie-breaking)
    const qRank = query(
      collection(db, "groups"),
      orderBy("totalScore", "desc"),
      orderBy("lastScoreTimestamp", "asc")
    );
    const unsubRank = onSnapshot(qRank, (snap) => {
      const index = snap.docs.findIndex((d) => d.id === profile.groupId);
      setRank(index + 1);
    });

    // C. Listen to Announcements (Latest 3)
    const qAnnounce = query(
      collection(db, "announcements"),
      orderBy("timestamp", "desc"),
      limit(3)
    );
    const unsubAnnounce = onSnapshot(qAnnounce, (snap) => {
      setAnnouncements(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnnouncementData))
      );
    });

    return () => {
      unsubGroup();
      unsubRank();
      unsubAnnounce();
    };
  }, [profile]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!profile?.groupId)
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        Your account is not assigned to a group yet.
      </Alert>
    );
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );

  return (
    <Box sx={{ pb: 4 }}>
      {/* === SCORE BANNER === */}
      <Paper
        elevation={4}
        sx={{
          p: 3,
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "white",
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", opacity: 0.9 }}>
            {groupData?.name}
          </Typography>
          <Chip
            icon={
              <LeaderboardIcon style={{ color: theme.palette.primary.main }} />
            }
            label={`Rank #${rank}`}
            sx={{
              bgcolor: "white",
              color: theme.palette.primary.main,
              fontWeight: "bold",
            }}
          />
        </Box>

        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              textTransform: "uppercase",
              letterSpacing: 1,
              opacity: 0.9,
              fontSize: "0.875rem",
              color: "white",
              mb: 1,
            }}
          >
            Current Score
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              py: 1,
            }}
          >
            <EmojiEventsIcon
              sx={{
                fontSize: 48,
                color: "#ffd700",
                filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
              }}
            />
            <Typography
              variant="h1"
              component="div"
              sx={{
                fontWeight: 800,
                fontSize: "4rem",
                lineHeight: 1,
                color: "#ffffff",
                textShadow: "3px 3px 10px rgba(0,0,0,0.5)", // Stronger shadow for better contrast
              }}
            >
              {groupData?.totalScore.toLocaleString() || 0}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Chip
            label={groupData?.status?.replace("_", " ") || "IDLE"}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: "bold",
              letterSpacing: 1,
              backdropFilter: "blur(5px)",
            }}
          />
        </Box>
      </Paper>

      {/* === PROGRESS RINGS (REPLACED GRID WITH BOX FLEX) === */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Your Progress
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        {/* Ring 1 - Match AdminDashboard card style */}
        <Paper
          elevation={1} // Changed from default to match AdminDashboard
          sx={{
            flex: 1,
            p: 2,
            textAlign: "center",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRadius: 3,
          }}
        >
          <ProgressRing
            completed={groupData?.completedStations?.length || 0}
            total={totalStations}
            label="Stations"
            color={theme.palette.primary.main}
          />
        </Paper>
        {/* Ring 2 */}
        <Paper
          elevation={1} // Changed from default
          sx={{
            flex: 1,
            p: 2,
            textAlign: "center",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRadius: 3,
          }}
        >
          <ProgressRing
            completed={groupData?.completedSideQuests?.length || 0}
            total={totalSideQuests}
            label="Side Quests"
            color={theme.palette.secondary.main}
          />
        </Paper>
      </Box>

      {/* === ANNOUNCEMENT LOG === */}
      {announcements.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <CampaignIcon color="error" /> Recent Announcements
          </Typography>
          <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
            {" "}
            {/* Changed from elevation={2} */}
            <List disablePadding>
              {announcements.map((ann, index) => (
                <React.Fragment key={ann.id}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ py: 2, px: 3 }}>
                    <ListItemText
                      primary={ann.message}
                      secondary={ann.timestamp
                        ?.toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      primaryTypographyProps={{
                        fontWeight: 500,
                        component: "div",
                        style: {
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        },
                      }}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Box>
  );
};
