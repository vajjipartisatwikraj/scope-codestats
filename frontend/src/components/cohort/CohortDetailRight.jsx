import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Card,
  CardContent,
  alpha,
  TextField,
  InputAdornment,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BugReportIcon from "@mui/icons-material/BugReport";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useNavigate } from "react-router-dom";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import CohortFeedback from "./CohortFeedback";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";

// Utility function to process HTML and format code blocks properly
const processHTMLContent = (html) => {
  if (!html) return html;

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Find all pre > code elements and format them
  const codeBlocks = tempDiv.querySelectorAll("pre code");
  codeBlocks.forEach((codeBlock) => {
    let codeText = codeBlock.textContent || codeBlock.innerText;

    // Replace common patterns to add line breaks
    codeText = codeText
      .replace(/\/\/ /g, "\n// ") // Add newline before comments
      .replace(/\$/g, "\n$") // Add newline before $ (shell commands)
      .replace(/public class/g, "\npublic class")
      .replace(/public static/g, "\npublic static")
      .replace(/private /g, "\nprivate ")
      .replace(/\{/g, " {\n") // Add newline after opening brace
      .replace(/\}/g, "\n}\n") // Add newlines around closing brace
      .replace(/;/g, ";\n") // Add newline after semicolons
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Remove excessive newlines
      .trim();

    codeBlock.textContent = codeText;
  });

  return tempDiv.innerHTML;
};

