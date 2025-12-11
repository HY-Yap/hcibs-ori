import { useEffect, useState } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  Alert,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { FileUpload } from "../components/FileUpload";

interface SideQuestData {
  id: string;
  name: string;
  description: string;
  points: number;
  submissionType: "none" | "photo" | "video";
  isSmManaged: boolean;
  // ADDED
  hasSecondStage?: boolean;
  secondSubmissionType?: "none" | "photo" | "video";
  secondDescription?: string;
}

interface GroupData {
  completedSideQuests?: string[];
  // ADDED
  stageOneCompletedSideQuests?: string[];
}

export const OglSideQuests: FC = () => {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<SideQuestData[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Form state for the currently active quest
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);

  // helper to create safe slug from a name
  const slugify = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

  const getUploadPath = (quest: SideQuestData) =>
    `submissions/${profile?.groupId}/${slugify(quest.name)}/`;

  // Remove uploaded file: try client-side delete first, then fall back to callable 'deleteSubmission'
  const handleRemoveFile = async () => {
    setSubmissionUrl(null); // Simplified for this block
  };

  useEffect(() => {
    const q = query(collection(db, "sideQuests"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setQuests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as SideQuestData))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile?.groupId) return;
    const unsub = onSnapshot(doc(db, "groups", profile.groupId), (docSnap) => {
      if (docSnap.exists()) {
        setGroupData(docSnap.data() as GroupData);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  const handleSubmit = async (quest: SideQuestData) => {
    if (!profile?.groupId) return;

    // Determine current stage requirements
    const isStageOneDone = groupData?.stageOneCompletedSideQuests?.includes(
      quest.id
    );
    const currentSubmissionType = quest.hasSecondStage && isStageOneDone
      ? quest.secondSubmissionType
      : quest.submissionType;

    if (currentSubmissionType !== "none" && !submissionUrl && !textAnswer) {
      alert("Please provide proof (file or text).");
      return;
    }

    setSubmittingId(quest.id);
    try {
      const fn = httpsCallable(firebaseFunctions, "submitScore");
      await fn({
        groupId: profile.groupId,
        sideQuestId: quest.id,
        type: "SIDE_QUEST",
        submissionUrl: submissionUrl || null,
        textAnswer: textAnswer || null,
      });
      setActiveQuestId(null);
      setSubmissionUrl(null);
      setTextAnswer("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4 }} />;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Side Quests
      </Typography>

      {quests.map((quest) => {
        const isCompleted = groupData?.completedSideQuests?.includes(quest.id);
        const isStageOneDone = groupData?.stageOneCompletedSideQuests?.includes(
          quest.id
        );
        const isActive = activeQuestId === quest.id;

        // Determine display data based on stage
        const displayDescription =
          quest.hasSecondStage && isStageOneDone
            ? quest.secondDescription
            : quest.description;
        const displaySubmissionType =
          quest.hasSecondStage && isStageOneDone
            ? quest.secondSubmissionType
            : quest.submissionType;
        const buttonText =
          quest.hasSecondStage && !isStageOneDone
            ? "Proceed to 2nd Stage"
            : "Claim Points";

        if (isCompleted) return null; // Hide completed

        return (
          <Card key={quest.id} sx={{ mb: 2, opacity: isCompleted ? 0.6 : 1 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6">{quest.name}</Typography>
                <Chip label={`${quest.points} pts`} color="primary" size="small" />
              </Box>

              {/* MODIFIED: Enhanced Markdown Rendering */}
              <Box sx={{ mt: 1, mb: 2 }}>
                {(displayDescription || "").split("\n").map((line, i) => {
                  const parseStyles = (text: string) => {
                    // Added _.*?_ for underline
                    const parts = text.split(
                      /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|_.*?_)/g
                    );
                    return parts.map((part, j) => {
                      if (part.startsWith("***") && part.endsWith("***")) {
                        return (
                          <span
                            key={j}
                            style={{
                              fontWeight: "bold",
                              fontStyle: "italic",
                            }}
                          >
                            {part.slice(3, -3)}
                          </span>
                        );
                      }
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      if (part.startsWith("*") && part.endsWith("*")) {
                        return <em key={j}>{part.slice(1, -1)}</em>;
                      }
                      if (part.startsWith("_") && part.endsWith("_")) {
                        return <u key={j}>{part.slice(1, -1)}</u>;
                      }
                      return <span key={j}>{part}</span>;
                    });
                  };

                  const parseInline = (text: string) => {
                    const linkParts = text.split(/(\[.*?\]\(.*?\))/g);
                    return linkParts.map((part, i) => {
                      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                      if (linkMatch) {
                        return (
                          <a
                            key={i}
                            href={linkMatch[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#1976d2",
                              textDecoration: "underline",
                            }}
                          >
                            {parseStyles(linkMatch[1])}
                          </a>
                        );
                      }
                      return parseStyles(part);
                    });
                  };

                  // Headers
                  if (line.startsWith("### "))
                    return (
                      <Typography
                        key={i}
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          mt: 1,
                          color: "text.primary",
                        }}
                      >
                        {parseInline(line.slice(4))}
                      </Typography>
                    );
                  if (line.startsWith("## "))
                    return (
                      <Typography
                        key={i}
                        variant="subtitle1"
                        sx={{
                          fontWeight: "bold",
                          mt: 1.5,
                          color: "text.primary",
                        }}
                      >
                        {parseInline(line.slice(3))}
                      </Typography>
                    );
                  if (line.startsWith("# "))
                    return (
                      <Typography
                        key={i}
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          mt: 2,
                          color: "text.primary",
                        }}
                      >
                        {parseInline(line.slice(2))}
                      </Typography>
                    );

                  // Blockquote
                  if (line.startsWith("> ")) {
                    return (
                      <Box
                        key={i}
                        sx={{
                          borderLeft: "4px solid #ccc",
                          pl: 2,
                          py: 0.5,
                          my: 1,
                          bgcolor: "rgba(0,0,0,0.03)",
                          fontStyle: "italic",
                        }}
                      >
                        <Typography variant="body2">
                          {parseInline(line.slice(2))}
                        </Typography>
                      </Box>
                    );
                  }

                  // Unordered List
                  if (line.startsWith("- ")) {
                    return (
                      <Box key={i} sx={{ display: "flex", ml: 1 }}>
                        <Typography sx={{ mr: 1 }}>•</Typography>
                        <Typography variant="body2">
                          {parseInline(line.slice(2))}
                        </Typography>
                      </Box>
                    );
                  }

                  // Ordered List
                  const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
                  if (orderedMatch) {
                    return (
                      <Box key={i} sx={{ display: "flex", ml: 1 }}>
                        <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                          {orderedMatch[1]}.
                        </Typography>
                        <Typography variant="body2">
                          {parseInline(orderedMatch[2])}
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Typography
                      key={i}
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {parseInline(line)}
                    </Typography>
                  );
                })}
              </Box>

              {quest.isSmManaged ? (
                <Alert severity="info">
                  Find a Station Master to verify this quest.
                </Alert>
              ) : (
                <>
                  {isActive ? (
                    <Box sx={{ mt: 2 }}>
                      {displaySubmissionType !== "none" && (
                        <Box sx={{ mb: 2 }}>
                          {/* Simplified File Upload Logic for brevity */}
                          {!submissionUrl ? (
                            <FileUpload
                              uploadPath={getUploadPath(quest)}
                              onUploadComplete={setSubmissionUrl}
                            />
                          ) : (
                            <Button
                              color="error"
                              onClick={handleRemoveFile}
                            >
                              Remove File
                            </Button>
                          )}
                        </Box>
                      )}
                      <TextField
                        fullWidth
                        label="Notes / Text Answer"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="contained"
                          onClick={() => handleSubmit(quest)}
                          disabled={!!submittingId}
                        >
                          {submittingId === quest.id ? (
                            <CircularProgress size={24} />
                          ) : (
                            buttonText
                          )}
                        </Button>
                        <Button onClick={() => setActiveQuestId(null)}>
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setActiveQuestId(quest.id)}
                    >
                      {isStageOneDone ? "Continue Quest" : "Start Quest"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
