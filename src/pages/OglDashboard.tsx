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
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
// --- NEW IMPORTS FOR COUNTING ---
import {
  doc,
  onSnapshot,
  collection,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { ProgressRing } from "../components/ProgressRing";

interface GroupData {
  name: string;
  totalScore: number;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  completedStations: string[];
  completedSideQuests: string[];
}

export const OglDashboard: FC = () => {
  const { profile } = useAuth();
  const theme = useTheme();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW STATE FOR DYNAMIC TOTALS ---
  const [totalStations, setTotalStations] = useState(0);
  const [totalSideQuests, setTotalSideQuests] = useState(0);

  // 1. Fetch Totals (Run once on mount)
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        // These are very fast, cheap queries that just return a number
        const stationsSnap = await getCountFromServer(
          collection(db, "stations")
        );
        const sideQuestsSnap = await getCountFromServer(
          collection(db, "sideQuests")
        );

        setTotalStations(stationsSnap.data().count);
        setTotalSideQuests(sideQuestsSnap.data().count);
      } catch (err) {
        console.error("Error fetching totals:", err);
      }
    };
    fetchTotals();
  }, []);

  // 2. Real-time listener for MY group
  useEffect(() => {
    if (!profile?.groupId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "groups", profile.groupId),
      (docSnap) => {
        if (docSnap.exists()) {
          setGroupData(docSnap.data() as GroupData);
        } else {
          setError("Group not found! Please contact Admin.");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Real-time error:", err);
        setError("Lost connection to game server.");
        setLoading(false);
      }
    );

    return () => unsub();
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
    <Box>
      {/* WELCOME & SCORE BANNER */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          textAlign: "center",
          background: "linear-gradient(135deg, #1976d2 30%, #64b5f6 90%)",
          color: "white",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          {groupData?.name}
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <EmojiEventsIcon fontSize="large" />
          <Typography variant="h1" component="div" sx={{ fontWeight: "bold" }}>
            {groupData?.totalScore || 0}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ opacity: 0.9 }}>
          Current Score
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Chip
            label={groupData?.status?.replace("_", " ") || "IDLE"}
            sx={{
              bgcolor: "white",
              color: "primary.main",
              fontWeight: "bold",
              fontSize: "1rem",
              height: 32,
            }}
          />
        </Box>
      </Paper>

      {/* PROGRESS SECTION */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Your Progress
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Paper
          sx={{
            flex: 1,
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ProgressRing
            completed={groupData?.completedStations?.length || 0}
            total={totalStations} // <-- Using dynamic total
            label="Stations"
            color={theme.palette.primary.main}
          />
        </Paper>

        <Paper
          sx={{
            flex: 1,
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ProgressRing
            completed={groupData?.completedSideQuests?.length || 0}
            total={totalSideQuests} // <-- Using dynamic total
            label="Side Quests"
            color={theme.palette.secondary.main}
          />
        </Paper>
      </Box>
    </Box>
  );
};
