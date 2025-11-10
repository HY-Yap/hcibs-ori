import { useEffect, useState, useMemo } from "react";
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
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import HistoryIcon from "@mui/icons-material/History";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";

interface LogData {
  id: string;
  timestamp: any;
  groupId: string;
  points: number;
  type: "STATION" | "SIDE_QUEST";
  sourceId: string;
  note?: string;
  awardedBy?: string;
  awardedByRole?: string;
}

export const AdminScoreLog: FC = () => {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [stationsMap, setStationsMap] = useState<Record<string, string>>({});
  const [sideQuestsMap, setSideQuestsMap] = useState<Record<string, string>>(
    {}
  );

  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterHasNote, setFilterHasNote] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubLogs = onSnapshot(
      query(collection(db, "scoreLog"), orderBy("timestamp", "desc")),
      (snap) => {
        const logList = snap.docs.map((d) => {
          const data = d.data();
          // --- THE FIX: Check BOTH possible field names ---
          // Side Quests use 'sourceId', Stations use 'stationId'
          const finalSourceId = data.sourceId || data.stationId || "unknown";

          return {
            id: d.id,
            ...data,
            sourceId: finalSourceId,
          } as LogData;
        });
        setLogs(logList);
      }
    );

    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data().name;
      });
      setGroupMap(map);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data().displayName;
      });
      setUserMap(map);
    });
    const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data().name;
      });
      setStationsMap(map);
    });
    const unsubSideQuests = onSnapshot(collection(db, "sideQuests"), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data().name;
      });
      setSideQuestsMap(map);
      setLoading(false);
    });

    return () => {
      unsubLogs();
      unsubGroups();
      unsubUsers();
      unsubStations();
      unsubSideQuests();
    };
  }, []);

  const allSourcesMap = useMemo(
    () => ({ ...stationsMap, ...sideQuestsMap }),
    [stationsMap, sideQuestsMap]
  );

  const availableSources = useMemo(() => {
    if (filterType === "STATION") return stationsMap;
    if (filterType === "SIDE_QUEST") return sideQuestsMap;
    return allSourcesMap;
  }, [filterType, stationsMap, sideQuestsMap, allSourcesMap]);

  useEffect(() => {
    if (filterSource !== "ALL" && !availableSources[filterSource]) {
      setFilterSource("ALL");
    }
  }, [filterType, availableSources, filterSource]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterGroup !== "ALL" && log.groupId !== filterGroup) return false;
      if (filterType !== "ALL" && log.type !== filterType) return false;
      if (filterSource !== "ALL" && log.sourceId !== filterSource) return false;
      if (filterHasNote && !log.note) return false;
      return true;
    });
  }, [logs, filterGroup, filterType, filterSource, filterHasNote]);

  const handleClearFilters = () => {
    setFilterGroup("ALL");
    setFilterType("ALL");
    setFilterSource("ALL");
    setFilterHasNote(false);
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
        <HistoryIcon fontSize="large" /> Score Log
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "23%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Group</InputLabel>
              <Select
                value={filterGroup}
                label="Group"
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <MenuItem value="ALL">All Groups</MenuItem>
                {Object.entries(groupMap)
                  .sort(([, a], [, b]) =>
                    a.localeCompare(b, undefined, { numeric: true })
                  )
                  .map(([id, name]) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "23%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="STATION">Stations</MenuItem>
                <MenuItem value="SIDE_QUEST">Side Quests</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "23%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={filterSource}
                label="Source"
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <MenuItem value="ALL">All Sources</MenuItem>
                {Object.entries(availableSources)
                  .sort(([, a], [, b]) => a.localeCompare(b))
                  .map(([id, name]) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "25%" },
              flexGrow: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={filterHasNote}
                  onChange={(e) => setFilterHasNote(e.target.checked)}
                />
              }
              label="With notes only"
              sx={{ mr: 0 }}
            />
            <Button
              startIcon={<FilterListOffIcon />}
              onClick={handleClearFilters}
              size="small"
              color="inherit"
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: "75vh" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: "bold", bgcolor: "#f5f5f5" } }}
            >
              {/* --- OPTIMIZED COLUMN WIDTHS --- */}
              <TableCell sx={{ width: 85, minWidth: 85 }}>Time</TableCell>
              <TableCell sx={{ width: 100, minWidth: 100 }}>Group</TableCell>
              <TableCell sx={{ width: 140, minWidth: 140 }}>Source</TableCell>
              <TableCell sx={{ width: 70 }}>Type</TableCell>
              <TableCell align="right" sx={{ width: 70 }}>
                Pts
              </TableCell>
              <TableCell sx={{ width: "auto" }}>Note</TableCell>{" "}
              {/* Takes all remaining space */}
              <TableCell sx={{ width: 140, minWidth: 140 }}>
                Awarded By
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No logs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const awardedByName =
                  userMap[log.awardedBy || ""] || log.awardedByRole || "System";
                return (
                  <TableRow key={log.id} hover>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        color: "text.secondary",
                        fontSize: "0.8rem",
                      }}
                    >
                      {log.timestamp
                        ?.toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "medium", fontSize: "0.85rem" }}
                    >
                      {groupMap[log.groupId] || "Unknown"}
                    </TableCell>

                    {/* --- SOURCE NAME (Now reliably populated) --- */}
                    <TableCell sx={{ fontSize: "0.85rem" }}>
                      {allSourcesMap[log.sourceId] || log.sourceId || "-"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={log.type === "STATION" ? "Stn" : "Quest"}
                        size="small"
                        color={log.type === "STATION" ? "primary" : "secondary"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.65rem" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`+${log.points}`}
                        color="success"
                        size="small"
                        sx={{
                          fontWeight: "bold",
                          height: 20,
                          fontSize: "0.75rem",
                        }}
                      />
                    </TableCell>

                    {/* --- NOTE COLUMN (Expands and wraps) --- */}
                    <TableCell
                      sx={{
                        color: log.note ? "text.primary" : "text.secondary",
                        fontStyle: log.note ? "normal" : "italic",
                        bgcolor: log.note ? "#fffde7" : "inherit",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        fontSize: "0.85rem",
                      }}
                    >
                      {log.note || "-"}
                    </TableCell>

                    <TableCell sx={{ fontSize: "0.8rem" }}>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500 }}>{awardedByName}</span>
                        {userMap[log.awardedBy || ""] && log.awardedByRole ? (
                          <Typography variant="caption" color="text.secondary">
                            ({log.awardedByRole})
                          </Typography>
                        ) : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
