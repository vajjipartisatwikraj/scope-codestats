import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Tabs,
  Tab,
  Divider,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import axios from "axios";
import CohortListLeft from "./CohortListLeft";
import CohortListRight from "./CohortListRight";
import { he } from "date-fns/locale";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const CohortList = () => {
  const muiTheme = useTheme();
  const { darkMode } = useAppTheme();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // User's progress status (pending/completed)
  const [levelFilter, setLevelFilter] = useState("all"); // Cohort's level (Beginner/Intermediate/Advanced)
  const [cohorts, setCohorts] = useState([]);
  const [filteredCohorts, setFilteredCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cohorts from the API
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/cohorts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCohorts(response.data);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching cohorts:", err);
        setError("Failed to load cohorts. Please try again later.");
        setLoading(false);
      }
    };

    if (token) {
      fetchCohorts();
    }
  }, [token]);

  // Apply filters whenever cohorts, searchQuery, statusFilter, or levelFilter changes
  useEffect(() => {
    let filtered = [...cohorts];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (cohort) =>
          cohort.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (cohort.description &&
            cohort.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // Apply user status filter (pending/completed based on progress)
    if (statusFilter !== "all") {
      filtered = filtered.filter((cohort) => {
        if (!cohort.userProgress) return false;

        // Pending: User is enrolled but hasn't completed
        if (statusFilter === "pending") {
          return (
            cohort.userProgress.status === "enrolled" &&
            (!cohort.userProgress.completedAt ||
              cohort.moduleProgress?.some((mp) => !mp.completed))
          );
        }
        // Completed: User has completed all modules
        else if (statusFilter === "completed") {
          return (
            cohort.userProgress.status === "completed" ||
            (cohort.userProgress.completedAt &&
              cohort.moduleProgress?.every((mp) => mp.completed))
          );
        }
        return true;
      });
    }

    // Apply level filter (Beginner/Intermediate/Advanced)
    if (levelFilter !== "all") {
      filtered = filtered.filter((cohort) => {
        return (
          cohort.level &&
          cohort.level.toLowerCase() === levelFilter.toLowerCase()
        );
      });
    }

    setFilteredCohorts(filtered);

    // Check if currently selected cohort is still in filtered results
    const isSelectedCohortInFiltered =
      selectedCohort && filtered.some((c) => c._id === selectedCohort._id);

    if (filtered.length > 0) {
      // If selected cohort is no longer in filtered list, select the first one
      if (!isSelectedCohortInFiltered) {
        setSelectedCohort(filtered[0]);
      }
    } else {
      // No cohorts match the filter, clear selection
      setSelectedCohort(null);
    }
  }, [cohorts, searchQuery, statusFilter, levelFilter]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle search button click
  const handleSearch = () => {
    // Filtering is handled automatically by useEffect
  };

  // Handle cohort selection
  const handleCohortClick = (cohort) => {
    setSelectedCohort(cohort);
  };

  // Handle user status filter change
  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  // Handle cohort level filter change
  const handleLevelFilterChange = (event) => {
    setLevelFilter(event.target.value);
  };

  return (
    <>
      {/* Hero Section - Full Width Container */}
      <Box
        sx={{
          width: "100%",
          px: { xs: 2, sm: 10 },
          py: 6,
        }}
      >
        <Box
          sx={{
            maxWidth: "100%",
            mx: "auto",
            mt: { xs: 0, sm: 2, md: 4 },
            mb: 6,
            bgcolor: "#0585E0",
            border: `1px solid ${darkMode ? "#232323" : "transparent"}`,
            borderRadius: "20px",
            position: "relative",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            minHeight: { xs: "200px", md: "100px" },
            overflow: "visible",
            pb: { xs: 4, md: 0 },
          }}
        >
          {/* Content Section */}
          <Box
            sx={{
              width: { xs: "100%", md: "85%" },
              p: { xs: 3, md: 3 },
              position: "relative",
              zIndex: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: "1.75rem", sm: "1.7rem" },
              }}
            >
              Programming Cohorts
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#ffffff",
                fontWeight: 200,
                fontSize: { xs: "0.9rem", sm: "0.9rem" },
                lineHeight: 1.6,
                maxWidth: "600px",
              }}
            >
              Enhance your programming skills with guided learning paths and
              practical problem-solving. Join cohorts, track your progress, and
              grow with peers.
            </Typography>
          </Box>

          {/* Image Section */}
          <Box
            sx={{
              width: { xs: "100%", md: "18%" },
              position: { xs: "relative", md: "absolute" },
              right: { xs: "auto", md: "5%" },
              bottom: { xs: "-20px", md: 0 },
              zIndex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              overflow: "visible",
              height: { xs: "120px", md: "80%" },
              mt: { xs: 2, md: 0 },
            }}
          >
            <Box
              component="img"
              src="/courses.png"
              alt="Programming Cohorts"
              sx={{
                width: { xs: "150px", md: "90%" },
                height: "auto",
                maxWidth: "none",
                objectFit: "contain",
                objectPosition: "bottom",
                filter: darkMode
                  ? "drop-shadow(-10px 10px 20px rgba(50, 50, 50, 0.6))"
                  : "none",
                animation:
                  "gentleFloat 6s ease-in-out infinite, simpleFadeIn 0.8s ease-out",
                transformOrigin: "center bottom",
                "@keyframes gentleFloat": {
                  "0%, 100%": {
                    transform: "translateY(0)",
                  },
                  "50%": {
                    transform: "translateY(-10px)",
                  },
                },
                "@keyframes simpleFadeIn": {
                  "0%": {
                    opacity: 0,
                    transform: "translateY(20px)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateY(0)",
                  },
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Content Container */}
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          px: { xs: 2, sm: 3, md: 4, lg: 6 },
          pb: 3,
          overflow: "visible",
        }}
      >
        {/* Search and Filter Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          {/* Left - Search Box */}
          <Box sx={{ display: "flex", alignItems: "center", width: "500px" }}>
            <TextField
              placeholder="Search Cohorts..."
              size="medium"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: darkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(15,15,15,0.5)",
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  color: darkMode ? "white" : "#0F0F0F",
                  bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "white",
                  borderRadius: "8px 0 0 8px",
                  height: "48px",
                  "& fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0, 0, 0, 0.12)",
                    borderWidth: "1px",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0, 0, 0, 0.2)",
                    borderWidth: "1px",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0088CC",
                    borderWidth: "1px",
                  },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                bgcolor: "#0088CC",
                color: "white",
                borderRadius: "0 8px 8px 0",
                height: "48px",
                "&:hover": {
                  bgcolor: "#0077b6",
                },
              }}
            >
              Search
            </Button>
          </Box>

          {/* Right - Filter Dropdowns */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl
              variant="outlined"
              size="medium"
              sx={{
                width: "160px",
                "& .MuiOutlinedInput-root": {
                  color: darkMode ? "white" : "#0F0F0F",
                  bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "white",
                  height: "48px",
                  "& fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0, 0, 0, 0.12)",
                    borderWidth: "1px",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0, 0, 0, 0.2)",
                    borderWidth: "1px",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0088CC",
                    borderWidth: "1px",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(15,15,15,0.7)",
                  transform: "translate(14px, 14px) scale(1)",
                },
                "& .MuiInputLabel-shrink": {
                  transform: "translate(14px, -6px) scale(0.75)",
                },
              }}
            >
              <InputLabel>My Progress</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusChange}
                label="My Progress"
              >
                <MenuItem value="all">All Cohorts</MenuItem>
                <MenuItem value="pending">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              variant="outlined"
              size="medium"
              sx={{
                width: "160px",
                "& .MuiOutlinedInput-root": {
                  color: darkMode ? "white" : "#0F0F0F",
                  bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "white",
                  height: "48px",
                  "& fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0, 0, 0, 0.12)",
                    borderWidth: "1px",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0, 0, 0, 0.2)",
                    borderWidth: "1px",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0088CC",
                    borderWidth: "1px",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(15,15,15,0.7)",
                  transform: "translate(14px, 14px) scale(1)",
                },
                "& .MuiInputLabel-shrink": {
                  transform: "translate(14px, -6px) scale(0.75)",
                },
              }}
            >
              <InputLabel>Level</InputLabel>
              <Select
                value={levelFilter}
                onChange={handleLevelFilterChange}
                label="Level"
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.8fr 1.6fr" },
            gap: { xs: 4, md: 3 },
            alignItems: "start", // Align items to start
            position: "relative",
          }}
        >
          {/* Show loading, error, or content */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gridColumn: "span 2",
              }}
            >
              <CircularProgress sx={{ color: "#0088CC" }} />
            </Box>
          ) : error ? (
            <Box sx={{ gridColumn: "span 2" }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <>
              {/* Left Panel - Scrollable list of cohorts */}
              <Box
                sx={{
                  height: "80vh", // Fixed 80vh height
                  position: "relative",
                  overflow: "hidden",
                  pr: 1,
                }}
              >
                <CohortListLeft
                  cohorts={filteredCohorts}
                  handleCohortClick={handleCohortClick}
                  selectedCohortId={selectedCohort?._id}
                />
              </Box>

              {/* Right Panel - Sticky and fixed */}
              <Box
                sx={{
                  height: "80vh", // Fixed 80vh height
                  position: "sticky",
                  top: "20px", // Sticky offset from top
                  overflow: "hidden",
                  display: { xs: "block", md: "block" },
                }}
              >
                <CohortListRight
                  selectedCohort={selectedCohort}
                  hasActiveFilters={
                    statusFilter !== "all" ||
                    levelFilter !== "all" ||
                    searchQuery.trim() !== ""
                  }
                  filteredCount={filteredCohorts.length}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default CohortList;
