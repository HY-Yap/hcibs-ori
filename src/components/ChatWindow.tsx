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
import DoneAllIcon from "@mui/icons-material/DoneAll"; // Icon for "Seen"
import CheckIcon from "@mui/icons-material/Check"; // Icon for "Delivered"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase"; // Ensure 'functions' is imported here if needed for consistency
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderRole: "SM" | "OGL" | "ADMIN";
  timestamp: any;
}

interface Props {
  chatId: string;
  title: string;
  onClose: () => void;
}

export const ChatWindow: FC<Props> = ({ chatId, title, onClose }) => {
  const { currentUser, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // --- NEW: Track other person's last seen time ---
  const [otherLastSeen, setOtherLastSeen] = useState<Date | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Listen to Messages AND Parent Chat Document
  useEffect(() => {
    // A. Messages Listener
    const qMsgs = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubMsgs = onSnapshot(qMsgs, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(list);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });

    // B. Parent Chat Listener (To see when THEY last looked)
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // If I am OGL, I want to know when SM last saw it (lastSeenSM)
        // If I am SM, I want to know when OGL last saw it (lastSeenOGL)
        const theirKey = profile?.role === "OGL" ? "lastSeenSM" : "lastSeenOGL";
        if (data[theirKey]) {
          setOtherLastSeen(data[theirKey].toDate());
        }
      }
    });

    return () => {
      unsubMsgs();
      unsubChat();
    };
  }, [chatId, profile?.role]);

  // 2. Update MY "Last Seen" (Runs whenever messages change)
  useEffect(() => {
    if (!profile?.role) return;
    // Skip for ADMIN role
    if (profile.role === "ADMIN") return;

    const myUnreadField =
      profile.role === "OGL" ? "unreadCountOGL" : "unreadCountSM";
    const myLastSeenField =
      profile.role === "OGL" ? "lastSeenOGL" : "lastSeenSM";

    // We mark as read + update timestamp whenever we see new messages
    // 'merge: true' is important to not overwrite other fields
    updateDoc(doc(db, "chats", chatId), {
      [myUnreadField]: 0,
      [myLastSeenField]: serverTimestamp(),
    }).catch((err) => console.error("Failed to mark read:", err));
  }, [messages.length, chatId, profile?.role]); // Run when message count changes

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
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
        position: "fixed",
        zIndex: 1300,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: { xs: "100%", md: 400 },
        height: { xs: "100%", md: 500 },
        top: { xs: 0, md: "auto" },
        bottom: { xs: 0, md: 20 },
        right: { xs: 0, md: 20 },
        left: { xs: 0, md: "auto" },
        borderRadius: { xs: 0, md: "12px 12px 0 0" },
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
            No messages yet.
          </Typography>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.uid;

          // --- NEW: Calculate Seen Status ---
          // Only show status for the VERY LAST message sent by ME
          let showStatus = false;
          let isSeen = false;

          // Check if this is the last message *I* sent
          // (We loop backwards from the end to find the last one sent by me)
          const myMessages = messages.filter(
            (m) => m.senderId === currentUser?.uid
          );
          const isMyLastMessage =
            myMessages.length > 0 &&
            myMessages[myMessages.length - 1].id === msg.id;

          if (isMe && isMyLastMessage) {
            showStatus = true;
            if (
              otherLastSeen &&
              msg.timestamp &&
              otherLastSeen > msg.timestamp.toDate()
            ) {
              isSeen = true;
            }
          }
          // ----------------------------------

          return (
            <Box
              key={msg.id}
              sx={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "85%",
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
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

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem" }}
                >
                  {msg.timestamp?.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>

                {/* Status Indicator */}
                {showStatus && (
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: isSeen ? "primary.main" : "text.disabled",
                    }}
                  >
                    {isSeen ? (
                      <>
                        <DoneAllIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.7rem", fontWeight: "bold" }}
                        >
                          Seen{" "}
                          {otherLastSeen?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <CheckIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          Delivered
                        </Typography>
                      </>
                    )}
                  </Box>
                )}
              </Box>
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
