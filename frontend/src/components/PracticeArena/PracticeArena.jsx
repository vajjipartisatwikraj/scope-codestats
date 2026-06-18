import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  useTheme,
  alpha,
  Paper,
  Container,
  Dialog,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloseIcon from "@mui/icons-material/Close";
import StadiumRoundedIcon from "@mui/icons-material/StadiumRounded";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-toastify";
import PARandomTestForm from "./PARandomTestForm";

const PracticeArena = () => {
  const theme = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dailyLimit, setDailyLimit] = useState({
    testsStartedToday: 0,
    remainingTests: 0,
    dailyLimit: 3,
  });
  const [dailyLimitLoading, setDailyLimitLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    fetchTests();
    fetchDailyLimit();

    // Periodically refresh tests to update expired/completed status
    const refreshInterval = setInterval(() => {
      fetchTests();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Timer effect to update countdown to midnight IST
  useEffect(() => {
    const updateTimer = () => {
      // Get current time in IST
      const now = new Date();
      const istTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );

      // Calculate next midnight IST
      const nextMidnight = new Date(istTime);
      nextMidnight.setHours(24, 0, 0, 0);

      // Calculate difference
      const diff = nextMidnight - istTime;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeUntilReset("Resetting...");
        // Refresh daily limit when timer hits zero
        fetchDailyLimit();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchDailyLimit = async () => {
    setDailyLimitLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/practice-arena/daily-limit`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setDailyLimit(response.data);
    } catch (error) {
      console.error("Error fetching daily limit:", error);
    } finally {
      setDailyLimitLoading(false);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/practice-arena/tests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setTests(response.data || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = () => {
    if (dailyLimitLoading) {
      toast.info("Checking availability. Please wait...");
      return;
    }

    if (dailyLimit.remainingTests <= 0) {
      toast.warn(
        "Daily test limit reached. Please try again after the refill period."
      );
      return;
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleViewTest = (testId, testStatus, test) => {
    if (!testId) {
      toast.error("Invalid test ID");
      return;
    }

    // Check if test time has expired for started tests
    if (testStatus === "started" && test.startTime) {
      const startTime = new Date(test.startTime).getTime();
      const timeLimit = test.parameters.timeLimit * 60 * 1000; // Convert minutes to milliseconds
      const now = Date.now();
      const elapsedTime = now - startTime;

      if (elapsedTime >= timeLimit) {
        // Test has expired, refresh the list and show message
        toast.info("This test has expired. Refreshing...");
        fetchTests(); // Refresh to get updated status from backend
        return;
      }
    }

    if (testStatus === "created" && dailyLimit.remainingTests <= 0) {
      toast.warn(
        "Daily limit reached. You can start a new test after the refill period."
      );
      return;
    }

    // Navigate to results page if completed, otherwise go to test page
    if (testStatus === "completed") {
      navigate(`/practice-arena/tests/${testId}/results`);
    } else {
      navigate(`/practice-arena/tests/${testId}`);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "started":
        return "In Progress";
      default:
        return "Not Started";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon />;
      case "started":
        return <PlayArrowIcon />;
      default:
        return <ErrorOutlineIcon />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          m: 10,
          zIndex: -1,
        }}
      />

      <Box sx={{ minHeight: "100vh", bgcolor: "transparent" }}>
        {/* Hero Section - Similar to Leaderboard */}
        <Container
          maxWidth={false}
          sx={{
            py: 6,
            px: { xs: 2, sm: 10 },
            pb: 2,
          }}
        >
          <Box
            sx={{
              maxWidth: "100%",
              mx: "auto",
              mt: { xs: 0, sm: 2, md: 4 },
              mb: 0,
              bgcolor: "#0585E0",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#232323" : "transparent"
              }`,
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
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                Practice Arena
                <StadiumRoundedIcon
                  sx={{ fontSize: { xs: "1.75rem", sm: "1.7rem" } }}
                />
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
                Master coding challenges with curated problems tailored to your
                skill level. .Start practicing and watch your expertise grow!
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
                src="/practiceArena.png"
                alt="Practice Arena"
                sx={{
                  width: { xs: "150px", md: "90%" },
                  height: "auto",
                  maxWidth: "none",
                  objectFit: "contain",
                  objectPosition: "bottom",
                  filter:
                    theme.palette.mode === "dark"
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
        </Container>

        {/* Daily Limit and New Test Button */}
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 10 },
            mb: 4,
            mt: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 2, sm: 4 },
              maxWidth: "1400px",
              mx: "auto",
            }}
          >
            {/* Left Side - Stats (simple icon + text) */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1.5, sm: 4 },
                alignItems: { xs: "flex-start", sm: "center" },
              }}
            >
              {/* Tests Today */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeIcon sx={{ color: "#0088CC", fontSize: 18 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                    fontSize: "0.8rem",
                  }}
                >
                  Tests Today{" "}
                  <Box component="span" sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>
                    {dailyLimitLoading ? "--" : `${dailyLimit.testsStartedToday}/${dailyLimit.dailyLimit}`}
                  </Box>
                </Typography>
              </Box>

              {/* Remaining Tests */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    color: "#0088CC",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {dailyLimitLoading ? "--" : dailyLimit.remainingTests}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                    fontSize: "0.8rem",
                  }}
                >
                  Remaining{" "}
                  <Box component="span" sx={{ color: "#0088CC", fontWeight: 700 }}>
                    {dailyLimitLoading
                      ? "..."
                      : dailyLimit.remainingTests === 0
                      ? "No tests left"
                      : `${dailyLimit.remainingTests} available`}
                  </Box>
                </Typography>
              </Box>

              {/* Refills In */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeIcon sx={{ color: "#0088CC", fontSize: 18 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                    fontSize: "0.8rem",
                  }}
                >
                  Refills In{" "}
                  <Box component="span" sx={{ color: "#0088CC", fontWeight: 700 }}>
                    {timeUntilReset}
                  </Box>
                </Typography>
              </Box>
            </Box>

            {/* Right Side - New Test Button */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTest}
              disabled={dailyLimitLoading || dailyLimit.remainingTests === 0}
              sx={{
                bgcolor: "#0088CC",
                color: "white",
                px: 3,
                py: 1,
                fontSize: "0.85rem",
                fontWeight: 700,
                borderRadius: "8px",
                textTransform: "none",
                boxShadow: "0 2px 8px rgba(0,136,204,0.3)",
                minWidth: { xs: "100%", sm: "180px" },
                "&:hover": {
                  bgcolor: "#006699",
                  boxShadow: "0 4px 12px rgba(0,136,204,0.4)",
                },
                "&:disabled": {
                  bgcolor: theme.palette.action.disabledBackground,
                  color: theme.palette.action.disabled,
                  boxShadow: "none",
                },
                transition: "all 0.2s ease",
              }}
            >
              New Random Test
            </Button>
          </Box>
        </Container>

        {/* Practice History Table */}
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 10 },
            pb: 6,
          }}
        >
          <Box
            sx={{
              maxWidth: "1400px",
              mx: "auto",
            }}
          >
            {/* Table Header */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                Practice History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track your progress and continue where you left off
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress
                  size={40}
                  thickness={4}
                  sx={{ color: "#0088CC" }}
                />
              </Box>
            ) : tests.length === 0 ? (
              <Paper
                sx={{
                  p: 8,
                  textAlign: "center",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(0,136,204,0.02)",
                  border: `1px solid ${
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,136,204,0.1)"
                  }`,
                  borderRadius: "12px",
                }}
              >
                <HistoryIcon
                  sx={{
                    fontSize: 64,
                    color: theme.palette.text.disabled,
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No practice tests found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Create your first practice test to start improving your coding
                  skills
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTest}
                  sx={{
                    bgcolor: "#0088CC",
                    "&:hover": { bgcolor: "#006699" },
                  }}
                >
                  Create New Test
                </Button>
              </Paper>
            ) : (
              <>
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.02)"
                        : "#ffffff",
                    border: `1px solid ${
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,136,204,0.1)"
                    }`,
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "none",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          bgcolor:
                            theme.palette.mode === "dark"
                              ? "rgba(0,136,204,0.1)"
                              : "rgba(0,136,204,0.05)",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Test Title
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Subject
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Difficulty
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Questions
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Score
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          Date
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                          align="right"
                        >
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tests.map((test, index) => (
                        <TableRow
                          key={test._id}
                          sx={{
                            "&:hover": {
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255,255,255,0.03)"
                                  : "rgba(0,136,204,0.03)",
                            },
                            borderBottom: `1px solid ${
                              theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.05)"
                            }`,
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                              }}
                            >
                              {test.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={test.parameters?.subject || "Mixed"}
                              size="small"
                              sx={{
                                bgcolor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(0,136,204,0.15)"
                                    : "rgba(0,136,204,0.1)",
                                color: "#0088CC",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={test.parameters?.difficulty || "Mixed"}
                              size="small"
                              sx={{
                                bgcolor:
                                  test.parameters?.difficulty === "Easy"
                                    ? "rgba(76,175,80,0.1)"
                                    : test.parameters?.difficulty === "Medium"
                                    ? "rgba(255,152,0,0.1)"
                                    : test.parameters?.difficulty === "Hard"
                                    ? "rgba(244,67,54,0.1)"
                                    : "rgba(156,39,176,0.1)",
                                color:
                                  test.parameters?.difficulty === "Easy"
                                    ? "#4CAF50"
                                    : test.parameters?.difficulty === "Medium"
                                    ? "#FF9800"
                                    : test.parameters?.difficulty === "Hard"
                                    ? "#f44336"
                                    : "#9C27B0",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {test.questions?.length || 0}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(test.status)}
                              label={getStatusText(test.status)}
                              size="small"
                              sx={{
                                bgcolor:
                                  test.status === "completed"
                                    ? "rgba(76,175,80,0.1)"
                                    : test.status === "started"
                                    ? "rgba(255,152,0,0.1)"
                                    : "rgba(33,150,243,0.1)",
                                color:
                                  test.status === "completed"
                                    ? "#4CAF50"
                                    : test.status === "started"
                                    ? "#FF9800"
                                    : "#2196F3",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                "& .MuiChip-icon": {
                                  color:
                                    test.status === "completed"
                                      ? "#4CAF50"
                                      : test.status === "started"
                                      ? "#FF9800"
                                      : "#2196F3",
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {test.status === "completed" ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: "#0088CC",
                                }}
                              >
                                {test.totalScore || 0} /{" "}
                                {test.maxPossibleScore || 0}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: "0.85rem" }}
                            >
                              {formatDate(test.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="contained"
                              size="small"
                              endIcon={<ChevronRightIcon />}
                              onClick={() =>
                                handleViewTest(test._id, test.status, test)
                              }
                              sx={{
                                bgcolor: "#0088CC",
                                color: "white",
                                textTransform: "none",
                                fontSize: "0.85rem",
                                px: 2,
                                py: 0.75,
                                borderRadius: "8px",
                                "&:hover": {
                                  bgcolor: "#006699",
                                },
                              }}
                            >
                              {test.status === "created"
                                ? "Start"
                                : test.status === "started"
                                ? "Continue"
                                : "View Results"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Container>

        {/* Test Creation Dialog */}
        <Dialog
          open={isModalOpen}
          onClose={handleCloseModal}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          PaperProps={{
            sx: {
              bgcolor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
              maxHeight: "90vh",
              m: 2,
              overflowX: "hidden",
            },
          }}
        >
          <DialogContent sx={{ p: 0, overflow: "auto", overflowX: "hidden" }}>
            <Box sx={{ position: "relative" }}>
              <IconButton
                onClick={handleCloseModal}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  color: "white",
                  zIndex: 1301,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.1)",
                    transform: "scale(1.1)",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
              <PARandomTestForm onClose={handleCloseModal} />
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
};

export default PracticeArena;
