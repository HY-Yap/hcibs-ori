import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderRole: "SM" | "OGL";
  timestamp: any;
}

interface Props {
  chatId: string;
  title: string; // e.g. "Chat with SM" or "Chat with Group 1"
  onClose: () => void;
}

export const ChatWindow: FC<Props> = ({ chatId, title, onClose }) => {
  const { currentUser, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Listen to Messages in real-time
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(list);
      // Auto-scroll to bottom on new message
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });

    // Mark messages as read when window is open
    if (profile?.role) {
      const myUnreadField =
        profile.role === "OGL" ? "unreadCountOGL" : "unreadCountSM";
      updateDoc(doc(db, "chats", chatId), { [myUnreadField]: 0 }).catch(
        console.error
      );
    }

    return () => unsub();
  }, [chatId, profile?.role]);

  // 2. Send Message Function
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const sendFn = httpsCallable(functions, "sendChatMessage");
      await sendFn({ chatId, message: newMessage });
      setNewMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper
      elevation={10}
      sx={{
        // --- RESPONSIVE STYLES ---
        position: "fixed",
        zIndex: 1300,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",

        // Mobile Styles (Full Screen)
        width: { xs: "100%", md: 400 },
        height: { xs: "100%", md: 500 },
        top: { xs: 0, md: "auto" }, // Top 0 on mobile covers screen
        bottom: { xs: 0, md: 20 },
        right: { xs: 0, md: 20 },
        left: { xs: 0, md: "auto" }, // Left 0 on mobile covers screen

        // Border Radius changes
        borderRadius: { xs: 0, md: "12px 12px 0 0" }, // Square on mobile, rounded top on desktop
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {messages.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            No messages yet. Say hi!
          </Typography>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.uid;
          return (
            <Box
              key={msg.id}
              sx={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: isMe ? "primary.light" : "white",
                  color: isMe ? "primary.contrastText" : "text.primary",
                  borderRadius: 2,
                  borderBottomRightRadius: isMe ? 0 : 2,
                  borderBottomLeftRadius: isMe ? 2 : 0,
                  boxShadow: 1,
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                  {msg.text}
                </Typography>
              </Paper>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  textAlign: isMe ? "right" : "left",
                  mt: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                {msg.timestamp
                  ?.toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Typography>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          bgcolor: "white",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={sending}
          autoComplete="off"
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
};
