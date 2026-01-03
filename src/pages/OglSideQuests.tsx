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
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
} from "firebase/firestore";
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
  const [submissionUrls, setSubmissionUrls] = useState<string[]>([]);

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
  const handleRemoveFile = (urlToRemove: string) => {
    setSubmissionUrls((prev) => prev.filter((url) => url !== urlToRemove));
  };

  useEffect(() => {
    const q = query(collection(db, "sideQuests"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedQuests = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SideQuestData)
      );
      // Sort by points in ascending order
      fetchedQuests.sort((a, b) => a.points - b.points);
      setQuests(fetchedQuests);
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
    const currentSubmissionType =
      quest.hasSecondStage && isStageOneDone
        ? quest.secondSubmissionType
        : quest.submissionType;

    // For photo/video quests, a file upload is mandatory
    if (currentSubmissionType !== "none" && submissionUrls.length === 0) {
      alert("Please upload at least one file for this quest.");
      return;
    }

    setSubmittingId(quest.id);
    try {
      const fn = httpsCallable(firebaseFunctions, "submitScore");
      await fn({
        groupId: profile.groupId,
        sideQuestId: quest.id,
        type: "SIDE_QUEST",
        submissionUrl: submissionUrls.length > 0 ? submissionUrls : null,
        textAnswer: textAnswer || null,
      });
      setActiveQuestId(null);
      setSubmissionUrls([]);
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
                <Chip
                  label={`${quest.points} pts`}
                  color="primary"
                  size="small"
                />
              </Box>

              {/* MODIFIED: Enhanced Markdown Rendering */}
              <Box sx={{ mt: 1, mb: 2 }}>
                {(() => {
                  const lines = (displayDescription || "").split("\n");
                  const nodes: any[] = [];
                  let i = 0;
                  while (i < lines.length) {
                    const line = lines[i];
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
                      // Split by images first
                      const parts = text.split(/(<img src=".*?">)/g);

                      return parts.map((part, i) => {
                        const imgMatch = part.match(/^<img src="(.*?)">$/);
                        if (imgMatch) {
                          return (
                            <Box
                              key={`img-${i}`}
                              component="img"
                              src={imgMatch[1]}
                              alt="Markdown Image"
                              sx={{
                                maxWidth: "100%",
                                borderRadius: 1,
                                my: 1,
                                display: "block",
                              }}
                            />
                          );
                        }

                        const linkParts = part.split(/(\[.*?\]\(.*?\))/g);
                        return linkParts.map((subPart, j) => {
                          const linkMatch =
                            subPart.match(/^\[(.*?)\]\((.*?)\)$/);
                          if (linkMatch) {
                            return (
                              <a
                                key={`link-${i}-${j}`}
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
                          return parseStyles(subPart);
                        });
                      });
                    };

                    // Headers
                    if (line.startsWith("### ")) {
                      nodes.push(
                        <Typography
                          key={`h3-${i}`}
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
                      i++;
                      continue;
                    }
                    if (line.startsWith("## ")) {
                      nodes.push(
                        <Typography
                          key={`h2-${i}`}
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
                      i++;
                      continue;
                    }
                    if (line.startsWith("# ")) {
                      nodes.push(
                        <Typography
                          key={`h1-${i}`}
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
                      i++;
                      continue;
                    }

                    // Grouped Blockquote
                    if (line.startsWith("> ")) {
                      const quotePieces: any[] = [];
                      const start = i;
                      while (i < lines.length && lines[i].startsWith("> ")) {
                        const content = parseInline(lines[i].slice(2));
                        quotePieces.push(
                          <span key={`qline-${i}`}>{content}</span>
                        );
                        if (
                          i + 1 < lines.length &&
                          lines[i + 1].startsWith("> ")
                        ) {
                          quotePieces.push(<br key={`qbr-${i}`} />);
                        }
                        i++;
                      }
                      nodes.push(
                        <Box
                          key={`quote-${start}`}
                          sx={{
                            borderLeft: "4px solid #ccc",
                            pl: 2,
                            py: 0.5,
                            my: 1,
                            bgcolor: "rgba(0,0,0,0.03)",
                            fontStyle: "italic",
                          }}
                        >
                          <Typography variant="body2">{quotePieces}</Typography>
                        </Box>
                      );
                      continue;
                    }

                    // Unordered List
                    if (line.startsWith("- ")) {
                      nodes.push(
                        <Box key={`ul-${i}`} sx={{ display: "flex", ml: 1 }}>
                          <Typography sx={{ mr: 1 }}>•</Typography>
                          <Typography variant="body2">
                            {parseInline(line.slice(2))}
                          </Typography>
                        </Box>
                      );
                      i++;
                      continue;
                    }

                    // Ordered List
                    const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
                    if (orderedMatch) {
                      nodes.push(
                        <Box key={`ol-${i}`} sx={{ display: "flex", ml: 1 }}>
                          <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                            {orderedMatch[1]}.
                          </Typography>
                          <Typography variant="body2">
                            {parseInline(orderedMatch[2])}
                          </Typography>
                        </Box>
                      );
                      i++;
                      continue;
                    }

                    nodes.push(
                      <Typography
                        key={`p-${i}`}
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {parseInline(line)}
                      </Typography>
                    );
                    i++;
                  }
                  return nodes;
                })()}
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
                          <FileUpload
                            uploadPath={getUploadPath(quest)}
                            onUploadComplete={(url) =>
                              setSubmissionUrls((prev) => [...prev, url])
                            }
                          />
                          {submissionUrls.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" display="block">
                                Uploaded Files:
                              </Typography>
                              {submissionUrls.map((url, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mt: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      maxWidth: 200,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    File {idx + 1}
                                  </Typography>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveFile(url)}
                                  >
                                    Remove
                                  </Button>
                                </Box>
                              ))}
                            </Box>
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
                          disabled={
                            !!submittingId ||
                            (displaySubmissionType !== "none" &&
                              submissionUrls.length === 0)
                          }
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
