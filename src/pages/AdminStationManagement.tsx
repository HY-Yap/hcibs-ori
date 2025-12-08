import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  TableSortLabel,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  orderBy as firestoreOrderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebase";
import { StationModal, type StationData } from "../components/StationModal";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";

type StationType = "manned" | "unmanned" | "ending_location" | "ALL";
type StationStatus =
  | "OPEN"
  | "LUNCH_SOON"
  | "CLOSED_LUNCH"
  | "CLOSED_PERMANENTLY"
  | "ALL";
type SortableColumn = "name" | "type" | "location" | "status" | "points" | "area"; // ADDED area
type Order = "asc" | "desc";

// Define Area Config for sorting
const AREA_ORDER = [
  "Central-West Area",
  "Circle Line Area",
  "CBD Area",
  "Others",
];

const AREA_CONFIG: Record<string, string[]> = {
  "Central-West Area": [
    "Holland Village",
    "Bishan",
    "Beauty World",
    "King Albert Park",
    "Botanic Gardens",
    "Toa Payoh",
  ],
  "Circle Line Area": [
    "Paya Lebar",
    "Stadium",
    "Promenade",
    "Serangoon",
    "Esplanade",
  ],
  "CBD Area": [
    "Bugis",
    "Clarke Quay",
    "Fort Canning",
    "City Hall",
    "Raffles Place",
    "National Library",
  ],
  Others: ["Marina Barrage"],
};

// ADDED: Area Colors for visual distinction
const AREA_COLORS: Record<string, string> = {
  "Central-West Area": "#e3f2fd", // Light Blue
  "Circle Line Area": "#f3e5f5", // Light Purple
  "CBD Area": "#e8f5e9", // Light Green
  Others: "#fff9c4", // Light Yellow
};

const getArea = (stationName: string) => {
  for (const [area, stations] of Object.entries(AREA_CONFIG)) {
    if (stations.includes(stationName)) return area;
  }
  return "Others";
};