const CohortDetailRight = ({
  module,
  userProgress,
  handleSolveQuestion,
  isAdmin = false,
  handleEditQuestion,
  handleOpenQuestionDialog,
  handleDeleteQuestion,
  showFeedback = false,
  cohortId,
  questionsVersion = 0,
}) => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Check if user is a teacher
  const isTeacher = user && user.userType === "teacher";

  // Initialize all state variables here, before any conditional returns
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Fetch questions when module changes or after question CRUD
  useEffect(() => {
    if (module && module._id && cohortId && !showFeedback && !showNotes) {
      fetchModuleQuestions();
    }
  }, [module?._id, cohortId, showFeedback, showNotes, questionsVersion]);

  const fetchModuleQuestions = async () => {
    if (!module || !cohortId) return;

    setLoadingQuestions(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${module._id}/questions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setQuestions(response.data || []);
    } catch (error) {
      console.error("Error fetching module questions:", error);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Handle filter changes
  const handleStatusFilterChange = (event, newValue) => {
    if (newValue !== null) {
      setStatusFilter(newValue);
    }
  };

  const handleDifficultyFilterChange = (event) => {
    const {
      target: { value },
    } = event;
    setDifficultyFilter(typeof value === "string" ? value.split(",") : value);
  };

  // Navigate to reports page (admin only)
  const handleViewReports = () => {
    if (module && module.cohort) {
      navigate(`/cohorts/${module.cohort}/reports`);
    }
  };

  // Function to check if a question is solved - defined before any conditional returns
  const isQuestionSolved = (questionId) => {
    if (!userProgress || !userProgress.questionProgress) return false;

    const questionProgress = userProgress.questionProgress.find(
      (qp) => qp.question.toString() === questionId.toString()
    );

    return questionProgress && questionProgress.solved;
  };

  if (showFeedback && !isAdmin) {
    return (
      <Box
        sx={{
          p: { xs: 2, md: 2 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: darkMode ? "#000000" : "#FFFFFF",
          color: darkMode ? "#FFFFFF" : "#0F0F0F",
          borderRadius: { xs: 0, md: "10px" },
          boxShadow: darkMode
            ? "0 4px 15px rgba(0,0,0,0.15)"
            : "0 4px 12px rgba(15, 15, 15, 0.06)",
          border: darkMode ? "none" : "1px solid rgba(15, 15, 15, 0.08)",
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CohortFeedback cohortId={cohortId} />
      </Box>
    );
  }

  if (!module) return null;

  // Get progress data for the current module
  const moduleProgress = userProgress?.moduleProgress?.find(
    (mp) => mp.module === module._id
  );
  const questionProgressList = userProgress?.questionProgress || [];

  // Use fetched questions instead of module.questions
  const totalQuestions = questions?.length || 0;
  // Calculate completed questions based on actual solved status
  const completedQuestions =
    questions?.filter((q) => {
      const qProgress = questionProgressList.find(
        (qp) => qp.question === q._id
      );
      return qProgress?.solved;
    }).length || 0;
  const progressPercent =
    totalQuestions > 0
      ? Math.round((completedQuestions / totalQuestions) * 100)
      : 0;

  // Group questions by difficulty
  const easyQuestions =
    questions?.filter((q) => q.difficultyLevel === "easy") || [];
  const mediumQuestions =
    questions?.filter((q) => q.difficultyLevel === "medium") || [];
  const hardQuestions =
    questions?.filter((q) => q.difficultyLevel === "hard") || [];

  // Calculate difficulty-wise completion
  const getCompletedCount = (questions) => {
    return questions.filter((q) => {
      const qProgress = questionProgressList.find(
        (qp) => qp.question === q._id
      );
      return qProgress?.solved;
    }).length;
  };

  const easyCompleted = getCompletedCount(easyQuestions);
  const mediumCompleted = getCompletedCount(mediumQuestions);
  const hardCompleted = getCompletedCount(hardQuestions);

  // If Notes panel is shown, render it instead of the main content
  if (showNotes && module.documentationUrl) {
    return (
      <Box
        sx={{
          p: { xs: 2, md: 2 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: darkMode ? "#000000" : "#FFFFFF",
          color: darkMode ? "#FFFFFF" : "#0F0F0F",
          borderRadius: { xs: 0, md: "10px" },
          boxShadow: darkMode
            ? "0 4px 15px rgba(0,0,0,0.15)"
            : "0 4px 12px rgba(15, 15, 15, 0.06)",
          border: darkMode ? "none" : "1px solid rgba(15, 15, 15, 0.08)",
          flex: 1,
          position: "relative",
          overflow: "hidden",
          maxHeight: "100%",
        }}
      >
        {/* Header with Back Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 2,
            pb: 2,
            borderBottom: "1px solid",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            flexShrink: 0,
          }}
        >
          <IconButton
            onClick={() => setShowNotes(false)}
            sx={{
              color: darkMode ? "#ffffff" : "#0F0F0F",
              "&:hover": {
                bgcolor: alpha(darkMode ? "#ffffff" : "#0F0F0F", 0.1),
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: darkMode ? "#ffffff" : "#0F0F0F",
                fontSize: "1.25rem",
              }}
            >
              Module Notes
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                fontSize: "0.875rem",
              }}
            >
              {module.title}
            </Typography>
          </Box>
        </Box>

        {/* HTML Content Display */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            borderRadius: "8px",
            border: "1px solid",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            bgcolor: darkMode ? "#0a0c10" : "#f5f5f5",
            p: 3,
            minHeight: 0,
            maxWidth: "100%",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: darkMode
                ? "rgba(0, 0, 0, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
            },
          }}
        >
          <Box
            className="notes-content"
            dangerouslySetInnerHTML={{
              __html: processHTMLContent(module.documentationUrl),
            }}
            sx={{
              color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
              lineHeight: 1.6,
              fontSize: "0.875rem",
              maxWidth: "100%",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              "& h1": {
                fontSize: "1.75rem",
                fontWeight: 700,
                marginTop: "1rem",
                marginBottom: "0.75rem",
                color: darkMode ? "#ffffff" : "#0F0F0F",
                borderBottom: `2px solid ${
                  darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
                }`,
                paddingBottom: "0.5rem",
                wordWrap: "break-word",
              },
              "& h2": {
                fontSize: "1.35rem",
                fontWeight: 700,
                marginTop: "1.25rem",
                marginBottom: "0.6rem",
                color: darkMode ? "#ffffff" : "#0F0F0F",
                wordWrap: "break-word",
              },
              "& h3": {
                fontSize: "1.15rem",
                fontWeight: 600,
                marginTop: "1rem",
                marginBottom: "0.5rem",
                color: darkMode ? "#ffffff" : "#0F0F0F",
                wordWrap: "break-word",
              },
              "& h4, & h5, & h6": {
                fontWeight: 600,
                marginTop: "0.875rem",
                marginBottom: "0.5rem",
                color: darkMode ? "#ffffff" : "#0F0F0F",
                fontSize: "1rem",
                wordWrap: "break-word",
              },
              "& p": {
                marginBottom: "0.875rem",
                lineHeight: 1.7,
                maxWidth: "100%",
                wordWrap: "break-word",
              },
              "& code": {
                backgroundColor: darkMode
                  ? "rgba(0, 136, 204, 0.1)"
                  : "rgba(10, 102, 194, 0.08)",
                color: darkMode ? "#0088cc" : "#0a66c2",
                padding: "4px 10px",
                borderRadius: "6px",
                fontFamily:
                  '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
                fontSize: "0.9em",
                fontWeight: "500",
                border: darkMode
                  ? "1px solid rgba(0, 136, 204, 0.3)"
                  : "1px solid rgba(10, 102, 194, 0.2)",
                boxShadow: darkMode
                  ? "0 1px 3px rgba(0, 136, 204, 0.1)"
                  : "0 1px 2px rgba(10, 102, 194, 0.1)",
                display: "inline-block",
                lineHeight: "1.5",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: darkMode
                    ? "rgba(0, 136, 204, 0.15)"
                    : "rgba(10, 102, 194, 0.12)",
                  transform: "translateY(-1px)",
                  boxShadow: darkMode
                    ? "0 2px 6px rgba(0, 136, 204, 0.2)"
                    : "0 2px 4px rgba(10, 102, 194, 0.15)",
                },
              },
              "& pre": {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "#f5f5f5",
                padding: "16px",
                borderRadius: "8px",
                overflow: "auto",
                overflowX: "auto",
                border: `1px solid ${
                  darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"
                }`,
                margin: "16px 0",
                fontFamily:
                  '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
                fontSize: "0.85rem",
                maxWidth: "100%",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                wordBreak: "break-word",
                color: darkMode ? "#d4d4d4" : "#000",
                "& code": {
                  backgroundColor: "transparent !important",
                  border: "none !important",
                  padding: "0 !important",
                  fontSize: "0.85rem",
                  color: "inherit",
                  display: "block",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  wordBreak: "break-word",
                  overflowX: "auto",
                  lineHeight: 1.6,
                  fontWeight: "normal",
                  boxShadow: "none !important",
                  transition: "none !important",
                  "&:hover": {
                    backgroundColor: "transparent !important",
                    transform: "none !important",
                    boxShadow: "none !important",
                  },
                },
              },
              "& table": {
                borderCollapse: "collapse",
                width: "100%",
                margin: "12px 0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "block",
                overflowX: "auto",
                maxWidth: "100%",
              },
              "& th, & td": {
                border: `1px solid ${
                  darkMode ? "rgba(255,255,255,0.3)" : "#ddd"
                }`,
                padding: "8px 12px",
                textAlign: "left",
                fontSize: "0.875rem",
                wordWrap: "break-word",
              },
              "& th": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                fontWeight: "bold",
              },
              "& tr:nth-of-type(even)": {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "#f9f9f9",
              },
              "& img": {
                maxWidth: "100%",
                height: "auto",
                borderRadius: "8px",
                margin: "12px 0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "block",
              },
              "& ul, & ol": {
                margin: "12px 0",
                paddingLeft: "24px",
                maxWidth: "100%",
              },
              "& li": {
                margin: "6px 0",
                lineHeight: 1.6,
                wordWrap: "break-word",
              },
              "& blockquote": {
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                paddingLeft: "12px",
                margin: "12px 0",
                fontStyle: "italic",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "#f8f9fa",
                padding: "12px",
                borderRadius: "0 6px 6px 0",
                maxWidth: "100%",
                wordWrap: "break-word",
              },
              "& a": {
                color: theme.palette.primary.main,
                textDecoration: "none",
                wordBreak: "break-word",
                "&:hover": {
                  textDecoration: "underline",
                },
              },
              "& strong, & b": {
                fontWeight: 700,
                color: darkMode ? "#ffffff" : "#0F0F0F",
              },
              "& em, & i": {
                fontStyle: "italic",
              },
              "& hr": {
                border: "none",
                borderTop: `1px solid ${
                  darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
                margin: "20px 0",
              },
            }}
          />
        </Box>
      </Box>
    );
  }

  // Filter questions based on search query and filters
  const filteredQuestions =
    questions?.filter((question) => {
      // Search filter - search in title, tags, and questionBank only
      const matchesSearch =
        searchQuery === "" ||
        question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (question.tags &&
          question.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )) ||
        (question.questionBank &&
          question.questionBank
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      // Status filter
      const questionProgress = questionProgressList.find(
        (qp) => qp.question === question._id
      );
      const isSolved = questionProgress?.solved || false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "solved" && isSolved) ||
        (statusFilter === "unsolved" && !isSolved);

      // Difficulty filter
      const matchesDifficulty =
        difficultyFilter.length === 0 ||
        difficultyFilter.includes(question.difficultyLevel);

      return matchesSearch && matchesStatus && matchesDifficulty;
    }) || [];

  return (
    <Box
      sx={{
        p: { xs: 2, md: 2 },
        height: "100%",
        bgcolor: darkMode ? "#000000" : "#FFFFFF",
        color: darkMode ? "#FFFFFF" : "#0F0F0F",
        borderRadius: { xs: 0, md: "10px" },
        boxShadow: darkMode
          ? "0 4px 15px rgba(0,0,0,0.15)"
          : "0 4px 12px rgba(15, 15, 15, 0.06)",
        border: darkMode ? "none" : "1px solid rgba(15, 15, 15, 0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
      }}
    >
      {/* Module Title and Description */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: "1.8rem",
              my: 0, // Remove any top/bottom margin
              lineHeight: 1.2,
              color: darkMode ? "#ffffff" : "#0F0F0F",
            }}
          >
            {module.title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {isAdmin && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<BugReportIcon />}
                onClick={handleViewReports}
                sx={{
                  bgcolor: "transparent",
                  color: "#f44336",
                  border: "1.6px solid #f44336",
                  borderRadius: "8px",
                  minWidth: "auto",
                  padding: "3px 10px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  textTransform: "none",
                  height: "28px",
                  "&:hover": {
                    bgcolor: "#f44336",
                    color: "white",
                  },
                }}
              >
                Issues
              </Button>
            )}
            {module.videoResource && (
              <Tooltip title="Video Resource">
                <Button
                  href={module.videoResource}
                  target="_blank"
                  size="small"
                  sx={{
                    bgcolor: "transparent",
                    color: "#0088CC",
                    border: "1.6px solid #0088CC",
                    borderRadius: "8px",
                    minWidth: "auto",
                    padding: "3px 10px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    textTransform: "none",
                    height: "28px",
                    "&:hover": {
                      bgcolor: "#0088CC",
                      color: "white",
                    },
                  }}
                >
                  Video
                </Button>
              </Tooltip>
            )}

            {module.documentationUrl && (
              <Tooltip title="Documentation">
                <Button
                  onClick={() => setShowNotes(true)}
                  size="small"
                  sx={{
                    bgcolor: "transparent",
                    color: "#0088CC",
                    border: "1.6px solid #0088CC",
                    borderRadius: "8px",
                    minWidth: "auto",
                    padding: "3px 10px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    textTransform: "none",
                    height: "28px",
                    "&:hover": {
                      bgcolor: "#0088CC",
                      color: "white",
                    },
                  }}
                >
                  Notes
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Typography
          variant="body1"
          sx={{
            mb: 3,
            opacity: 0.85,
            maxWidth: "90%",
            fontSize: "0.8rem",
            color: darkMode ? "#ffffff" : "#0F0F0F",
          }}
        >
          {module.description}
        </Typography>

        {/* Progress bars - Only show for non-admin users */}
        {!isAdmin && (
          <Box sx={{ mb: 3 }}>
            {/* Difficulty progress bars in horizontal layout */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {/* Easy */}
              <Box sx={{ flex: "1 1 30%", minWidth: "200px" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#4caf50", fontWeight: 600 }}
                  >
                    Easy
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode ? "text.secondary" : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {easyCompleted} / {easyQuestions.length} completed
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    easyQuestions.length > 0
                      ? (easyCompleted / easyQuestions.length) * 100
                      : 0
                  }
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha("#4caf50", darkMode ? 0.15 : 0.1),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#4caf50",
                    },
                  }}
                />
              </Box>

              {/* Medium */}
              <Box sx={{ flex: "1 1 30%", minWidth: "200px" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#ff9800", fontWeight: 600 }}
                  >
                    Medium
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode ? "text.secondary" : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {mediumCompleted} / {mediumQuestions.length} completed
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    mediumQuestions.length > 0
                      ? (mediumCompleted / mediumQuestions.length) * 100
                      : 0
                  }
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha("#ff9800", darkMode ? 0.15 : 0.1),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#ff9800",
                    },
                  }}
                />
              </Box>

              {/* Hard */}
              <Box sx={{ flex: "1 1 30%", minWidth: "200px" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#f44336", fontWeight: 600 }}
                  >
                    Hard
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode ? "text.secondary" : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {hardCompleted} / {hardQuestions.length} completed
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    hardQuestions.length > 0
                      ? (hardCompleted / hardQuestions.length) * 100
                      : 0
                  }
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha("#f44336", darkMode ? 0.15 : 0.1),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#f44336",
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Search and Filter Section */}
        <Box sx={{ mb: 0 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: { xs: "wrap", md: "nowrap" },
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Search with Button */}
            <Box
              sx={{
                display: "flex",
                flex: { xs: "1 1 auto", md: "0 1 auto" },
                maxWidth: { md: "320px" },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  width: "100%",
                  height: "32px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  bgcolor: darkMode
                    ? "rgba(20, 20, 20, 0.6)"
                    : "rgba(0, 0, 0, 0.05)",
                  border: `1px solid ${
                    darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                  }`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    pl: 1,
                    color: darkMode
                      ? "rgba(255, 255, 255, 0.6)"
                      : "rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <SearchIcon fontSize="small" />
                </Box>
                <TextField
                  variant="standard"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    flex: 1,
                    height: "32px",
                    "& .MuiInputBase-root": {
                      px: 0.5,
                      height: "32px",
                      "&::before, &::after": {
                        display: "none",
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: darkMode ? "#ffffff" : "#0F0F0F",
                      fontSize: "0.75rem",
                      height: "32px",
                      lineHeight: "32px",
                      py: 0,
                    },
                  }}
                  InputProps={{
                    disableUnderline: true,
                    style: { height: "32px" },
                  }}
                />
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#0088CC",
                    color: "#ffffff",
                    borderRadius: 0,
                    "&:hover": {
                      bgcolor: alpha("#0088CC", 0.9),
                    },
                    textTransform: "none",
                    fontWeight: 500,
                    px: 1.5,
                    height: "32px",
                    minHeight: "32px",
                    maxHeight: "32px",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Search
                </Button>
              </Box>
            </Box>

            {/* Filters - Now aligned right */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                ml: "auto",
              }}
            >
              {/* Status Label - hidden */}
              <Typography
                variant="body2"
                sx={{
                  display: { xs: "none", lg: "none" },
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(15, 15, 15, 0.7)",
                  whiteSpace: "nowrap",
                  fontSize: "0.85rem",
                }}
              >
                Status
              </Typography>

              {/* Status Dropdown */}
              <FormControl sx={{ minWidth: "90px" }} size="small">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  sx={{
                    color: darkMode ? "#ffffff" : "#0F0F0F",
                    bgcolor: darkMode
                      ? "rgba(20, 20, 20, 0.4)"
                      : "rgba(0, 0, 0, 0.03)",
                    height: "32px",
                    fontSize: "0.75rem",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.15)",
                      borderWidth: "1px",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.25)",
                    },
                    "& .MuiSelect-select": {
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      paddingLeft: "8px",
                      paddingRight: "24px",
                      height: "24px",
                      lineHeight: "24px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: darkMode ? "#121212" : "#ffffff",
                        color: darkMode ? "#ffffff" : "#0F0F0F",
                      },
                    },
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="solved">Solved</MenuItem>
                  <MenuItem value="unsolved">Unsolved</MenuItem>
                </Select>
              </FormControl>

              {/* Difficulty Label - hidden */}
              <Typography
                variant="body2"
                sx={{
                  display: { xs: "none", lg: "none" },
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(15, 15, 15, 0.7)",
                  whiteSpace: "nowrap",
                  fontSize: "0.85rem",
                }}
              >
                Difficulty
              </Typography>

              {/* Difficulty Dropdown */}
              <FormControl sx={{ minWidth: "90px" }} size="small">
                <Select
                  value={
                    difficultyFilter.length === 1 ? difficultyFilter[0] : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setDifficultyFilter([]);
                    } else {
                      setDifficultyFilter([value]);
                    }
                  }}
                  displayEmpty
                  sx={{
                    color: darkMode ? "#ffffff" : "#0F0F0F",
                    bgcolor: darkMode
                      ? "rgba(20, 20, 20, 0.4)"
                      : "rgba(0, 0, 0, 0.03)",
                    height: "32px",
                    fontSize: "0.75rem",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.15)",
                      borderWidth: "1px",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.25)",
                    },
                    "& .MuiSelect-select": {
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      paddingLeft: "8px",
                      paddingRight: "24px",
                      height: "24px",
                      lineHeight: "24px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: darkMode ? "#121212" : "#ffffff",
                        color: darkMode ? "#ffffff" : "#0F0F0F",
                      },
                    },
                  }}
                  renderValue={(selected) => {
                    if (selected === "") {
                      return "All";
                    }

                    const color =
                      selected === "easy"
                        ? "#4caf50"
                        : selected === "medium"
                        ? "#ff9800"
                        : "#f44336";

                    return (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: color,
                          }}
                        />
                        {selected.charAt(0).toUpperCase() + selected.slice(1)}
                      </Box>
                    );
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="easy">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#4caf50",
                        }}
                      />
                      Easy
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#ff9800",
                        }}
                      />
                      Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="hard">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#f44336",
                        }}
                      />
                      Hard
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        {/* Questions Title Row with Add Button - Only visible to admins */}
        {isAdmin && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1,
              borderBottom: "1px solid",
              borderColor: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              mb: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: darkMode ? "#ffffff" : "#0F0F0F",
                fontSize: "1rem",
              }}
            >
              Questions
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {questions.length > 0 && (
                <Tooltip title="Export Questions as JSON">
                  <IconButton
                    onClick={async () => {
                      try {
                        const response = await axios.get(
                          `${apiUrl}/cohorts/${cohortId}/modules/${module._id}/questions/export`,
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                          }
                        );
                        const data = response.data;
                        const blob = new Blob(
                          [JSON.stringify({ questions: data.questions }, null, 2)],
                          { type: "application/json" }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${(data.moduleName || "module").replace(/[^a-zA-Z0-9]/g, "_")}_questions.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("Export failed:", err);
                      }
                    }}
                    size="small"
                    sx={{
                      color: darkMode ? "#4CAF50" : "#388E3C",
                      "&:hover": {
                        bgcolor: alpha(darkMode ? "#4CAF50" : "#388E3C", 0.1),
                      },
                    }}
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {handleOpenQuestionDialog && (
                <Tooltip title="Add Question">
                  <IconButton
                    onClick={() => handleOpenQuestionDialog(module)}
                    size="small"
                    sx={{
                      color: darkMode ? "#0088CC" : "#0088CC",
                      "&:hover": {
                        bgcolor: alpha("#0088CC", 0.1),
                      },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Question Cards - Only this part scrollable */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "transparent",
          pr: 1,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(darkMode ? "#ffffff" : "#0F0F0F", 0.2),
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(darkMode ? "#ffffff" : "#0F0F0F", 0.3),
          },
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(
            darkMode ? "#ffffff" : "#0F0F0F",
            0.2
          )} transparent`,
        }}
      >
        {loadingQuestions ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={40} sx={{ color: "#0088CC" }} />
            <Typography variant="body2" color="textSecondary">
              Loading questions...
            </Typography>
          </Box>
        ) : filteredQuestions.length > 0 ? (
          filteredQuestions.map((question, index) => {
            const questionProgress = questionProgressList.find(
              (qp) => qp.question === question._id
            );
            const isSolved = questionProgress?.solved || false;

            // Define colors based on difficulty
            const difficultyColor =
              question.difficultyLevel === "easy"
                ? "#4caf50"
                : question.difficultyLevel === "medium"
                ? "#ff9800"
                : "#f44336";

            // Blur color based on solved status - only for dark mode
            const blurColor = isSolved
              ? "rgba(76, 175, 80, 0.7)"
              : "rgba(0, 136, 204, 0.7)";

            return (
              <Card
                key={question._id}
                sx={{
                  mb: 1.5,
                  border: darkMode
                    ? "0px solid"
                    : "1px solid rgba(15, 15, 15, 0.08)",
                  borderRadius: "10px",
                  position: "relative",
                  overflow: "hidden",
                  backgroundColor: darkMode ? "#000D16" : "#ffffff",
                  boxShadow: darkMode
                    ? "none"
                    : "0 4px 12px rgba(15, 15, 15, 0.06)",
                  minHeight: "120px",
                }}
              >
                {/* Gaussian blur effect - only show in dark mode */}
                {darkMode && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: "70%",
                      height: "140%",
                      background: `radial-gradient(circle at bottom right, ${blurColor} 10%, transparent 80%)`,
                      filter: "blur(70px)",
                      zIndex: 0,
                      opacity: 1,
                    }}
                  />
                )}

                <CardContent sx={{ p: 2, position: "relative", zIndex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                          display: "flex",
                          alignItems: "center",
                          fontSize: "1.1rem",
                          color: darkMode ? "#ffffff" : "#0F0F0F",
                        }}
                      >
                        {question.title}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          mb: 0.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: difficultyColor,
                            fontWeight: "medium",
                            fontSize: "0.8rem",
                          }}
                        >
                          {question.difficultyLevel.charAt(0).toUpperCase() +
                            question.difficultyLevel.slice(1)}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: darkMode ? "#ffffff" : "#0F0F0F",
                            opacity: darkMode ? 0.8 : 0.7,
                            fontSize: "0.8rem",
                          }}
                        >
                          Acceptance Rate:{" "}
                          {Math.round(
                            (question.stats?.acceptedSubmissions /
                              question.stats?.totalSubmissions) *
                              100
                          ) || 0}
                          %
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: darkMode ? "#ffffff" : "#0F0F0F",
                            opacity: darkMode ? 0.8 : 0.7,
                            fontSize: "0.8rem",
                          }}
                        >
                          Points: {question.marks || 10}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      {/* View button for teachers */}
                      {isTeacher && (
                        <Tooltip title="View Question">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(
                                `/cohorts/${cohortId}/modules/${module._id}/questions/${question._id}/view`,
                                '_blank'
                              )
                            }
                            sx={{
                              bgcolor: alpha("#9c27b0", 0.1),
                              color: "#9c27b0",
                              "&:hover": {
                                bgcolor: alpha("#9c27b0", 0.2),
                              },
                              width: 30,
                              height: 30,
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Edit and Delete buttons for admins only */}
                      {isAdmin && handleEditQuestion && (
                        <>
                          <Tooltip title="View Question">
                            <IconButton
                              size="small"
                              onClick={() =>
                                window.open(
                                  `/admin/cohorts/${cohortId}/modules/${module._id}/questions/${question._id}/view`,
                                  '_blank'
                                )
                              }
                              sx={{
                                bgcolor: alpha("#9c27b0", 0.1),
                                color: "#9c27b0",
                                "&:hover": {
                                  bgcolor: alpha("#9c27b0", 0.2),
                                },
                                width: 30,
                                height: 30,
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit Question">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleEditQuestion(module, question)
                              }
                              sx={{
                                bgcolor: alpha("#0088CC", 0.1),
                                color: "#0088CC",
                                "&:hover": {
                                  bgcolor: alpha("#0088CC", 0.2),
                                },
                                width: 30,
                                height: 30,
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Question">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleDeleteQuestion(module, question)
                              }
                              sx={{
                                bgcolor: alpha("#f44336", 0.1),
                                color: "#f44336",
                                "&:hover": {
                                  bgcolor: alpha("#f44336", 0.2),
                                },
                                width: 30,
                                height: 30,
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {/* Only show Solve Challenge button for non-admin users */}
                      {!isAdmin && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleSolveQuestion(question)}
                          sx={{
                            bgcolor: isSolved ? "#01780F" : "#0088CC",
                            color: "#ffffff",
                            "&:hover": {
                              bgcolor: isSolved
                                ? alpha("#01780F", 0.9)
                                : alpha("#0088CC", 0.9),
                            },
                            fontWeight: "medium",
                            textTransform: "none",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            py: 0.5,
                            px: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {isSolved && (
                            <CheckCircleIcon sx={{ fontSize: "0.9rem" }} />
                          )}
                          {isSolved ? "Solved" : "Solve Challenge"}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
              color: darkMode
                ? "rgba(255, 255, 255, 0.5)"
                : "rgba(15, 15, 15, 0.7)",
            }}
          >
            <Typography variant="body1">
              {module.questions?.length === 0 && isAdmin
                ? "No questions in this module. Click the '+' button to create one."
                : "No questions match your filters"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CohortDetailRight;
