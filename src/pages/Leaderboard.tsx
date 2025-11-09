import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  useTheme,
  Link,
} from "@mui/material";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { motion, AnimatePresence } from "framer-motion";

interface GroupData {
  id: string;
  name: string;
  totalScore: number;
}

const MotionTableRow = motion.create(TableRow);

export const LeaderboardPage: FC = () => {
  const theme = useTheme();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // --- NEW QUERY: Sort by Score (DESC), then by Time (ASC) ---
    const q = query(
      collection(db, "groups"),
      orderBy("totalScore", "desc"),
      orderBy("lastScoreTimestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leaderboardData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupData[];
        setGroups(leaderboardData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching leaderboard:", err);
        // If we need an index, show a helpful message
        if (err.message.includes("requires an index")) {
          setError(
            "Missing Index. Open DevTools Console (F12) and click the link from Firebase to create it."
          );
        } else {
          setError("Failed to load live scores.");
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  // Show error with a clickable link if it's an index error (helps you debug!)
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 4, mx: 2 }}>
        {error.includes("Missing Index") ? (
          <>
            <strong>Missing Database Index!</strong>
            <br />
            Please open your browser console (F12) to find the link to create
            it.
          </>
        ) : (
          error
        )}
      </Alert>
    );

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <EmojiEventsIcon
            sx={{
              fontSize: 80,
              color: "gold",
              mb: 2,
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
            }}
          />
        </motion.div>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Live Leaderboard
        </Typography>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{ maxWidth: 500, mx: "auto" }}
        >
          Updates automatically in real-time. Ties broken by who scored first.
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        elevation={2}
        sx={{ borderRadius: 3, overflow: "hidden" }}
      >
        <Table>
          <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  py: 2.5,
                  pl: 4,
                  fontSize: "1.1rem",
                }}
              >
                Rank
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  py: 2.5,
                  fontSize: "1.1rem",
                }}
              >
                Group Team
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  py: 2.5,
                  pr: 4,
                  fontSize: "1.1rem",
                }}
              >
                Total Score
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody component={motion.tbody} layout>
            <AnimatePresence>
              {groups.map((group, index) => {
                // --- SIMPLIFIED RANKING ---
                // Because our query now handles the exact order perfectly,
                // we can just use the list position as the rank!
                const rank = index + 1;

                let rankDisplay: React.ReactNode = rank;
                let rowBgColor = "inherit";
                let fontWeight = 400;
                let scale = 1;
                let rankFontSize = "1.2rem";

                if (rank === 1) {
                  rankDisplay = "🥇";
                  rowBgColor = "#fff9c4";
                  fontWeight = 700;
                  scale = 1.03;
                  rankFontSize = "2rem";
                } else if (rank === 2) {
                  rankDisplay = "🥈";
                  rowBgColor = "#f5f5f5";
                  fontWeight = 600;
                  scale = 1.01;
                  rankFontSize = "1.8rem";
                } else if (rank === 3) {
                  rankDisplay = "🥉";
                  rowBgColor = "#fff3e0";
                  fontWeight = 600;
                  scale = 1.005;
                  rankFontSize = "1.6rem";
                }

                return (
                  <MotionTableRow
                    key={group.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: scale,
                      backgroundColor: rowBgColor,
                      zIndex: groups.length - index,
                    }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 50,
                      mass: 1,
                    }}
                    sx={{
                      position: "relative",
                      "& td": {
                        borderBottom: "1px solid",
                        borderColor: theme.palette.divider,
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: rankFontSize,
                        fontWeight,
                        py: 2,
                        pl: 4,
                        width: "15%",
                      }}
                    >
                      <motion.div
                        key={rank}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {rankDisplay}
                      </motion.div>
                    </TableCell>
                    <TableCell sx={{ fontSize: "1.2rem", fontWeight, py: 2 }}>
                      {group.name}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, pr: 4 }}>
                      <Chip
                        label={group.totalScore.toLocaleString()}
                        color={rank <= 3 ? "primary" : "default"}
                        sx={{
                          fontWeight: "bold",
                          fontSize: "1rem",
                          height: 32,
                          px: 1,
                        }}
                      />
                    </TableCell>
                  </MotionTableRow>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