export const AdminStationManagement: React.FC = () => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [stationToEdit, setStationToEdit] = useState<StationData | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<StationType>("ALL");
  const [filterStatus, setFilterStatus] = useState<StationStatus>("ALL");
  const [orderBy, setOrderBy] = useState<SortableColumn>("area"); // Default sort by area
  const [order, setOrder] = useState<Order>("asc");

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "stations"), firestoreOrderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const stationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StationData[];
        setStations(stationList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching stations:", err);
        setError("Failed to load stations live.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredAndSortedStations = useMemo(() => {
    return stations
      .filter((s) => {
        if (filterType !== "ALL" && s.type !== filterType) return false;
        if (filterStatus !== "ALL" && (s.status || "OPEN") !== filterStatus)
          return false;
        if (
          searchTerm &&
          !s.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !s.location?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // ADDED: Handle area sorting (Default)
        if (orderBy === "area") {
          const areaA = getArea(a.name);
          const areaB = getArea(b.name);
          const indexA = AREA_ORDER.indexOf(areaA);
          const indexB = AREA_ORDER.indexOf(areaB);
          
          // Handle unknown areas
          const safeIndexA = indexA === -1 ? 999 : indexA;
          const safeIndexB = indexB === -1 ? 999 : indexB;

          if (safeIndexA !== safeIndexB) {
            return order === "asc" ? safeIndexA - safeIndexB : safeIndexB - safeIndexA;
          }

          // Secondary sort: Type (Manned first)
          if (a.type === "manned" && b.type !== "manned") return -1;
          if (a.type !== "manned" && b.type === "manned") return 1;

          // Tertiary sort by name if areas match
          return a.name.localeCompare(b.name);
        }

        // ADDED: Handle points sorting
        if (orderBy === "points") {
          const pointsA = a.points || 0;
          const pointsB = b.points || 0;
          return order === "asc" ? pointsA - pointsB : pointsB - pointsA;
        }

        const valueA = (a[orderBy] || "").toString().toLowerCase();
        const valueB = (b[orderBy] || "").toString().toLowerCase();
        if (valueB < valueA) return order === "asc" ? 1 : -1;
        if (valueB > valueA) return order === "asc" ? -1 : 1;
        return 0;
      });
  }, [stations, searchTerm, filterType, filterStatus, orderBy, order]);

  const handleRequestSort = (property: SortableColumn) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    station: StationData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedStation(station);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleAddClick = () => {
    setStationToEdit(null);
    setModalOpen(true);
  };
  const handleEditAction = () => {
    if (selectedStation) setStationToEdit(selectedStation);
    setModalOpen(true);
    handleMenuClose();
  };
  const handleDeleteAction = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStation?.id) return;
    setDeleteLoading(true);
    try {
      const deleteStationFn = httpsCallable(firebaseFunctions, "deleteStation");
      await deleteStationFn({ id: selectedStation.id });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Failed to delete station.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4">Station Management</Typography>
        <Button variant="contained" onClick={handleAddClick}>
          + Add Station
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "40%" },
              flexGrow: 1,
            }}
          >
            <TextField
              label="Search by name or location"
              variant="outlined"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "25%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value as StationType)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="manned">Manned</MenuItem>
                <MenuItem value="unmanned">Unmanned</MenuItem>
                <MenuItem value="ending_location">Ending Location</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexBasis: { xs: "100%", sm: "48%", md: "30%" },
              flexGrow: 1,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) =>
                  setFilterStatus(e.target.value as StationStatus)
                }
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="LUNCH_SOON">Lunch Soon</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="CLOSED_LUNCH">On Lunch</MenuItem>
                <MenuItem value="CLOSED_PERMANENTLY">Closed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "area"}
                  direction={orderBy === "area" ? order : "asc"}
                  onClick={() => handleRequestSort("area")}
                >
                  Area
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleRequestSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleRequestSort("type")}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "points"}
                  direction={orderBy === "points" ? order : "asc"}
                  onClick={() => handleRequestSort("points")}
                >
                  Points
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "location"}
                  direction={orderBy === "location" ? order : "asc"}
                  onClick={() => handleRequestSort("location")}
                >
                  Location
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "status"}
                  direction={orderBy === "status" ? order : "asc"}
                  onClick={() => handleRequestSort("status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedStations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {stations.length === 0
                    ? "No stations found."
                    : "No stations match filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedStations.map((s, index) => {
                const areaName = getArea(s.name);
                const areaColor = AREA_COLORS[areaName] || "#f5f5f5";
                
                // Determine if we need a separator (new area group)
                const prevArea = index > 0 ? getArea(filteredAndSortedStations[index - 1].name) : null;
                const isNewArea = index > 0 && areaName !== prevArea && orderBy === "area";

                return (
                <TableRow 
                  key={s.id}
                  sx={{ 
                    borderTop: isNewArea ? "3px solid #e0e0e0" : undefined 
                  }}
                >
                  <TableCell>
                    <Chip 
                      label={areaName} 
                      size="small" 
                      sx={{ 
                        fontSize: '0.7rem',
                        bgcolor: areaColor,
                        fontWeight: 'bold',
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>{s.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        (s.type as string) === "ending_location"
                          ? "Ending Location"
                          : s.type.charAt(0).toUpperCase() + s.type.slice(1)
                      }
                      color={
                        s.type === "manned"
                          ? "primary"
                          : (s.type as string) === "ending_location"
                          ? "secondary"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{s.points || 0}</TableCell>
                  <TableCell>{s.location || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={(s.status || "OPEN").replace("_", " ")}
                      color={
                        s.status === "OPEN"
                          ? "success"
                          : s.status === "LUNCH_SOON"
                          ? "warning"
                          : s.status === "CLOSED_LUNCH"
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => handleMenuOpen(e, s)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditAction}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteAction}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

      <StationModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}}
        initialData={stationToEdit}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {selectedStation?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
