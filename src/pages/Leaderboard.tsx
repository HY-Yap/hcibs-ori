import { useEffect, useState } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import HouseIcon from "@mui/icons-material/House";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { motion, AnimatePresence } from "framer-motion";
import { Podium } from "../components/Podium"; // Import the static component

interface GroupData {
  id: string;
  name: string;
  totalScore: number;
}

interface HouseData {
  id: string;
  name: string;
  color: string;
  totalScore: number;
}

const MotionTableRow = motion.create(TableRow);

// REMOVE THE INLINE PODIUM COMPONENT - DELETE LINES ~30-150

export const LeaderboardPage: FC = () => {
  const theme = useTheme();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [isHouseEnabled, setIsHouseEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(
          "https://asia-southeast1-hcibso.cloudfunctions.net/getPublicLeaderboard"
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();

        setGroups(data.groups);
        setHouses(data.houses);
        setIsHouseEnabled(data.isHouseEnabled);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load leaderboard.");
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
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

  // Determine which list to show based on Tab
  const activeList = tabValue === 0 ? groups : houses;

  // Get top 3 for podium
  const topThree = activeList.slice(0, 3);

  // Get remaining teams (4th place onwards) for the table
  const remainingTeams = activeList.slice(3);

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      {/* HEADER WITH SPINNING TROPHY (ONE-TIME) */}
      <Box sx={{ textAlign: "center", mb: isHouseEnabled ? 6 : 0 }}>
        {" "}
        {/* Dynamic spacing */}
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
          Updates every 5 seconds. Ties broken by who scored first.
        </Typography>
      </Box>

      {/* TABS (Only show if House System is enabled) */}
      {isHouseEnabled && (
        <Paper
          elevation={2}
          sx={{ mb: 0, borderRadius: 3, overflow: "hidden" }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, v) => {
              void e;
              setTabValue(v);
            }}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab icon={<GroupsIcon />} label="Groups" />
            <Tab icon={<HouseIcon />} label="Houses" />
          </Tabs>
        </Paper>
      )}

      {/* USE THE STATIC PODIUM COMPONENT */}
      {topThree.length >= 1 && (
        <Podium winners={topThree} type={tabValue === 0 ? "GROUP" : "HOUSE"} />
      )}

      {/* CLASSIC TABLE - Only show 4th place onwards */}
      {remainingTeams.length > 0 && (
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
                  {tabValue === 0 ? "Group" : "House"}
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
                {remainingTeams.map((item, index) => {
                  const rank = index + 4; // Start from 4th place

                  return (
                    <MotionTableRow
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        backgroundColor: "inherit",
                        zIndex: remainingTeams.length - index,
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
                          fontSize: "1.2rem",
                          fontWeight: 400,
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
                          {rank}
                        </motion.div>
                      </TableCell>
                      <TableCell sx={{ fontSize: "1.2rem", py: 2 }}>
                        {item.name}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2, pr: 4 }}>
                        <Chip
                          label={item.totalScore.toLocaleString()}
                          color="default"
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
      )}
    </Box>
  );
};
