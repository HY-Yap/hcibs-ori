import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import RestoreIcon from "@mui/icons-material/Restore";
import HelpIcon from "@mui/icons-material/Help";
import SearchIcon from "@mui/icons-material/Search";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { ChatWindow } from "../components/ChatWindow";
import { useAuth } from "../context/AuthContext";

interface RequestData {
  id: string;
  title: string;
  details: string;
  timestamp: any;
  status: "OPEN" | "RESOLVED" | "INVALID";
  sentByUid: string;
  sentByName: string;
  groupId?: string;
  senderRole?: "OGL" | "SM";
  selectedStationId?: string;
}

export const AdminRequestManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED" | "INVALID">("ALL");
  const [search, setSearch] = useState("");

  // Name mappings
  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [stationMap, setStationMap] = useState<Record<string, string>>({});

  // Chat state
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string>("");

  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequestData));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load requests:", err);
        setError("Could not load requests. Please check your permissions or connection.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => (map[d.id] = (d.data() as any).name || d.id));
      setGroupMap(map);
    });
    const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => (map[d.id] = (d.data() as any).name || d.id));
      setStationMap(map);
    });
    return () => {
      unsubGroups();
      unsubStations();
    };
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const statusOk = filter === "ALL" || r.status === filter;
      const q = search.trim().toLowerCase();
      const text = `${r.title} ${r.details} ${r.sentByName}`.toLowerCase();
      const searchOk = !q || text.includes(q);
      return statusOk && searchOk;
    });
  }, [requests, filter, search]);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const displayed = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const statusColor = (s: RequestData["status"]) =>
    s === "OPEN" ? "info" : s === "RESOLVED" ? "success" : "warning";

  const ensureRequestChat = async (req: RequestData) => {
    const id = `request_${req.id}`;
    const chatRef = doc(db, "chats", id);
    const existing = await getDoc(chatRef);
    if (!existing.exists()) {
      await setDoc(chatRef, {
        type: "REQUEST",
        requestId: req.id,
        requesterUid: req.sentByUid,
        requesterName: req.sentByName,
        subject: req.title,
        isActive: true,
        createdAt: serverTimestamp(),
        unreadCountOGL: 0,
        unreadCountSM: 0,
      });
    }
    return id;
  };

  const handleChat = async (req: RequestData) => {
    const id = await ensureRequestChat(req);
    setChatId(id);
    setChatTitle(`Help: ${req.title} — ${req.sentByName}`);
  };

  const updateStatus = async (req: RequestData, status: RequestData["status"]) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "requests", req.id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
    });
  };

  if (loading)
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  if (error)
    return (
      <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mt: 4 }}>
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      </Paper>
    );

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", pb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <HelpIcon /> Manage Help Requests
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Tabs
            value={filter}
            onChange={(_, v) => {
              setFilter(v);
              setPage(1);
            }}
            sx={{ minHeight: 40 }}
          >
            <Tab value="ALL" label="All" />
            <Tab value="OPEN" label="Open" />
            <Tab value="RESOLVED" label="Resolved" />
            <Tab value="INVALID" label="Invalid" />
          </Tabs>
          <TextField
            placeholder="Search title/details/sender"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />
        </Box>
      </Paper>

      <Paper sx={{ overflow: "hidden" }}>
        <List disablePadding>
          {displayed.length === 0 ? (
            <ListItem>
              <ListItemText primary="No requests found." />
            </ListItem>
          ) : (
            displayed.map((req, index) => (
              <React.Fragment key={req.id}>
                {index > 0 && <Divider />}
                <ListItem alignItems="flex-start" sx={{ py: 2, px: 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {req.title}
                        </Typography>
                        <Chip size="small" label={req.status} color={statusColor(req.status)} />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 1 }}>
                          {req.details}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Sent By: {req.sentByName}
                          {req.senderRole === "SM" && req.selectedStationId && (
                            <> ({stationMap[req.selectedStationId] || req.selectedStationId})</>
                          )}
                          {req.groupId && (
                            <> — Group: {groupMap[req.groupId] || req.groupId}</>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {req.timestamp?.toDate().toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, ml: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ChatIcon />}
                      onClick={() => handleChat(req)}
                    >
                      Chat
                    </Button>
                    {req.status !== "RESOLVED" && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => updateStatus(req, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                    )}
                    {req.status !== "INVALID" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<ReportProblemIcon />}
                        onClick={() => updateStatus(req, "INVALID")}
                      >
                        Invalid
                      </Button>
                    )}
                    {req.status !== "OPEN" && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<RestoreIcon />}
                        onClick={() => updateStatus(req, "OPEN")}
                      >
                        Reopen
                      </Button>
                    )}
                  </Box>
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              boundaryCount={2}
              siblingCount={1}
            />
          </Box>
        )}
      </Paper>

      {chatId && (
        <ChatWindow chatId={chatId} title={chatTitle} onClose={() => setChatId(null)} />
      )}
    </Box>
  );
};

export default AdminRequestManagement;
