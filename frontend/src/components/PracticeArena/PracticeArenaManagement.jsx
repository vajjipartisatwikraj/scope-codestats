import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  useTheme,
  alpha,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  TableSortLabel,
  Container,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CodeIcon from "@mui/icons-material/Code";
import QuizIcon from "@mui/icons-material/Quiz";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import CategoryIcon from "@mui/icons-material/Category";
import TagIcon from "@mui/icons-material/Tag";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import FolderIcon from "@mui/icons-material/Folder";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { Link } from "react-router-dom";
import PAQuestionForm from "./PAQuestionForm";
import { toast } from "react-toastify";

// Extract unique topics from questions
const extractTopics = (questions) => {
  const topicsSet = new Set();
  questions.forEach((question) => {
    if (question.topics && Array.isArray(question.topics)) {
      question.topics.forEach((topic) => topicsSet.add(topic));
    }
  });
  return [...topicsSet];
};

// Extract unique tags from questions
const extractTags = (questions) => {
  const tagsSet = new Set();
  questions.forEach((question) => {
    if (question.tags && Array.isArray(question.tags)) {
      question.tags.forEach((tag) => tagsSet.add(tag));
    }
  });
  return [...tagsSet];
};

// Extract unique question banks from questions
const extractQuestionBanks = (questions) => {
  const banksSet = new Set();
  questions.forEach((question) => {
    if (question.questionBank) {
      banksSet.add(question.questionBank);
    }
  });
  return [...banksSet].sort();
};

