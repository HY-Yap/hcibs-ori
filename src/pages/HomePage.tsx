import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Container,
  Pagination, // Added Pagination
} from "@mui/material";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import CampaignIcon from "@mui/icons-material/Campaign";

interface AnnouncementData {
  id: string;
  message: string;
  timestamp: any;
  targets?: string[]; // Added targets field
}

export const HomePage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [page, setPage] = useState(1); // Pagination state
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      // where("targets", "array-contains", "GUEST"), // REMOVED
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AnnouncementData))
        .filter((ann) => !ann.targets || ann.targets.includes("GUEST")); // Client-side filter
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  // Pagination Logic
  const totalPages = Math.ceil(announcements.length / itemsPerPage);
  const displayedAnnouncements = announcements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Welcome to HCIBS
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Hwa Chong Institution Boarding School
        </Typography>
      </Box>

      {/* Announcements Section */}
      <Box>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: "bold",
            color: "#d32f2f", // Red color for attention
          }}
        >
          <CampaignIcon fontSize="large" /> Announcements
        </Typography>

        {displayedAnnouncements.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            No announcements at the moment.
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
            <List disablePadding>
              {displayedAnnouncements.map((ann, index) => (
                <React.Fragment key={ann.id}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ py: 0.5, px: 3 }}> {/* Reduced py from 3 to 0.5 */}
                    <ListItemText
                      primary={
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: "pre-wrap",
                            fontSize: "1.1rem",
                          }}
                        >
                          {ann.message}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: "block",
                          }}
                        >
                          {ann.timestamp?.toDate().toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </Typography>
                      }
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
                />
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
};
