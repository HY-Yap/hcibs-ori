import React, { useState, useEffect } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from "@mui/material";
// --- IMPORT query AND where ---
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";

interface Station {
  id: string;
  name: string;
}

interface Props {
  onStationSelected: () => void;
}

export const StationSelector: React.FC<Props> = ({ onStationSelected }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        // --- UPDATED QUERY: Only get 'manned' stations ---
        const q = query(
          collection(db, "stations"),
          where("type", "==", "manned")
        );
        const snapshot = await getDocs(q);

        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setStations(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error fetching stations:", err);
        setError("Failed to load station list.");
      } finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, []);

  const handleConfirm = async () => {
    if (!selectedStationId) return;
    setSubmitting(true);
    setError(null);
    try {
      const functions = getFunctions(undefined, "asia-southeast1");
      const setStationFn = httpsCallable(functions, "setStation");
      await setStationFn({ stationId: selectedStationId });
      onStationSelected();
    } catch (err: any) {
      console.error("Error setting station:", err);
      setError(err.message || "Failed to set station.");
      setSubmitting(false);
    }
  };

  if (loading)
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  return (
    <Paper sx={{ p: 4, maxWidth: 500, mx: "auto", mt: 8, textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>
        Welcome, Station Master!
      </Typography>
      <Typography paragraph color="text.secondary" sx={{ mb: 4 }}>
        Please select which station you are managing today.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="station-select-label">Select Your Station</InputLabel>
        <Select
          labelId="station-select-label"
          value={selectedStationId}
          label="Select Your Station"
          onChange={(e) => setSelectedStationId(e.target.value)}
        >
          {stations.length === 0 ? (
            <MenuItem disabled value="">
              No manned stations found
            </MenuItem>
          ) : (
            stations.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!selectedStationId || submitting}
        onClick={handleConfirm}
      >
        {submitting ? <CircularProgress size={26} /> : "Confirm Station"}
      </Button>
    </Paper>
  );
};