const PracticeArenaManagement = () => {
  const theme = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();

  // State for questions
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0); // Total number of questions

  // State for the question form
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // State for view mode
  const [viewMode, setViewMode] = useState("cards"); // 'list' or 'cards' - default to cards
  const [questionBankStats, setQuestionBankStats] = useState([]);
  const [loadingBankStats, setLoadingBankStats] = useState(false);

  // State for question banks management dialog
  const [banksDialogOpen, setBanksDialogOpen] = useState(false);
  const [allQuestionBanks, setAllQuestionBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // State for overall statistics (all questions, not just current page)
  const [overallStats, setOverallStats] = useState({
    easy: 0,
    medium: 0,
    hard: 0,
    programming: 0,
    mcq: 0,
  });

  // State for search, sort, and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filters, setFilters] = useState({
    difficulty: "",
    type: "",
    tag: "",
    questionBank: "",
  });

  // Computed values for stats
  // Note: Since we're using server-side pagination, detailed stats (easy/medium/hard counts)
  // are based only on the current page. Total count is accurate from server.
  const totalQuestions = totalCount;
  const topics = useMemo(() => extractTopics(questions), [questions]);
  const tags = useMemo(() => extractTags(questions), [questions]);
  const questionBanks = useMemo(
    () => extractQuestionBanks(questions),
    [questions]
  );

  // Use overall stats instead of paginated questions
  const easyQuestions = overallStats.easy;
  const mediumQuestions = overallStats.medium;
  const hardQuestions = overallStats.hard;
  const mcqQuestions = overallStats.mcq;
  const programmingQuestions = overallStats.programming;

  // Fetch questions on component mount and when pagination/filters change
  useEffect(() => {
    fetchQuestions();
  }, [page, rowsPerPage, searchTerm, sortBy, sortDirection, filters]);

  // Fetch overall statistics on component mount
  useEffect(() => {
    fetchOverallStats();
  }, []);

  // Fetch question bank statistics when switching to card view
  useEffect(() => {
    if (viewMode === "cards") {
      fetchQuestionBankStats();
    }
  }, [viewMode]);

  const fetchOverallStats = async () => {
    try {
      // Fetch all questions without pagination to get complete stats
      const response = await axios.get(
        `${apiUrl}/practice-arena/questions?limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const allQuestions = response.data.questions;

      // Calculate overall statistics
      const stats = {
        easy: allQuestions.filter((q) => q.difficultyLevel === "easy").length,
        medium: allQuestions.filter((q) => q.difficultyLevel === "medium")
          .length,
        hard: allQuestions.filter((q) => q.difficultyLevel === "hard").length,
        programming: allQuestions.filter((q) => q.type === "programming")
          .length,
        mcq: allQuestions.filter((q) => q.type === "mcq").length,
      };

      setOverallStats(stats);
    } catch (error) {
      console.error("Error fetching overall stats:", error);
    }
  };

  const fetchQuestionBankStats = async () => {
    setLoadingBankStats(true);
    try {
      // Fetch all questions without pagination to get complete stats
      const response = await axios.get(
        `${apiUrl}/practice-arena/questions?limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const allQuestions = response.data.questions;

      // Group questions by questionBank (which contains the main tag)
      const bankMap = {};

      allQuestions.forEach((question) => {
        const bank = question.questionBank || "Uncategorized";

        if (!bankMap[bank]) {
          bankMap[bank] = {
            name: bank,
            totalQuestions: 0,
            easy: 0,
            medium: 0,
            hard: 0,
            programming: 0,
            mcq: 0,
          };
        }

        bankMap[bank].totalQuestions++;

        // Count by difficulty
        if (question.difficultyLevel === "easy") bankMap[bank].easy++;
        else if (question.difficultyLevel === "medium") bankMap[bank].medium++;
        else if (question.difficultyLevel === "hard") bankMap[bank].hard++;

        // Count by type
        if (question.type === "programming") bankMap[bank].programming++;
        else if (question.type === "mcq") bankMap[bank].mcq++;
      });

      // Convert to array and sort alphabetically by bank name (main tag)
      const statsArray = Object.values(bankMap).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setQuestionBankStats(statsArray);
    } catch (error) {
      console.error("Error fetching question bank stats:", error);
      toast.error("Failed to load question bank statistics");
    } finally {
      setLoadingBankStats(false);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        sortBy,
        sortDirection,
      });

      // Add filters if they exist
      if (filters.difficulty) params.append("difficulty", filters.difficulty);
      if (filters.type) params.append("type", filters.type);
      if (filters.questionBank)
        params.append("questionBank", filters.questionBank);
      if (filters.tag) params.append("tag", filters.tag);
      if (searchTerm) params.append("search", searchTerm);

      const response = await axios.get(
        `${apiUrl}/practice-arena/questions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setQuestions(response.data.questions);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // fetchQuestions will be triggered by useEffect
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
    // fetchQuestions will be triggered by useEffect
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setFormOpen(true);
  };

  const handleOpenBanksDialog = async () => {
    setBanksDialogOpen(true);
    await fetchQuestionBanks();
  };

  const handleCloseBanksDialog = () => {
    setBanksDialogOpen(false);
  };

  const fetchQuestionBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await axios.get(
        `${apiUrl}/practice-arena/question-banks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setAllQuestionBanks(response.data);
    } catch (error) {
      console.error("Error fetching question banks:", error);
      toast.error("Failed to fetch question banks");
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleToggleBankVisibility = async (bankId, currentVisibility) => {
    try {
      await axios.patch(
        `${apiUrl}/practice-arena/question-banks/${bankId}/visibility`,
        { isVisible: !currentVisibility },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(
        `Question bank ${!currentVisibility ? "shown" : "hidden"} successfully`
      );
      // Refresh the banks list
      await fetchQuestionBanks();
    } catch (error) {
      console.error("Error toggling bank visibility:", error);
      toast.error("Failed to update question bank visibility");
    }
  };

  const handleEditQuestion = async (question) => {
    // Fetch full question data before editing
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/practice-arena/questions/${question._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setEditingQuestion(response.data);
      setFormOpen(true);
    } catch (error) {
      console.error("Error fetching question details:", error);
      toast.error("Failed to load question details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    setDeletingQuestionId(questionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteQuestion = async () => {
    try {
      await axios.delete(
        `${apiUrl}/practice-arena/questions/${deletingQuestionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      fetchQuestions(); // Refresh questions after deletion
      fetchOverallStats(); // Refresh overall stats
      toast.success("Question deleted successfully");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingQuestionId(null);
    }
  };

  const handleFormClose = (refreshNeeded = false) => {
    setFormOpen(false);
    setEditingQuestion(null);

    if (refreshNeeded) {
      fetchQuestions();
      fetchOverallStats(); // Refresh overall stats when a question is added/edited
    }
  };

  const saveQuestion = async (questionData) => {
    try {
      let dataToSend = { ...questionData };

      // Clean up data based on question type to avoid validation errors
      if (dataToSend.type === "programming") {
        // For programming questions, remove options field entirely to avoid validation errors
        delete dataToSend.options;
      } else if (dataToSend.type === "mcq") {
        // For MCQ questions, remove programming-specific fields
        delete dataToSend.languages;
        delete dataToSend.defaultLanguage;
        delete dataToSend.testCases;
        delete dataToSend.examples;
        delete dataToSend.constraints;
      }

      if (editingQuestion) {
        // Update existing question
        await axios.put(
          `${apiUrl}/practice-arena/questions/${editingQuestion._id}`,
          dataToSend,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Question updated successfully");
      } else {
        // Create new question
        const response = await axios.post(
          `${apiUrl}/practice-arena/questions`,
          dataToSend,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Question created successfully");
      }

      // Close the form and refresh the questions list
      handleFormClose(true);
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error(error.response?.data?.message || "Failed to save question");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "default";
    }
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
    // fetchQuestions will be triggered by useEffect
  };

  // Handle sort
  const handleSort = (property) => {
    const isAsc = sortBy === property && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(property);
    // fetchQuestions will be triggered by useEffect
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(0);
    // fetchQuestions will be triggered by useEffect
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      difficulty: "",
      type: "",
      topic: "",
      tag: "",
    });
    setSearchTerm("");
    setPage(0);
    // fetchQuestions will be triggered by useEffect
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "list" ? "cards" : "list"));
  };

  // Handle question bank card click
  const handleBankClick = (bankName) => {
    // Switch to list view and apply filter
    setViewMode("list");
    setFilters((prev) => ({
      ...prev,
      questionBank: bankName,
    }));
    setPage(0);
  };

  // Since we're using server-side pagination, we don't need client-side filtering
  // The questions array already contains the filtered and sorted data from the server
  const displayedQuestions = questions;

  return (
    <Box
      sx={{
        py: 3,
        backgroundColor: theme.palette.mode === "dark" ? "#000000" : "#f5f5f7",
        minHeight: "100vh",
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 2,
            backgroundColor: "#0585E0",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
            color: "white",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant="h4"
                fontWeight="bold"
                gutterBottom
                sx={{ color: "white" }}
              >
                Practice Arena Management
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "white" }}>
                Create and manage practice questions for users to enhance their
                skills
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                display: "flex",
                justifyContent: { xs: "flex-start", md: "flex-end" },
                alignItems: "center",
                mt: { xs: 1, md: 0 },
              }}
            >
              <Tooltip title="Refresh data">
                <IconButton
                  onClick={fetchQuestions}
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                    mr: 2,
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={handleOpenBanksDialog}
                sx={{
                  color: "white",
                  borderColor: "white",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.8)",
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                  mr: 2,
                  px: 3,
                  py: 1.2,
                  fontWeight: "bold",
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Manage Banks
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddQuestion}
                sx={{
                  bgcolor: "white",
                  color: "#2E7D32",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                  px: 3,
                  py: 1.2,
                  fontWeight: "bold",
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                }}
              >
                Add Question
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                overflow: "hidden",
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
                color: "white",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: 5,
                  bgcolor: "#4CAF50",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              />
              <Box sx={{ p: 2, pt: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    color: "#4CAF50",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(76, 175, 80, 0.2)",
                      color: "#4CAF50",
                      width: 32,
                      height: 32,
                      mr: 1.5,
                    }}
                  >
                    <LibraryBooksIcon sx={{ fontSize: "1.2rem" }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight="medium">
                    Total Questions
                  </Typography>
                </Box>

                <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                  {totalQuestions}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="#4fc3f7"
                      fontWeight="medium"
                    >
                      Programming
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color:
                          theme.palette.mode === "dark"
                            ? "#ffffff"
                            : "text.primary",
                      }}
                    >
                      {programmingQuestions}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      color="#ce93d8"
                      fontWeight="medium"
                    >
                      MCQ
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color:
                          theme.palette.mode === "dark"
                            ? "#ffffff"
                            : "text.primary",
                      }}
                    >
                      {mcqQuestions}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                overflow: "hidden",
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
                color: "white",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: 5,
                  bgcolor: "#673AB7",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              />
              <Box sx={{ p: 2, pt: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    color: "#673AB7",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(103, 58, 183, 0.2)",
                      color: "#673AB7",
                      width: 32,
                      height: 32,
                      mr: 1.5,
                    }}
                  >
                    <CategoryIcon sx={{ fontSize: "1.2rem" }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight="medium">
                    Topics
                  </Typography>
                </Box>

                <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                  {topics.length}
                </Typography>

                <Typography variant="body2" sx={{ mt: 1, color: "#cccccc" }}>
                  Categorizing questions across {topics.length} different topics
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                overflow: "hidden",
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
                color: "white",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: 5,
                  bgcolor: "#2196F3",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              />
              <Box sx={{ p: 2, pt: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    color: "#2196F3",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(33, 150, 243, 0.2)",
                      color: "#2196F3",
                      width: 32,
                      height: 32,
                      mr: 1.5,
                    }}
                  >
                    <TagIcon sx={{ fontSize: "1.2rem" }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight="medium">
                    Tags
                  </Typography>
                </Box>

                <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                  {tags.length}
                </Typography>

                <Typography variant="body2" sx={{ mt: 1, color: "#cccccc" }}>
                  {totalQuestions > 0
                    ? `${((tags.length / totalQuestions) * 100).toFixed(
                        1
                      )}% tag coverage ratio`
                    : "No questions with tags"}
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                overflow: "hidden",
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
                color: "white",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: 5,
                  bgcolor: "#F44336",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              />
              <Box sx={{ p: 2, pt: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    color: "#F44336",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(244, 67, 54, 0.2)",
                      color: "#F44336",
                      width: 32,
                      height: 32,
                      mr: 1.5,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: "1.2rem" }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight="medium">
                    Avg. Difficulty
                  </Typography>
                </Box>

                <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                  {questions.length > 0
                    ? (() => {
                        const difficultyCount = {
                          easy: questions.filter(
                            (q) => q.difficultyLevel === "easy"
                          ).length,
                          medium: questions.filter(
                            (q) => q.difficultyLevel === "medium"
                          ).length,
                          hard: questions.filter(
                            (q) => q.difficultyLevel === "hard"
                          ).length,
                        };
                        const mostCommon = Object.entries(difficultyCount).sort(
                          (a, b) => b[1] - a[1]
                        )[0][0];
                        return (
                          mostCommon.charAt(0).toUpperCase() +
                          mostCommon.slice(1)
                        );
                      })()
                    : "N/A"}
                </Typography>

                <Typography variant="body2" sx={{ mt: 1, color: "#cccccc" }}>
                  {easyQuestions} easy, {mediumQuestions} medium,{" "}
                  {hardQuestions} hard
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Filter and Search Section */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* View Mode Toggle */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant={viewMode === "cards" ? "contained" : "outlined"}
                startIcon={<ViewModuleIcon />}
                onClick={() => setViewMode("cards")}
                sx={{
                  height: "42px",
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  bgcolor:
                    viewMode === "cards"
                      ? theme.palette.primary.main
                      : "transparent",
                  color:
                    viewMode === "cards" ? "#fff" : theme.palette.text.primary,
                  borderColor:
                    theme.palette.mode === "dark"
                      ? "#232323"
                      : "rgba(0,0,0,0.1)",
                  "&:hover": {
                    bgcolor:
                      viewMode === "cards"
                        ? theme.palette.primary.dark
                        : alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                Card View
              </Button>
              <Button
                variant={viewMode === "list" ? "contained" : "outlined"}
                startIcon={<ViewListIcon />}
                onClick={() => setViewMode("list")}
                sx={{
                  height: "42px",
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  bgcolor:
                    viewMode === "list"
                      ? theme.palette.primary.main
                      : "transparent",
                  color:
                    viewMode === "list" ? "#fff" : theme.palette.text.primary,
                  borderColor:
                    theme.palette.mode === "dark"
                      ? "#232323"
                      : "rgba(0,0,0,0.1)",
                  "&:hover": {
                    bgcolor:
                      viewMode === "list"
                        ? theme.palette.primary.dark
                        : alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                List View
              </Button>
            </Box>

            {/* Reset Filters */}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={resetFilters}
              sx={{
                height: "42px",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                borderColor:
                  theme.palette.mode === "dark" ? "#232323" : "rgba(0,0,0,0.1)",
              }}
            >
              Reset Filters
            </Button>
          </Box>

          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search questions..."
                variant="outlined"
                size="medium"
                value={searchTerm}
                onChange={handleSearch}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#111" : "#f8f9fa",
                    "& fieldset": {
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "#232323"
                          : "rgba(0,0,0,0.1)",
                    },
                    "&:hover fieldset": {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Difficulty Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 600 }}>Difficulty</InputLabel>
                <Select
                  name="difficulty"
                  value={filters.difficulty}
                  onChange={handleFilterChange}
                  label="Difficulty"
                  sx={{
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#111" : "#f8f9fa",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "#232323"
                          : "rgba(0,0,0,0.1)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                    },
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
                          bgcolor: "#4CAF50",
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
                          bgcolor: "#FF9800",
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
                          bgcolor: "#F44336",
                        }}
                      />
                      Hard
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Type Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 600 }}>Type</InputLabel>
                <Select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  label="Type"
                  sx={{
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#111" : "#f8f9fa",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "#232323"
                          : "rgba(0,0,0,0.1)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="programming">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CodeIcon
                        sx={{
                          fontSize: "1rem",
                          color: theme.palette.info.main,
                        }}
                      />
                      Programming
                    </Box>
                  </MenuItem>
                  <MenuItem value="mcq">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <QuizIcon
                        sx={{
                          fontSize: "1rem",
                          color: theme.palette.warning.main,
                        }}
                      />
                      MCQ
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Question Bank Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 600 }}>Question Bank</InputLabel>
                <Select
                  name="questionBank"
                  value={filters.questionBank}
                  onChange={handleFilterChange}
                  label="Question Bank"
                  sx={{
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#111" : "#f8f9fa",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "#232323"
                          : "rgba(0,0,0,0.1)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {questionBanks.map((bank) => (
                    <MenuItem key={bank} value={bank}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <LibraryBooksIcon
                          sx={{
                            fontSize: "1rem",
                            color: theme.palette.primary.main,
                          }}
                        />
                        {bank}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Tags Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 600 }}>Tags</InputLabel>
                <Select
                  name="tag"
                  value={filters.tag}
                  onChange={handleFilterChange}
                  label="Tags"
                  sx={{
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#111" : "#f8f9fa",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "#232323"
                          : "rgba(0,0,0,0.1)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {tags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <TagIcon
                          sx={{
                            fontSize: "1rem",
                            color: theme.palette.secondary.main,
                          }}
                        />
                        {tag}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 400,
            }}
          >
            <CircularProgress size={50} thickness={4} />
          </Box>
        ) : viewMode === "cards" ? (
          // Card View - Question Banks grouped by tags
          <Box>
            {loadingBankStats ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: 400,
                }}
              >
                <CircularProgress size={50} thickness={4} />
              </Box>
            ) : questionBankStats.length === 0 ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: "center",
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                  border:
                    theme.palette.mode === "dark"
                      ? "1px solid #232323"
                      : "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <FolderIcon
                  sx={{
                    fontSize: 60,
                    color: alpha(theme.palette.text.secondary, 0.3),
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="textSecondary">
                  No question banks available
                </Typography>
              </Paper>
            ) : (
              <>
                {/* Display question banks as cards - sorted alphabetically */}
                <Grid container spacing={3}>
                  {questionBankStats.map((bank) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={bank.name}>
                      <Card
                        sx={{
                          height: "100%",
                          borderRadius: 2,
                          backgroundColor:
                            theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                          border:
                            theme.palette.mode === "dark"
                              ? "1px solid #232323"
                              : "1px solid rgba(0,0,0,0.1)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                            borderColor: theme.palette.primary.main,
                          },
                        }}
                        onClick={() => handleBankClick(bank.name)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          {/* Bank Icon and Name */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              mb: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                width: 48,
                                height: 48,
                                mr: 2,
                                flexShrink: 0,
                              }}
                            >
                              <FolderIcon fontSize="large" />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="h6"
                                fontWeight="bold"
                                sx={{
                                  color:
                                    theme.palette.mode === "dark"
                                      ? "#ffffff"
                                      : "text.primary",
                                  mb: 0.5,
                                  wordBreak: "break-word",
                                  lineHeight: 1.3,
                                }}
                              >
                                {bank.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {bank.totalQuestions} question
                                {bank.totalQuestions !== 1 ? "s" : ""}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Difficulty Stats */}
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <span style={{ color: "#4CAF50" }}>
                                {bank.easy} Easy
                              </span>
                              <span>•</span>
                              <span style={{ color: "#FF9800" }}>
                                {bank.medium} Medium
                              </span>
                              <span>•</span>
                              <span style={{ color: "#F44336" }}>
                                {bank.hard} Hard
                              </span>
                            </Typography>
                          </Box>

                          {/* Type Stats */}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              pt: 2,
                              borderTop: `1px solid ${
                                theme.palette.mode === "dark"
                                  ? "#232323"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <CodeIcon
                                sx={{
                                  mr: 0.5,
                                  fontSize: "1rem",
                                  color: theme.palette.info.main,
                                }}
                              />
                              <Typography variant="body2" color="textSecondary">
                                {bank.programming} Programming
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <QuizIcon
                                sx={{
                                  mr: 0.5,
                                  fontSize: "1rem",
                                  color: theme.palette.warning.main,
                                }}
                              />
                              <Typography variant="body2" color="textSecondary">
                                {bank.mcq} MCQ
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        ) : (
          // List View - Original Table
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor:
                theme.palette.mode === "dark" ? "#0A0A0A" : "white",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #232323"
                  : "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <TableSortLabel
                        active={sortBy === "title"}
                        direction={sortBy === "title" ? sortDirection : "asc"}
                        onClick={() => handleSort("title")}
                      >
                        Title
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <TableSortLabel
                        active={sortBy === "questionBank"}
                        direction={
                          sortBy === "questionBank" ? sortDirection : "asc"
                        }
                        onClick={() => handleSort("questionBank")}
                      >
                        Question Bank
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Tags</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <TableSortLabel
                        active={sortBy === "type"}
                        direction={sortBy === "type" ? sortDirection : "asc"}
                        onClick={() => handleSort("type")}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <TableSortLabel
                        active={sortBy === "difficultyLevel"}
                        direction={
                          sortBy === "difficultyLevel" ? sortDirection : "asc"
                        }
                        onClick={() => handleSort("difficultyLevel")}
                      >
                        Difficulty
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <TableSortLabel
                        active={sortBy === "marks"}
                        direction={sortBy === "marks" ? sortDirection : "asc"}
                        onClick={() => handleSort("marks")}
                      >
                        Marks
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedQuestions.map((question) => (
                    <TableRow
                      key={question._id}
                      sx={{
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          transition: "background-color 0.2s ease",
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          color:
                            theme.palette.mode === "dark"
                              ? "#ffffff"
                              : "text.primary",
                        }}
                      >
                        {question.title}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={question.questionBank || "Unspecified"}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderRadius: 1,
                            fontWeight: 500,
                            px: 0.5,
                            borderColor: theme.palette.primary.light,
                            color: theme.palette.primary.main,
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.05
                            ),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {question.tags && question.tags.length > 0 ? (
                            question.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: "0.7rem",
                                  height: 20,
                                  borderColor: alpha(
                                    theme.palette.info.main,
                                    0.4
                                  ),
                                  color: theme.palette.info.main,
                                  backgroundColor: alpha(
                                    theme.palette.info.main,
                                    0.05
                                  ),
                                  mb: 0.5,
                                }}
                              />
                            ))
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              No tags
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            question.type === "programming" ? (
                              <CodeIcon fontSize="small" />
                            ) : (
                              <QuizIcon fontSize="small" />
                            )
                          }
                          label={
                            question.type === "programming"
                              ? "Programming"
                              : "MCQ"
                          }
                          size="small"
                          sx={{
                            borderRadius: 1,
                            backgroundColor:
                              question.type === "programming"
                                ? alpha(theme.palette.info.main, 0.1)
                                : alpha(theme.palette.warning.main, 0.1),
                            color:
                              question.type === "programming"
                                ? theme.palette.info.main
                                : theme.palette.warning.main,
                            fontWeight: 500,
                            border: "none",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={question.difficultyLevel}
                          color={getDifficultyColor(question.difficultyLevel)}
                          size="small"
                          sx={{
                            borderRadius: 1,
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          color:
                            theme.palette.mode === "dark"
                              ? "#ffffff"
                              : "text.primary",
                        }}
                      >
                        {question.marks}
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditQuestion(question)}
                              sx={{
                                color: theme.palette.primary.main,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                "&:hover": {
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.2
                                  ),
                                },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteQuestion(question._id)}
                              sx={{
                                color: theme.palette.error.main,
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.error.main, 0.2),
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedQuestions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            py: 4,
                          }}
                        >
                          <LibraryBooksIcon
                            sx={{
                              fontSize: 60,
                              color: alpha(theme.palette.text.secondary, 0.3),
                            }}
                          />
                          <Typography color="textSecondary" sx={{ mb: 1 }}>
                            {questions.length === 0
                              ? "No questions available"
                              : "No matching questions found"}
                          </Typography>
                          {questions.length === 0 && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleAddQuestion}
                              startIcon={<AddIcon />}
                            >
                              Add your first question
                            </Button>
                          )}
                          {questions.length > 0 && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={resetFilters}
                              startIcon={<FilterListIcon />}
                            >
                              Reset Filters
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
                  {
                    fontWeight: 500,
                  },
              }}
            />
          </Paper>
        )}

        {/* Question Form Dialog */}
        <Dialog
          open={formOpen}
          onClose={(event, reason) => {
            // Prevent closing on backdrop click or escape key
            // User must use the Cancel button which shows confirmation
            if (reason === "backdropClick" || reason === "escapeKeyDown") {
              return;
            }
            handleFormClose();
          }}
          maxWidth="lg"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark" ? "#0A0A0A" : "white",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #232323"
                  : "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            },
          }}
        >
          <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
            <Box
              component="span"
              sx={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
              }}
            >
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <PAQuestionForm
              initialData={editingQuestion}
              onSave={saveQuestion}
              onCancel={() => handleFormClose()}
              isEdit={!!editingQuestion}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark" ? "#0A0A0A" : "white",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #232323"
                  : "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              p: 1,
            },
          }}
        >
          <DialogTitle>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
              }}
            >
              Confirm Deletion
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteQuestion}
              variant="contained"
              color="error"
              sx={{
                px: 2,
                boxShadow: "0 4px 8px rgba(211, 47, 47, 0.2)",
                "&:hover": {
                  boxShadow: "0 6px 12px rgba(211, 47, 47, 0.3)",
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Question Banks Management Dialog */}
        <Dialog
          open={banksDialogOpen}
          onClose={handleCloseBanksDialog}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark" ? "#0A0A0A" : "white",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #232323"
                  : "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h5" fontWeight="bold">
              Manage Question Banks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control visibility of question banks for users
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            {loadingBanks ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : allQuestionBanks.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No question banks found. Create your first question to get
                  started!
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Question Bank
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        Questions
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        Status
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allQuestionBanks.map((bank) => (
                      <TableRow key={bank._id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <FolderIcon
                              sx={{ mr: 1, color: "#0088CC", fontSize: 20 }}
                            />
                            <Typography fontWeight="500">
                              {bank.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={bank.questionCount}
                            size="small"
                            sx={{
                              bgcolor: "#0088CC",
                              color: "white",
                              fontWeight: "bold",
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={bank.isVisible ? "Visible" : "Hidden"}
                            size="small"
                            color={bank.isVisible ? "success" : "default"}
                            sx={{ fontWeight: "bold" }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip
                            title={bank.isVisible ? "Hide Bank" : "Show Bank"}
                          >
                            <IconButton
                              onClick={() =>
                                handleToggleBankVisibility(
                                  bank._id,
                                  bank.isVisible
                                )
                              }
                              color={bank.isVisible ? "warning" : "primary"}
                              size="small"
                            >
                              {bank.isVisible ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseBanksDialog} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PracticeArenaManagement;
