import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemButton,
  Pagination,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { StationSelector } from "../components/StationSelector";
import { getFunctions, httpsCallable } from "firebase/functions";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ChatIcon from "@mui/icons-material/Chat";
import CampaignIcon from "@mui/icons-material/Campaign";
import { SmActionModal, type GroupForModal } from "../components/SmActionModal";
import { ChatWindow } from "../components/ChatWindow";

interface StationData {
  id: string;
  name: string;
  type: "manned" | "unmanned";
  status: "OPEN" | "LUNCH_SOON" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY";
}

interface GroupData {
  id: string;
  name: string;
  status: "IDLE" | "TRAVELING" | "ARRIVED" | "ON_LUNCH";
  destinationEta?: string;
  totalScore: number;
  completedStations?: string[];
  destinationId?: string;
}

interface AnnouncementData {
  id: string;
  message: string;
  timestamp: any;
  targets?: string[];
}

interface ChatData {
  id: string;
  groupName: string;
  lastMessage: string;
  unreadCountSM: number;
}

export const SmDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stationId, setStationId] = useState<string | null>(null);
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [onTheWayGroups, setOnTheWayGroups] = useState<GroupData[]>([]);
  const [arrivedGroups, setArrivedGroups] = useState<GroupData[]>([]);
  const [scoredGroups, setScoredGroups] = useState<GroupData[]>([]);
  const [yetToDepartGroups, setYetToDepartGroups] = useState<GroupData[]>([]);

  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"LUNCH" | "CLOSE" | null>(
    null
  );
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupForModal | null>(
    null
  );

  const [activeChats, setActiveChats] = useState<ChatData[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const finalizingRef = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (!currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        setStationId(docSnap.data()?.selectedStationId || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [currentUser]);

  // Fetch Announcements
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
            ann.targets.includes("SM") ||
            ann.targets.includes("GUEST") ||
            (stationId && ann.targets.includes(`SM:${stationId}`))
        );
      setAnnouncements(list);
    });
    return () => unsub();
  }, [stationId]);

  // Listen to Station Data
  useEffect(() => {
    if (!stationId) return;
    const unsub = onSnapshot(
      doc(db, "stations", stationId),
      (d) => setStationData({ id: d.id, ...d.data() } as StationData),
      () => setError("Lost connection to station.")
    );
    return () => unsub();
  }, [stationId]);

  // Listen to Queues
  useEffect(() => {
    if (!stationId) return;
    const q = collection(db, "groups");
    const unsub = onSnapshot(q, (snapshot) => {
      const allGroups = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupData)
      );
      setOnTheWayGroups(
        allGroups.filter(
          (g) => g.destinationId === stationId && g.status === "TRAVELING"
        )
      );
      setArrivedGroups(
        allGroups.filter(
          (g) => g.destinationId === stationId && g.status === "ARRIVED"
        )
      );
      setScoredGroups(
        allGroups.filter((g) => g.completedStations?.includes(stationId))
      );
      setYetToDepartGroups(
        allGroups.filter(
          (g) =>
            !g.completedStations?.includes(stationId) &&
            g.destinationId !== stationId
        )
      );
    });
    return () => unsub();
  }, [stationId]);

  // Listen to Active Chats
  useEffect(() => {
    if (!stationId) return;
    const qChats = query(
      collection(db, "chats"),
      where("stationId", "==", stationId),
      where("isActive", "==", true)
    );
    const unsubChats = onSnapshot(qChats, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ChatData)
      );
      setActiveChats(list);
    });

    return () => unsubChats();
  }, [stationId]);

  // Lunch finalize logic
  useEffect(() => {
    if (!stationData) return;
    if (stationData.status !== "LUNCH_SOON") {
      finalizingRef.current = false;
      return;
    }
    const hasGroups = onTheWayGroups.length + arrivedGroups.length > 0;
    if (!hasGroups && !finalizingRef.current) {
      finalizingRef.current = true;
      (async () => {
        setActionLoading(true);
        try {
          const fn = httpsCallable(
            getFunctions(undefined, "asia-southeast1"),
            "updateStationStatus"
          );
          await fn({ stationId: stationId!, newStatus: "CLOSED_LUNCH" });
        } catch (err: any) {
          console.error("Failed to finalize lunch:", err);
          setError(err?.message || "Failed to finalize lunch.");
          finalizingRef.current = false;
        } finally {
          setActionLoading(false);
        }
      })();
    }
  }, [stationData, onTheWayGroups.length, arrivedGroups.length, stationId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!stationId) return;
    setActionLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "updateStationStatus"
      );
      await fn({ stationId, newStatus });
      setConfirmOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to change station status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveStation = async () => {
    if (!window.confirm("Are you sure you want to leave this station?")) return;
    setLoading(true);
    try {
      const fn = httpsCallable(
        getFunctions(undefined, "asia-southeast1"),
        "leaveStation"
      );
      await fn();
      window.location.reload();
    } catch (err: any) {
      alert("Failed: " + err.message);
      setLoading(false);
    }
  };

  const handleToggleLunch = async () => {
    await handleStatusChange("OPEN");
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (!stationId)
    return (
      <StationSelector onStationSelected={() => window.location.reload()} />
    );
  if (!stationData)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  const status = stationData.status;

  if (stationData.status === "CLOSED_LUNCH")
    return (
      <Box sx={{ textAlign: "center", mt: 8, p: 2 }}>
        <RestaurantIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          On Lunch Break
        </Typography>
        <Typography paragraph>
          Enjoy your meal! Click below when you are ready to resume.
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

  const listAnnouncements = announcements.filter(
    (ann) =>
      !ann.targets ||
      ann.targets.includes("SM") ||
      (stationId && ann.targets.includes(`SM:${stationId}`))
  );

  const totalPages = Math.ceil(listAnnouncements.length / itemsPerPage);
  const displayedAnnouncements = listAnnouncements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ pb: 4 }}>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          bgcolor: "#fef5e7",
          border: "2px solid #eec45c",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ mb: 0, color: "#473321" }}>
              {stationData?.name}
            </Typography>
            <Button
              variant="text"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={handleLeaveStation}
              sx={{ color: "#8d6e63", opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              Change
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ color: "#473321" }}>
              Status:
            </Typography>
            <Chip
              label={(status || "OPEN").replace("_", " ")}
              sx={{
                fontWeight: "bold",
                bgcolor:
                  status === "OPEN"
                    ? "#4caf50"
                    : status === "LUNCH_SOON"
                    ? "#ffb74d"
                    : "#c62828",
                color: "white",
              }}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {status === "OPEN" ? (
            <Button
              variant="contained"
              startIcon={<RestaurantIcon />}
              disabled={actionLoading}
              onClick={() => {
                setConfirmAction("LUNCH");
                setConfirmOpen(true);
              }}
              sx={{ bgcolor: "#ff9800", "&:hover": { bgcolor: "#f57c00" } }}
            >
              Lunch
            </Button>
          ) : status === "LUNCH_SOON" ? (
            <Button variant="contained" disabled>
              {onTheWayGroups.length + arrivedGroups.length > 0
                ? "WAITING FOR GROUPS TO FINISH"
                : "FINALIZING..."}
            </Button>
          ) : status === "CLOSED_LUNCH" ? (
            <Button
              variant="contained"
              startIcon={<LockOpenIcon />}
              disabled={actionLoading}
              onClick={() => handleStatusChange("OPEN")}
              sx={{ bgcolor: "#4caf50", "&:hover": { bgcolor: "#45a049" } }}
            >
              Re-open
            </Button>
          ) : null}
          {status !== "CLOSED_PERMANENTLY" && (
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              disabled={actionLoading}
              onClick={() => {
                setConfirmAction("CLOSE");
                setConfirmOpen(true);
              }}
              sx={{
                borderColor: "#c62828",
                color: "#c62828",
                "&:hover": {
                  borderColor: "#b71c1c",
                  bgcolor: "rgba(198, 40, 40, 0.04)",
                },
              }}
            >
              Close
            </Button>
          )}
        </Box>
      </Paper>

      {/* ACTIVE CHATS LIST */}
      {activeChats.length > 0 && (
        <Paper
          sx={{ p: 2, mb: 3, bgcolor: "#e0f7fa", border: "1px solid #4dd0e1" }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <ChatIcon color="info" /> Active Chats ({activeChats.length})
          </Typography>
          <List disablePadding>
            {activeChats.map((chat) => (
              <ListItem
                key={chat.id}
                disablePadding
                sx={{ bgcolor: "white", mb: 1, borderRadius: 1 }}
                secondaryAction={
                  chat.unreadCountSM > 0 && (
                    <Chip
                      label={`${chat.unreadCountSM} new`}
                      color="error"
                      size="small"
                    />
                  )
                }
              >
                <ListItemButton onClick={() => setSelectedChatId(chat.id)}>
                  <ListItemText
                    primary={chat.groupName}
                    secondary={chat.lastMessage || "No messages yet"}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* QUEUES */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        <Paper sx={{ flex: 1, p: 2, bgcolor: "#f8f9fa", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            🚍 On The Way ({onTheWayGroups.length})
          </Typography>
          <Divider />
          <List>
            {onTheWayGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="No groups traveling here." />
              </ListItem>
            ) : (
              onTheWayGroups.map((group) => (
                <ListItem
                  key={group.id}
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemText
                    primary={group.name}
                    secondary={`ETA: ${group.destinationEta || "Unknown"}`}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: "#e3f2fd", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            🧘 Arrived & Waiting ({arrivedGroups.length})
          </Typography>
          <Divider />
          <List>
            {arrivedGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="Queue is empty." />
              </ListItem>
            ) : (
              arrivedGroups.map((group) => (
                <ListItem
                  key={group.id}
                  disablePadding
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedGroup({ id: group.id, name: group.name });
                        setActionModalOpen(true);
                      }}
                    >
                      Score
                    </Button>
                  }
                >
                  <ListItemButton
                    onClick={() => {
                      setSelectedGroup({ id: group.id, name: group.name });
                      setActionModalOpen(true);
                    }}
                  >
                    <ListItemText
                      primary={group.name}
                      secondary="Ready for activity"
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>

      {/* ADDITIONAL LISTS: SCORED & YET TO DEPART */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          mt: 3,
        }}
      >
        <Paper sx={{ flex: 1, p: 2, bgcolor: "#e8f5e9", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            ✅ Scored ({scoredGroups.length})
          </Typography>
          <Divider />
          <List>
            {scoredGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="No groups scored yet." />
              </ListItem>
            ) : (
              scoredGroups.map((group) => (
                <ListItem
                  key={group.id}
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemText primary={group.name} secondary="Completed" />
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: "#fff3e0", minHeight: 300 }}>
          <Typography variant="h6" gutterBottom>
            ⏳ Yet To Depart ({yetToDepartGroups.length})
          </Typography>
          <Divider />
          <List>
            {yetToDepartGroups.length === 0 ? (
              <ListItem>
                <ListItemText secondary="No groups pending." />
              </ListItem>
            ) : (
              yetToDepartGroups.map((group) => (
                <ListItem
                  key={group.id}
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemText
                    primary={group.name}
                    secondary="Not visited yet"
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>

      {/* CHAT WINDOW */}
      {selectedChatId && (
        <ChatWindow
          chatId={selectedChatId}
          title={`Chat with ${
            activeChats.find((c) => c.id === selectedChatId)?.groupName ||
            "Group"
          }`}
          onClose={() => setSelectedChatId(null)}
        />
      )}

      {/* SM ANNOUNCEMENTS */}
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
          <CampaignIcon color="error" /> SM Announcements
        </Typography>
        <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
          {displayedAnnouncements.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">
                No announcements for SMs yet.
              </Typography>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {displayedAnnouncements.map((ann, index) => (
                  <React.Fragment key={ann.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 1, px: 2 }}>
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

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmAction === "LUNCH" ? "Go on Lunch?" : "Close Station?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction === "LUNCH"
              ? "Request lunch break? (Station will close after current groups finish)"
              : "WARNING: Permanently close station?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleStatusChange(
                confirmAction === "LUNCH" ? "LUNCH_SOON" : "CLOSED_PERMANENTLY"
              )
            }
            color={confirmAction === "CLOSE" ? "error" : "warning"}
            variant="contained"
            disabled={actionLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {selectedGroup && stationId && (
        <SmActionModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          group={selectedGroup}
          stationId={stationId}
        />
      )}
    </Box>
  );
};
export default SmDashboard;
