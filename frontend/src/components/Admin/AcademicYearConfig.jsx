import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { clearConfigCache } from "../../utils/academicYearConfig";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AcademicYearConfig = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [yearMappings, setYearMappings] = useState([]);
  const [academicYearStartMonth, setAcademicYearStartMonth] = useState(3);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/admin/academic-year-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const cfg = response.data.config;
        setConfig(cfg);
        setYearMappings(cfg.yearMappings || []);
        setAcademicYearStartMonth(cfg.academicYearStartMonth || 3);
      }
    } catch (error) {
      console.error("Error fetching academic year config:", error);
      toast.error("Failed to load academic year configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(
        `${apiUrl}/admin/academic-year-config`,
        {
          academicYearStartMonth,
          yearMappings,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Configuration saved successfully!");
        clearConfigCache();
        fetchConfig();
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMapping = () => {
    const currentYear = new Date().getFullYear();
    const newMapping = {
      graduationYear: currentYear + 1,
      academicYear: "First Year",
      displayName: "I Year",
    };
    setEditingMapping(newMapping);
    setEditDialogOpen(true);
  };

  const handleEditMapping = (mapping) => {
    setEditingMapping({ ...mapping });
    setEditDialogOpen(true);
  };

  const handleDeleteMapping = (graduationYear) => {
    setYearMappings(
      yearMappings.filter((m) => m.graduationYear !== graduationYear)
    );
  };

  const handleSaveMapping = () => {
    if (!editingMapping) return;

    const existingIndex = yearMappings.findIndex(
      (m) => m.graduationYear === editingMapping.graduationYear
    );

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...yearMappings];
      updated[existingIndex] = editingMapping;
      setYearMappings(updated);
    } else {
      // Add new
      setYearMappings([...yearMappings, editingMapping]);
    }

    setEditDialogOpen(false);
    setEditingMapping(null);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/admin/dashboard")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <SchoolIcon sx={{ fontSize: 32, mr: 2, color: "#0088cc" }} />
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Academic Year Configuration
        </Typography>
      </Box>

      {/* Info Card */}
      <Card
        sx={{
          mb: 3,
          bgcolor: darkMode
            ? "rgba(0, 136, 204, 0.1)"
            : "rgba(0, 136, 204, 0.05)",
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <InfoIcon sx={{ color: "#0088cc", mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                About Academic Year Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure how graduation years map to academic year
                classifications (First Year, Second Year, etc.). This
                configuration is used throughout the platform for leaderboards,
                filters, and user displays.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Current Academic Year:{" "}
                <strong>{config?.currentAcademicYear || "N/A"}</strong>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Academic Year Start Month */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Academic Year Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Academic Year Start Month</InputLabel>
          <Select
            value={academicYearStartMonth}
            label="Academic Year Start Month"
            onChange={(e) => setAcademicYearStartMonth(e.target.value)}
          >
            {monthNames.map((month, index) => (
              <MenuItem key={index} value={index}>
                {month} {index === 3 && "(Recommended)"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Alert severity="info" sx={{ mb: 2 }}>
          The academic year starts in{" "}
          <strong>{monthNames[academicYearStartMonth]}</strong>. Students
          advance to the next year after this month begins.
        </Alert>
      </Paper>

      {/* Year Mappings Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Graduation Year Mappings</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddMapping}
          >
            Add Mapping
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Graduation Year</strong>
                </TableCell>
                <TableCell>
                  <strong>Academic Year</strong>
                </TableCell>
                <TableCell>
                  <strong>Display Name</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {yearMappings
                .sort((a, b) => b.graduationYear - a.graduationYear)
                .map((mapping) => (
                  <TableRow key={mapping.graduationYear} hover>
                    <TableCell>
                      <Chip
                        label={mapping.graduationYear}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{mapping.academicYear}</TableCell>
                    <TableCell>
                      <Chip label={mapping.displayName} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditMapping(mapping)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          handleDeleteMapping(mapping.graduationYear)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {yearMappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No year mappings configured. Click "Auto-Generate" to
                      create default mappings.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Save Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchConfig}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </Box>

      {/* Edit/Add Mapping Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMapping?.graduationYear ? "Edit" : "Add"} Year Mapping
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Graduation Year"
              type="number"
              value={editingMapping?.graduationYear || ""}
              onChange={(e) =>
                setEditingMapping({
                  ...editingMapping,
                  graduationYear: parseInt(e.target.value),
                })
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={editingMapping?.academicYear || ""}
                label="Academic Year"
                onChange={(e) =>
                  setEditingMapping({
                    ...editingMapping,
                    academicYear: e.target.value,
                  })
                }
              >
                <MenuItem value="First Year">First Year</MenuItem>
                <MenuItem value="Second Year">Second Year</MenuItem>
                <MenuItem value="Third Year">Third Year</MenuItem>
                <MenuItem value="Fourth Year">Fourth Year</MenuItem>
                <MenuItem value="Graduated">Graduated</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Display Name"
              value={editingMapping?.displayName || ""}
              onChange={(e) =>
                setEditingMapping({
                  ...editingMapping,
                  displayName: e.target.value,
                })
              }
              helperText="Example: I Year, II Year, III Year, IV Year, Graduated"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMapping}
            variant="contained"
            disabled={
              !editingMapping?.graduationYear ||
              !editingMapping?.academicYear ||
              !editingMapping?.displayName
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AcademicYearConfig;
