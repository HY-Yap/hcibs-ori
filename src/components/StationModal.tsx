import { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";

// ADDED: Enhanced Markdown Preview Component
const MarkdownPreview = ({ text }: { text: string }) => {
  if (!text) return null;

  const parseStyles = (text: string) => {
    // Added _.*?_ for underline
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
    return parts.map((part, j) => {
      if (part.startsWith("***") && part.endsWith("***")) {
        return (
          <span key={j} style={{ fontWeight: "bold", fontStyle: "italic" }}>
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
            sx={{ maxWidth: "100%", borderRadius: 1, my: 1, display: "block" }}
          />
        );
      }

      const linkParts = part.split(/(\[.*?\]\(.*?\))/g);
      return linkParts.map((subPart, j) => {
        const linkMatch = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={`link-${i}-${j}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1976d2", textDecoration: "underline" }}
            >
              {parseStyles(linkMatch[1])}
            </a>
          );
        }
        return parseStyles(subPart);
      });
    });
  };

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        bgcolor: "#fafafa",
        borderRadius: 1,
        border: "1px dashed #bdbdbd",
        typography: "body2",
      }}
    >
      <Typography
        variant="caption"
        display="block"
        sx={{
          mb: 0.5,
          fontWeight: "bold",
          color: "text.secondary",
          textTransform: "uppercase",
        }}
      >
        Live Preview
      </Typography>
      {(() => {
        const lines = text.split("\n");
        const nodes: any[] = [];
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
        // Headers
        if (line.startsWith("### ")) {
          nodes.push(
            <Typography key={`h3-${i}`} variant="subtitle1" sx={{ fontWeight: "bold", mt: 1 }}>
              {parseInline(line.slice(4))}
            </Typography>
          );
          i++; continue;
        }
        if (line.startsWith("## ")) {
          nodes.push(
            <Typography key={`h2-${i}`} variant="h6" sx={{ fontWeight: "bold", mt: 1.5 }}>
              {parseInline(line.slice(3))}
            </Typography>
          );
          i++; continue;
        }
        if (line.startsWith("# ")) {
          nodes.push(
            <Typography key={`h1-${i}`} variant="h5" sx={{ fontWeight: "bold", mt: 2 }}>
              {parseInline(line.slice(2))}
            </Typography>
          );
          i++; continue;
        }

        // Blockquote
        if (line.startsWith("> ")) {
          const quotePieces: any[] = [];
          const start = i;
          while (i < lines.length && lines[i].startsWith("> ")) {
            const content = parseInline(lines[i].slice(2));
            quotePieces.push(<span key={`qline-${i}`}>{content}</span>);
            if (i + 1 < lines.length && lines[i + 1].startsWith("> ")) {
              quotePieces.push(<br key={`qbr-${i}`} />);
            }
            i++;
          }
          nodes.push(
            <Box key={`quote-${start}`} sx={{ borderLeft: "4px solid #ccc", pl: 2, py: 0.5, my: 1, bgcolor: "rgba(0,0,0,0.03)", fontStyle: "italic" }}>
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
              <Typography variant="body2">{parseInline(line.slice(2))}</Typography>
            </Box>
          );
          i++; continue;
        }

        // Ordered List
        const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
        if (orderedMatch) {
          nodes.push(
            <Box key={`ol-${i}`} sx={{ display: "flex", ml: 1 }}>
              <Typography sx={{ mr: 1, fontWeight: "bold" }}>{orderedMatch[1]}.</Typography>
              <Typography variant="body2">{parseInline(orderedMatch[2])}</Typography>
            </Box>
          );
          i++; continue;
        }

        nodes.push(
          <Box key={`p-${i}`} sx={{ minHeight: line ? "auto" : "1em" }}>
            {parseInline(line)}
          </Box>
        );
        i++;
        }
        return nodes;
      })()}
    </Box>
  );
};

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 400 },
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  maxHeight: "90vh",
  overflowY: "auto",
};

export interface StationData {
  id?: string;
  name: string;
  type: "manned" | "unmanned" | "ending_location";
  description: string;
  location: string;
  points?: number;
  minPoints?: number; // ADDED
  maxPoints?: number; // ADDED
  status?: string;
  travelingCount?: number;
  arrivedCount?: number;
  hasSecondStage?: boolean;
  secondDescription?: string;
  area?: string;
  bonusType?: "none" | "early-bird" | "late-game";
}

interface StationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: StationData | null;
  existingAreas: string[]; // ADDED: List of existing areas
}

export const StationModal: FC<StationModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
  existingAreas,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"manned" | "unmanned" | "ending_location" | "">("");
  const [minPoints, setMinPoints] = useState(50); // ADDED
  const [maxPoints, setMaxPoints] = useState(50); // ADDED
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  
  // Area State
  const [areaSelection, setAreaSelection] = useState(""); 
  const [customAreaName, setCustomAreaName] = useState("");

  const [hasSecondStage, setHasSecondStage] = useState(false);
  const [secondDescription, setSecondDescription] = useState("");
  const [bonusType, setBonusType] = useState<"none" | "early-bird" | "late-game">("none");

  const [status, setStatus] = useState<
    "OPEN" | "LUNCH_SOON" | "CLOSED_LUNCH" | "CLOSED_PERMANENTLY"
  >("OPEN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- POPULATE FORM ON OPEN (If editing) ---
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setLocation(initialData.location || "");
      setDescription(initialData.description || "");
      setStatus(initialData.status as any);
      setMinPoints(initialData.minPoints ?? initialData.points ?? 50);
      setMaxPoints(initialData.maxPoints ?? initialData.points ?? 50);
      
      // Handle Area Population
      const currentArea = initialData.area || "Others";
      setAreaSelection(currentArea);
      setCustomAreaName("");

      setHasSecondStage(initialData.hasSecondStage || false);
      setSecondDescription(initialData.secondDescription || "");
      setBonusType(initialData.bonusType || "none");
    } else if (open && !initialData) {
      // Reset if creating new
      setName("");
      setType("");
      setLocation("");
      setDescription("");
      setStatus("OPEN");
      setMinPoints(50);
      setMaxPoints(50);
      
      setAreaSelection(""); // Force user to choose
      setCustomAreaName("");
      
      setHasSecondStage(false);
      setBonusType("none");
      setSecondDescription("");
    }
    setError(null);
  }, [open, initialData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Determine Final Area
    let finalArea = areaSelection;
    if (areaSelection === "__NEW__") {
      if (!customAreaName.trim()) {
        setError("Please enter a name for the new area.");
        setSaving(false);
        return;
      }
      finalArea = customAreaName.trim();
    }
    if (!finalArea) {
      setError("Please select an Area.");
      setSaving(false);
      return;
    }

    try {
      const functions = getFunctions(undefined, "asia-southeast1");

      if (initialData?.id) {
        // UPDATE existing
        const updateFn = httpsCallable(functions, "updateStation");
        await updateFn({
          id: initialData.id,
          name,
          type,
          location,
          description,
          points: maxPoints,
          minPoints,
          maxPoints,
          area: finalArea,
          hasSecondStage,
          secondDescription,
          bonusType,
        });
      } else {
        // CREATE new
        const createFn = httpsCallable(functions, "createStation");
        await createFn({ 
          name, 
          type, 
          location, 
          description, 
          points: maxPoints,
          minPoints,
          maxPoints,
          area: finalArea,
          hasSecondStage,
          secondDescription,
          bonusType,
        });
      }

      // If editing an existing station and status changed, call updateStationStatus
      if (initialData?.id && status !== initialData?.status) {
        const fn = httpsCallable(functions, "updateStationStatus");
        await fn({ stationId: initialData.id, newStatus: status });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving station:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  // Prepare Area Options: Unique list + "Others" + "Create New"
  const areaOptions = Array.from(new Set([...existingAreas, "Others"])).sort();

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          {initialData ? "Edit Station" : "Add New Station"}
        </Typography>
        <TextField
          label="Station Name (e.g. Bishan)"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel id="type-label">Type</InputLabel>
          <Select
            labelId="type-label"
            value={type}
            label="Type"
            onChange={(e) =>
              setType(e.target.value as "manned" | "unmanned" | "ending_location" | "")
            }
          >
            <MenuItem value="manned">Manned (Has SM)</MenuItem>
            <MenuItem value="unmanned">Unmanned (Task only)</MenuItem>
            <MenuItem value="ending_location">Ending Location</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Min Points"
            type="number"
            fullWidth
            margin="normal"
            value={minPoints}
            onChange={(e) => setMinPoints(parseInt(e.target.value) || 0)}
            required
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Max Points"
            type="number"
            fullWidth
            margin="normal"
            value={maxPoints}
            onChange={(e) => setMaxPoints(parseInt(e.target.value) || 0)}
            required
            inputProps={{ min: 0 }}
          />
        </Box>

        <TextField
          label="Location (Optional)"
          variant="outlined"
          fullWidth
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Junction 8 Roof"
        />
        
        {/* AREA SELECTION */}
        <FormControl fullWidth required>
          <InputLabel id="area-label">Area</InputLabel>
          <Select
            labelId="area-label"
            value={areaSelection}
            label="Area"
            onChange={(e) => setAreaSelection(e.target.value)}
          >
            {areaOptions.map((area) => (
              <MenuItem key={area} value={area}>
                {area}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem value="__NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
              + Create New Area...
            </MenuItem>
          </Select>
        </FormControl>

        {areaSelection === "__NEW__" && (
          <TextField
            label="New Area Name"
            variant="outlined"
            fullWidth
            value={customAreaName}
            onChange={(e) => setCustomAreaName(e.target.value)}
            placeholder="e.g. North-East Line Area"
            autoFocus
          />
        )}

        <TextField
          label="Task Description"
          variant="outlined"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Only shown to OGLs if Unmanned. Markdown supported (e.g. **bold**, *italic*)"
        />
        {/* ADDED PREVIEW */}
        <MarkdownPreview text={description} />

        {/* 2nd Stage Configuration */}
        <FormControl fullWidth>
          <InputLabel id="second-stage-label">2nd Stage</InputLabel>
          <Select
            labelId="second-stage-label"
            value={hasSecondStage ? "yes" : "no"}
            label="2nd Stage"
            onChange={(e) => setHasSecondStage(e.target.value === "yes")}
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </Select>
        </FormControl>

        {hasSecondStage && (
          <>
            <TextField
              label="2nd Description"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={secondDescription}
              onChange={(e) => setSecondDescription(e.target.value)}
              placeholder="Description for the 2nd stage. Markdown supported (e.g. **bold**, *italic*)"
            />
            {/* ADDED PREVIEW */}
            <MarkdownPreview text={secondDescription} />
          </>
        )}

        {/* Bonus Configuration */}
        <FormControl fullWidth>
          <InputLabel id="bonus-type-label">Bonus</InputLabel>
          <Select
            labelId="bonus-type-label"
            value={bonusType}
            label="Bonus"
            onChange={(e) => setBonusType(e.target.value as any)}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="early-bird">Early-Bird Bonus</MenuItem>
            <MenuItem value="late-game">Late-Game Bonus</MenuItem>
          </Select>
        </FormControl>

        {/* Status selector shown when editing (or always if you prefer) */}
        <FormControl fullWidth>
          <InputLabel id="station-status-label">Status</InputLabel>
          <Select
            labelId="station-status-label"
            value={status}
            label="Status"
            onChange={(e) =>
              setStatus(
                e.target.value as
                  | "OPEN"
                  | "LUNCH_SOON"
                  | "CLOSED_LUNCH"
                  | "CLOSED_PERMANENTLY"
              )
            }
          >
            <MenuItem value="OPEN">OPEN</MenuItem>
            <MenuItem value="CLOSED_LUNCH">CLOSED (LUNCH)</MenuItem>
            <MenuItem value="CLOSED_PERMANENTLY">CLOSED (PERMANENTLY)</MenuItem>
          </Select>
        </FormControl>
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !name || !type}
          onClick={handleSave}
        >
          {loading || saving ? (
            <CircularProgress size={24} />
          ) : initialData ? (
            "Update Station"
          ) : (
            "Add Station"
          )}
        </Button>
      </Box>
    </Modal>
  );
};
