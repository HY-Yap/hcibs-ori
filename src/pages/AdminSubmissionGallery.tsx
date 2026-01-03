import { useEffect, useState, useMemo } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Card,
  CardMedia,
  CardContent,
  Alert,
  Chip,
  Link,
  Divider,
  Button,
} from "@mui/material";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, functions as firebaseFunctions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import CollectionsIcon from "@mui/icons-material/Collections";
import ArticleIcon from "@mui/icons-material/Article";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DownloadIcon from "@mui/icons-material/Download";

interface Submission {
  id: string;
  groupId: string;
  sourceId: string; // This is the stationId or sideQuestId
  submissionUrl?: string | string[];
  textAnswer?: string;
  timestamp: any;
}
interface Task {
  id: string;
  name: string;
}
interface Group {
  id: string;
  name: string;
}

export const AdminSubmissionGallery: FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  useEffect(() => {
    // A. Fetch all submissions (logs with submission data)
    const qFiles = query(
      collection(db, "scoreLog"),
      where("submissionUrl", "!=", null)
    );
    const qText = query(
      collection(db, "scoreLog"),
      where("textAnswer", "!=", null)
    );

    const unsubLogs = onSnapshot(
      qFiles,
      (snapFiles) => {
        onSnapshot(qText, (snapText) => {
          const subs: Record<string, Submission> = {};
          const processSnap = (snap: any) => {
            snap.docs.forEach((d: any) => {
              const data = d.data();
              // Use stationId for stations, sourceId for side quests
              const sourceId = data.stationId || data.sourceId || "unknown";
              subs[d.id] = { id: d.id, ...data, sourceId } as Submission;
            });
          };
          processSnap(snapFiles);
          processSnap(snapText);

          setSubmissions(Object.values(subs));
          setLoading(false);
        });
      },
      (err) => {
        console.error(err);
        setError("Failed to load submissions.");
        setLoading(false);
      }
    );

    // B. Fetch Tasks
    const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
      setTasks((prev) => {
        const newTasks = { ...prev };
        snap.forEach((doc) => {
          newTasks[doc.id] = { id: doc.id, name: doc.data().name };
        });
        return newTasks;
      });
    });
    const unsubQuests = onSnapshot(collection(db, "sideQuests"), (snap) => {
      setTasks((prev) => {
        const newTasks = { ...prev };
        snap.forEach((doc) => {
          newTasks[doc.id] = { id: doc.id, name: doc.data().name };
        });
        return newTasks;
      });
    });

    // C. Fetch Groups
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const map: Record<string, Group> = {};
      snap.forEach((doc) => {
        map[doc.id] = { id: doc.id, name: doc.data().name };
      });
      setGroups(map);
    });

    return () => {
      unsubLogs();
      unsubStations();
      unsubQuests();
      unsubGroups();
    };
  }, []);

  // 2. GROUP SUBMISSIONS BY TASK
  const submissionsByTask = useMemo(() => {
    const grouped: Record<string, Submission[]> = {};
    for (const sub of submissions) {
      if (!grouped[sub.sourceId]) grouped[sub.sourceId] = [];
      grouped[sub.sourceId].push(sub);
    }
    return Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);
  }, [submissions]);

  // --- HANDLER FOR ZIP DOWNLOAD ---
  const handleDownloadZip = async (taskId: string, taskName: string) => {
    setZipLoading(true);
    setZipError(null);
    try {
      // Standard Callable Function (Secure & Simple)
      // Note: functions is already initialized with 'asia-southeast1' in ../firebase
      const zipFn = httpsCallable(firebaseFunctions, "zipTaskSubmissions");

      const result = await zipFn({ taskId, taskName });
      const { url } = result.data as any;

      if (!url) throw new Error("No URL returned.");

      window.open(url, "_blank");
    } catch (err: any) {
      console.error("ZIP Error:", err);
      setZipError(err.message || "Failed to create ZIP.");
    } finally {
      setZipLoading(false);
    }
  };

  // Shows a single submission card
  const renderSubmissionCard = (sub: Submission) => {
    const urls = Array.isArray(sub.submissionUrl)
      ? sub.submissionUrl
      : sub.submissionUrl
      ? [sub.submissionUrl]
      : [];
    const text = sub.textAnswer;

    const renderMedia = (url: string, index: number) => {
      const isVideo =
        url.includes(".mp4") || url.includes(".mov") || url.includes("video");
      const isImage =
        url.includes(".jpg") ||
        url.includes(".jpeg") ||
        url.includes(".png") ||
        url.includes(".gif");

      if (isVideo) {
        return (
          <CardMedia
            key={index}
            component="video"
            controls
            src={url}
            sx={{ height: 200, bgcolor: "black", mb: urls.length > 1 ? 1 : 0 }}
          />
        );
      } else if (isImage) {
        return (
          <CardMedia
            key={index}
            component="img"
            image={url}
            alt={`Submission ${index + 1}`}
            sx={{
              height: 200,
              objectFit: "cover",
              mb: urls.length > 1 ? 1 : 0,
            }}
          />
        );
      } else {
        return (
          <Box
            key={index}
            sx={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              bgcolor: "#f0f0f0",
              mb: urls.length > 1 ? 1 : 0,
            }}
          >
            <FilePresentIcon sx={{ fontSize: 60, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Preview unavailable
            </Typography>
          </Box>
        );
      }
    };

    return (
      <Card
        key={sub.id}
        sx={{
          height: "100%",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {urls.map((url, idx) => renderMedia(url, idx))}
        </Box>
        <CardContent sx={{ bgcolor: "#f9f9f9", flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {groups[sub.groupId]?.name || "Unknown Group"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sub.timestamp?.toDate().toLocaleString()}
          </Typography>

          {/* Show text answer if exists */}
          {text && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: "#e3f2fd", borderRadius: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 0.5,
                }}
              >
                <ArticleIcon sx={{ fontSize: 18, color: "primary.main" }} />
                <Typography
                  variant="caption"
                  color="primary.main"
                  fontWeight="bold"
                >
                  Text Answer:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                "{text}"
              </Typography>
            </Box>
          )}

          {urls.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {urls.map((url, idx) => (
                <Link
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  View full file {urls.length > 1 ? idx + 1 : ""}
                </Link>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDetailView = () => {
    const taskSubs = submissions
      .filter((s) => s.sourceId === selectedTaskId)
      .sort(
        (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
      ); // Sort by timestamp
    const taskName = tasks[selectedTaskId!]?.name || "Unknown Task";

    return (
      <Box>
        <Button
          startIcon={<ChevronLeftIcon />}
          onClick={() => setSelectedTaskId(null)}
          sx={{ mb: 2 }}
        >
          Back to Gallery
        </Button>
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="h5" component="h2">
              {taskName}
            </Typography>
            <Box>
              <Chip
                label={`${taskSubs.length} submission(s)`}
                color="primary"
                sx={{ mr: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={
                  zipLoading ? <CircularProgress size={20} /> : <DownloadIcon />
                }
                disabled={
                  zipLoading ||
                  taskSubs.filter((s) => s.submissionUrl).length === 0
                }
                onClick={() => handleDownloadZip(selectedTaskId!, taskName)}
              >
                Download Files (.zip)
              </Button>
            </Box>
          </Box>

          {zipError && (
            <Alert severity="error" sx={{ my: 2 }}>
              {zipError}
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
            }}
          >
            {taskSubs.map(renderSubmissionCard)}
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderTaskGrid = () => (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        All file & text submissions from all groups, organized by task.
      </Typography>
      {submissionsByTask.length === 0 && !loading && (
        <Alert severity="info">No submissions found yet.</Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {submissionsByTask.map(([taskId, taskSubmissions]) => (
          <Paper
            key={taskId}
            onClick={() => setSelectedTaskId(taskId)}
            sx={{
              p: 2,
              borderRadius: 2,
              boxShadow: 1,
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { boxShadow: 4, transform: "translateY(-4px)" },
            }}
          >
            <Typography variant="h6" component="h2" noWrap>
              {tasks[taskId]?.name || "Unknown Task"}
            </Typography>
            <Chip
              label={`${taskSubmissions.length} submission(s)`}
              color="primary"
              size="small"
            />
          </Paper>
        ))}
      </Box>
    </Box>
  );

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ pb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
      >
        <CollectionsIcon fontSize="large" /> Submission Gallery
      </Typography>
      {selectedTaskId ? renderDetailView() : renderTaskGrid()}
    </Box>
  );
};
