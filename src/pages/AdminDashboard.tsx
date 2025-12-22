import { useEffect, useState, useRef, useMemo } from "react"; // Added useMemo
import type { FC } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Pagination, // Added Pagination
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  // --- NEW IMPORTS ---
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";
import React from "react";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
  area?: string; // ADDED
  stationLimit?: number;
  areaLimit?: number;
}

interface GroupData {
  id: string;
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationId?: string;
  destinationEta?: string;
  lastStationId?: string;
  totalScore: number;
}

// --- NEW INTERFACE ---
interface AnnouncementData {
  id: string;
  message: string;
  timestamp: any;
  targets?: string[]; // Added targets field
}

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

export const AdminDashboard: FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stations, setStations] = useState<StationData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW STATE ---
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<
    AnnouncementData[]
  >([]);
  const [page, setPage] = useState(1); // Pagination state
  const itemsPerPage = 10;

  // ADDED: Group and Sort Stations by Area
  const stationsByArea = useMemo(() => {
    const groups: Record<string, StationData[]> = {};
    stations.forEach((s) => {
      const area = s.area || "Others";
      if (!groups[area]) groups[area] = [];
      groups[area].push(s);
    });

    // Sort stations within groups: Manned first, then alphabetical
    Object.keys(groups).forEach((area) => {
      groups[area].sort((a, b) => {
        if (a.type === "manned" && b.type !== "manned") return -1;
        if (a.type !== "manned" && b.type === "manned") return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [stations]);

  // ADDED: Sorted Area Keys
  const sortedAreaKeys = useMemo(() => {
    return Object.keys(stationsByArea).sort((a, b) => {
      if (a === "Others") return 1;
      if (b === "Others") return -1;
      return a.localeCompare(b);
    });
  }, [stationsByArea])

  // Notification State for RECEIVED announcements
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [latestMsg, setLatestMsg] = useState("");
  const prevAnnounceId = useRef<string | null>(null);
  const isFirstLoad = useRef(true); // NEW: Track first load to prevent spam

  useEffect(() => {
    const q = query(collection(db, "stations"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setStations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as StationData))
      );
    });
    return () => unsub();
  }, []);

  // --- NEW EFFECT: Fetch Admin Announcements ---
  useEffect(() => {
    const qAnnounce = query(
      collection(db, "announcements"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(qAnnounce, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AnnouncementData))
        .filter(
          (ann) =>
            !ann.targets ||
            ann.targets.includes("ADMIN") ||
            ann.targets.includes("GUEST") // 2. Include GUEST
        );
      setReceivedAnnouncements(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (receivedAnnouncements.length > 0) {
      const latest = receivedAnnouncements[0];

      // Skip notification on initial data load
      if (isFirstLoad.current) {
        prevAnnounceId.current = latest.id;
        isFirstLoad.current = false;
        return;
      }

      if (prevAnnounceId.current && prevAnnounceId.current !== latest.id) {
        setLatestMsg(latest.message);
        setNotifyOpen(true);
      }
      prevAnnounceId.current = latest.id;
    } else {
      isFirstLoad.current = false;
    }
  }, [receivedAnnouncements]);

  useEffect(() => {
    const q = query(collection(db, "groups"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );
      list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
      setGroups(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getStationName = (id?: string) => {
    if (!id) return "-";
    const station = stations.find((s) => s.id === id);
    return station ? station.name : "Unknown ID";
  };

  // Pagination Logic
  // Filter out GUEST-only announcements from the LIST view
  const listAnnouncements = receivedAnnouncements.filter(
    (ann) => !ann.targets || ann.targets.includes("ADMIN")
  );

  const totalPages = Math.ceil(listAnnouncements.length / itemsPerPage);
  const displayedAnnouncements = listAnnouncements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ pb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <WarningIcon color="warning" /> Mission Control
      </Typography>

      {/* --- UPDATED SUMMARY CARDS LAYOUT --- */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Groups Traveling Card - Using your bronze/gold theme */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            textAlign: "center",
            bgcolor: "#fef5e7", // Warm cream
            border: "2px solid #eec45c", // Your gold
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: "bold",
              color: "#b97539", // Your bronze
            }}
          >
            {groups.filter((g) => g.status === "TRAVELING").length}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Groups Traveling
          </Typography>
        </Paper>

        {/* Stations on Lunch Card - Using warm browns */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            textAlign: "center",
            bgcolor: "#f5ebe0", // Lighter warm beige
            border: "2px solid #d4a574", // Light bronze border
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: "bold",
              color: "#8d6e63", // Your secondary brown text
            }}
          >
            {stations.filter((s) => s.status === "CLOSED_LUNCH").length}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Stations on Lunch
          </Typography>
        </Paper>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_event, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<LocationOnIcon />} label="STATION VIEW" />
          <Tab icon={<DirectionsRunIcon />} label="GROUP VIEW" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Station Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center"> Incoming 🚍</TableCell>
                <TableCell align="center">Queue 🧘</TableCell>
                <TableCell align="center">Station Capacity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAreaKeys.map((area, index) => {
                const areaStations = stationsByArea[area];
                const areaColor =
                  area === "Others"
                    ? "#f5f5f5"
                    : RAINBOW_COLORS[index % RAINBOW_COLORS.length];

                return (
                  <React.Fragment key={area}>
                    {/* Area Header Row with inline occupancy (not a separate column) */}
                    <TableRow sx={{ bgcolor: areaColor }}>
                      <TableCell sx={{ fontWeight: "bold", color: "text.primary" }}>
                        {area}
                        {area !== "Others" && (
                          <> {` (`}
                            {
                              areaStations.reduce(
                                (sum, s) => sum + s.travelingCount + s.arrivedCount,
                                0
                              )
                            }
                            {`/8)`}
                          </>
                        )}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                    {areaStations.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell sx={{ fontWeight: "bold", pl: 4 }}>
                          {s.name}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status.replace("_", " ")}
                            color={
                              s.status === "OPEN"
                                ? "success"
                                : s.status === "CLOSED_LUNCH"
                                ? "warning"
                                : "error"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color:
                              s.travelingCount > 3 ? "warning.main" : "inherit",
                            fontWeight:
                              s.travelingCount > 3 ? "bold" : "normal",
                          }}
                        >
                          {s.travelingCount}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color:
                              s.arrivedCount > 2 ? "error.main" : "inherit",
                            fontWeight: s.arrivedCount > 2 ? "bold" : "normal",
                          }}
                        >
                          {s.arrivedCount}
                        </TableCell>
                        <TableCell align="center">{`${s.arrivedCount}/3`}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Group</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Current / Last Loc</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>ETA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => {
                let currentLocation = "-";
                let destination = "-";
                if (g.status === "ARRIVED") {
                  currentLocation = `📍 ${getStationName(g.destinationId)}`;
                } else if (g.status === "TRAVELING") {
                  currentLocation = g.lastStationId
                    ? `Last: ${getStationName(g.lastStationId)}`
                    : "-";
                  destination = `➡️ ${getStationName(g.destinationId)}`;
                } else {
                  currentLocation = g.lastStationId
                    ? `Last: ${getStationName(g.lastStationId)}`
                    : "-";
                }

                return (
                  <TableRow key={g.id}>
                    <TableCell sx={{ fontWeight: "bold" }}>{g.name}</TableCell>
                    <TableCell>
                      {g.status === "TRAVELING" && (
                        <Chip
                          icon={<DirectionsRunIcon />}
                          label="Traveling"
                          color="info"
                          size="small"
                        />
                      )}
                      {g.status === "ARRIVED" && (
                        <Chip
                          icon={<LocationOnIcon />}
                          label="Arrived"
                          color="success"
                          size="small"
                        />
                      )}
                      {g.status === "ON_LUNCH" && (
                        <Chip
                          icon={<RestaurantIcon />}
                          label="On Lunch"
                          color="warning"
                          size="small"
                        />
                      )}
                      {g.status === "IDLE" && <Chip label="Idle" size="small" />}
                    </TableCell>
                    <TableCell>{currentLocation}</TableCell>
                    <TableCell>{destination}</TableCell>
                    <TableCell>{g.destinationEta || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* === NEW: ADMIN ANNOUNCEMENTS VIEW (MOVED HERE) === */}
      <Box sx={{ mt: 4, mb: 4 }}>
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
          <CampaignIcon color="error" /> Admin Announcements
        </Typography>
        <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
          {displayedAnnouncements.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">
                No announcements for Admins yet.
              </Typography>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {displayedAnnouncements.map((ann, index) => (
                  <React.Fragment key={ann.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 1, px: 2 }}> {/* Reduced padding */}
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
                            fontSize: "0.95rem",
                          },
                        }}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
              {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      {/* New Snackbar for RECEIVING announcements */}
      <Snackbar
        open={notifyOpen}
        autoHideDuration={5000} // Changed to 5 seconds
        onClose={() => setNotifyOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotifyOpen(false)}
          severity="info"
          variant="filled"
          icon={<CampaignIcon />}
          sx={{ width: "100%" }}
        >
          New Admin Announcement: {latestMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
