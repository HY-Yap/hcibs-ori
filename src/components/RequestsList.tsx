import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import HelpIcon from "@mui/icons-material/Help";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { ChatWindow } from "./ChatWindow";
import { useAuth } from "../context/AuthContext";

interface RequestData {
  id: string;
  title: string;
  details: string;
  timestamp: any;
  status: "OPEN" | "RESOLVED" | "INVALID";
  sentByUid: string;
  sentByName: string;
  acceptedByUid?: string;
  acceptedByName?: string;
}

export const RequestsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string>("");

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "requests"),
      where("sentByUid", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequestData));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load requests:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

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
    setChatTitle(`Help: ${req.title}`);
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <HelpIcon /> My Help Requests
      </Typography>
      <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
        {requests.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">No help requests yet.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {requests.map((req, index) => (
              <React.Fragment key={req.id}>
                {index > 0 && <Divider />}
                <ListItem
                  alignItems="flex-start"
                  sx={{ py: 2, px: 2 }}
                  secondaryAction={
                    req.status === "OPEN" && req.acceptedByUid ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ChatIcon />}
                        onClick={() => handleChat(req)}
                      >
                        Chat
                      </Button>
                    ) : req.status === "OPEN" ? (
                      <Chip label="Waiting for Admin" size="small" variant="outlined" />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ChatIcon />}
                        onClick={() => handleChat(req)}
                      >
                        View Chat
                      </Button>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mr: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {req.title}
                        </Typography>
                        <Chip size="small" label={req.status} color={statusColor(req.status)} />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 0.5 }}>
                          {req.details}
                        </Typography>
                        {req.acceptedByName && (
                          <Typography variant="caption" display="block" color="info.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Attended by: {req.acceptedByName}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {req.timestamp?.toDate().toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {chatId && (
        <ChatWindow chatId={chatId} title={chatTitle} onClose={() => setChatId(null)} />
      )}
    </Box>
  );
};
