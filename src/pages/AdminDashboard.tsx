import React, { useEffect, useState } from "react";
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
  Grid,
} from "@mui/material";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import WarningIcon from "@mui/icons-material/Warning";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
  travelingCount: number;
  arrivedCount: number;
}

interface GroupData {
  id: string;
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationId?: string;
  destinationEta?: string;
  lastStationId?: string; // <-- NEW FIELD
  totalScore: number;
}

export const AdminDashboard: FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stations, setStations] = useState<StationData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "stations"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setStations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as StationData))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // We remove 'orderBy' from the query and do it in JS instead for "natural" sorting
    const q = query(collection(db, "groups"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );

      // --- THE FIX: Natural Sort ---
      // This tells JS to treat "Group 10" as bigger than "Group 2"
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

      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        <Paper
          sx={{
            flex: 1,
            p: 2,
            textAlign: "center",
            bgcolor: "#e3f2fd",
            maxWidth: { md: "25%" },
          }}
        >
          <Typography variant="h4" color="primary">
            {groups.filter((g) => g.status === "TRAVELING").length}
          </Typography>
          <Typography variant="body2">Groups Traveling</Typography>
        </Paper>
        <Paper
          sx={{
            flex: 1,
            p: 2,
            textAlign: "center",
            bgcolor: "#fff3e0",
            maxWidth: { md: "25%" },
          }}
        >
          <Typography variant="h4" color="warning.main">
            {stations.filter((s) => s.status === "CLOSED_LUNCH").length}
          </Typography>
          <Typography variant="body2">Stations on Lunch</Typography>
        </Paper>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
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
              </TableRow>
            </TableHead>
            <TableBody>
              {stations.map((s) => (
                <TableRow key={s.id}>
                  <TableCell sx={{ fontWeight: "bold" }}>{s.name}</TableCell>
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
                      color: s.travelingCount > 3 ? "warning.main" : "inherit",
                      fontWeight: s.travelingCount > 3 ? "bold" : "normal",
                    }}
                  >
                    {s.travelingCount}
                  </TableCell>
                  {/* THIS WAS THE BUGGY COLUMN - IT SHOULD NOW UPDATE CORRECTLY */}
                  <TableCell
                    align="center"
                    sx={{
                      color: s.arrivedCount > 2 ? "error.main" : "inherit",
                      fontWeight: s.arrivedCount > 2 ? "bold" : "normal",
                    }}
                  >
                    {s.arrivedCount}
                  </TableCell>
                </TableRow>
              ))}
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
                {/* --- SPLIT COLUMNS --- */}
                <TableCell>Current / Last Location</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>ETA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => {
                // Logic to determine location display based on status
                let currentLocation = "-";
                let destination = "-";

                if (g.status === "ARRIVED") {
                  currentLocation = `📍 At: ${getStationName(g.destinationId)}`;
                  // Destination remains '-'
                } else if (g.status === "TRAVELING") {
                  currentLocation = `From: ${getStationName(g.lastStationId)}`;
                  destination = `➡️ ${getStationName(g.destinationId)}`;
                } else {
                  // IDLE or ON_LUNCH
                  currentLocation = g.lastStationId
                    ? `Last at: ${getStationName(g.lastStationId)}`
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
                      {g.status === "IDLE" && (
                        <Chip label="Idle" size="small" />
                      )}
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
    </Box>
  );
};
