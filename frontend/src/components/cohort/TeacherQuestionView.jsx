import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Tab,
  Tabs,
  IconButton,
  useTheme,
  Alert,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import SubmissionsPanel from "./SubmissionsPanel";
import QuestionReport from "./QuestionReport";

const TeacherQuestionView = () => {
  const { cohortId, moduleId, questionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { token, user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [allUsersSubmissions, setAllUsersSubmissions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");

  useEffect(() => {
    fetchQuestionData();
    fetchAllSubmissions();
  }, [questionId]);

  useEffect(() => {
    // Set the first available language as default when question loads
    if (question?.languages && question.languages.length > 0) {
      setSelectedLanguage(question.languages[0].name);
    }
  }, [question]);

  const fetchQuestionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestion(response.data);
    } catch (error) {
      console.error("Error fetching question:", error);
      toast.error("Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubmissions = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/all-submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setAllUsersSubmissions(response.data || []);
    } catch (error) {
      console.error("Error fetching all users submissions:", error);
      setAllUsersSubmissions([]);
    }
  };

  // Format time helper
  const formatTime = (ms) => {
    if (!ms && ms !== 0) return "N/A";
    return `${ms} ms`;
  };

  // Format memory helper
  const formatMemory = (bytes) => {
    if (!bytes && bytes !== 0) return "N/A";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderStatusIcon = () => {
    if (!question) return null;

    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Published"
        size="small"
        sx={{
          bgcolor: alpha("#4caf50", 0.1),
          color: "#4caf50",
          fontWeight: "bold",
        }}
      />
    );
  };

  // Common HTML content styles (matching CohortProblem.jsx)
  const htmlContentStyles = {
    color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
    lineHeight: 1.6,
    fontSize: "15px",
    "& code": {
      backgroundColor: darkMode
        ? "rgba(0, 136, 204, 0.1)"
        : "rgba(10, 102, 194, 0.08)",
      color: darkMode ? "#0088cc" : "#0a66c2",
      padding: "2px 6px",
      borderRadius: "6px",
      fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
      fontSize: "0.9em",
      fontWeight: "800",
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
      backgroundColor: darkMode ? "rgba(255,255,255,0.05)" : "#f5f5f5",
      padding: "16px",
      borderRadius: "8px",
      overflow: "auto",
      border: `1px solid ${darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"}`,
      margin: "16px 0",
      fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
    },
    "& img": {
      maxWidth: "100%",
      height: "auto",
      borderRadius: "8px",
      margin: "16px 0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    "& ul, & ol": {
      margin: "16px 0",
      paddingLeft: "24px",
    },
    "& li": {
      margin: "8px 0",
    },
    "& blockquote": {
      borderLeft: `4px solid ${theme.palette.primary.main}`,
      paddingLeft: "16px",
      margin: "16px 0",
      fontStyle: "italic",
      backgroundColor: darkMode ? "rgba(255,255,255,0.05)" : "#f8f9fa",
      padding: "16px",
      borderRadius: "0 8px 8px 0",
    },
    "& .highlight": {
      backgroundColor: darkMode ? "rgba(255,235,59,0.3)" : "#fff3cd",
      padding: "2px 4px",
      borderRadius: "4px",
    },
    "& .note": {
      backgroundColor: "transparent",
      border: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
      borderRadius: "8px",
      padding: "0",
      margin: "16px 0",
      overflow: "hidden",
      "& p:first-of-type": {
        backgroundColor: darkMode
          ? "rgba(0, 136, 204, 0.1)"
          : "rgba(10, 102, 194, 0.08)",
        padding: "12px 16px",
        margin: "0",
        fontWeight: "600",
        fontSize: "0.9rem",
        color: darkMode ? "#0088cc" : "#0a66c2",
        borderBottom: `1px solid ${
          darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
        }`,
      },
      "& ul": {
        padding: "12px 16px 12px 40px",
        margin: "0",
      },
    },
    "& .warning": {
      backgroundColor: darkMode ? "rgba(255,152,0,0.1)" : "#fff3e0",
      border: `1px solid ${theme.palette.warning.main}`,
      padding: "16px",
      borderRadius: "8px",
      margin: "16px 0",
    },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      color: theme.palette.primary.main,
      marginTop: "1.5em",
      marginBottom: "0.5em",
    },
    "& p": {
      margin: "8px 0",
    },
    "& strong": {
      fontWeight: "bold",
      color: darkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)",
    },
    "& em": {
      fontStyle: "italic",
    },
    "& hr": {
      margin: "24px 0",
      border: "none",
      borderTop: `1px solid ${
        darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"
      }`,
    },
    "& .example": {
      backgroundColor: "transparent",
      border: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
      borderRadius: "8px",
      padding: "0",
      margin: "0px 0",
      overflow: "hidden",
      fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
      "& > div": {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0",
      },
      "& .input-output-row": {
        display: "contents",
      },
      "& .label": {
        backgroundColor: darkMode
          ? "rgba(0, 136, 204, 0.1)"
          : "rgba(10, 102, 194, 0.08)",
        padding: "12px 16px",
        fontWeight: "600",
        fontSize: "0.9rem",
        color: darkMode ? "#0088cc" : "#0a66c2",
      },
      "& .label:first-of-type": {
        borderRight: `1px solid ${
          darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
        }`,
      },
      "& .value": {
        backgroundColor: "transparent",
        padding: "12px 16px",
        fontSize: "0.9rem",
        color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)",
        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
      },
      "& .value:first-of-type": {
        borderRight: `1px solid ${
          darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
        }`,
      },
    },
    "& p:has(+ .example)": {
      marginBottom: "15px",
    },
    "& table": {
      width: "100%",
      borderCollapse: "collapse",
      margin: "10px 0",
      fontFamily: "inherit",
      border: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
      borderRadius: "8px",
    },
    "& table thead th": {
      backgroundColor: darkMode
        ? "rgba(0, 136, 204, 0.1)"
        : "rgba(10, 102, 194, 0.08)",
      padding: "12px 16px",
      fontWeight: "600",
      fontSize: "0.9rem",
      color: darkMode ? "#0088cc" : "#0a66c2",
      textAlign: "left",
      border: "none",
      borderBottom: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
    },
    "& table thead th:not(:last-child)": {
      borderRight: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
    },
    "& table thead th:first-of-type": {
      borderTopLeftRadius: "7px",
    },
    "& table thead th:last-child": {
      borderTopRightRadius: "7px",
    },
    "& table tbody td": {
      backgroundColor: "transparent",
      padding: "12px 16px",
      fontSize: "0.9rem",
      color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)",
      border: "none",
    },
    "& table tbody td:not(:last-child)": {
      borderRight: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
    },
    "& table tbody tr:not(:last-child) td": {
      borderBottom: `1px solid ${
        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      }`,
    },
    "& table tbody tr:last-child td:first-of-type": {
      borderBottomLeftRadius: "7px",
    },
    "& table tbody tr:last-child td:last-child": {
      borderBottomRightRadius: "7px",
    },
  };

  // Render MCQ/MOQ options (read-only for teacher/admin, showing correct answers)
  const renderMcqOptions = () => {
    if (!question || question.type !== "mcq") return null;

    return (
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{ mb: 2, color: darkMode ? "#fff" : "#000", fontWeight: 600 }}
        >
          Options
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <FormLabel
            component="legend"
            sx={{
              fontSize: "0.95rem",
              mb: 2,
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            }}
          >
            {question.options?.filter((o) => o.isCorrect).length > 1
              ? "Multiple correct answers (MOQ)"
              : "Single correct answer (MCQ)"}
          </FormLabel>

          {question.options?.map((option, idx) => {
            return (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Paper
                  elevation={0}
                  sx={{
                    border: "1px solid",
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                    borderRadius: 2,
                    bgcolor: darkMode
                      ? "rgba(255,255,255,0.03)"
                      : "#fafafa",
                    px: 2,
                    py: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: darkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                      color: darkMode
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </Box>
                  <Typography
                    sx={{
                      flex: 1,
                      color: darkMode ? "#fff" : "#222",
                      fontWeight: 400,
                      fontSize: "0.9rem",
                    }}
                  >
                    {option.text}
                  </Typography>
                </Paper>
              </Box>
            );
          })}
        </FormControl>
      </Box>
    );
  };

  // Render boilerplate code for coding questions
  const renderBoilerplateCode = () => {
    const languageData = question?.languages?.find(
      (l) => l.name === selectedLanguage
    );

    return (
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: darkMode ? "#fff" : "#000", fontWeight: 600 }}
          >
            Boilerplate Code
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel
              sx={{
                color: darkMode
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.7)",
              }}
            >
              Language
            </InputLabel>
            <Select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              label="Language"
              sx={{
                color: darkMode ? "#fff" : "#000",
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode
                    ? "rgba(255,255,255,0.4)"
                    : "rgba(0,0,0,0.4)",
                },
              }}
            >
              {question?.languages?.map((lang) => (
                <MenuItem key={lang.name} value={lang.name}>
                  {lang.name.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {languageData?.boilerplateCode ? (
          <Box
            sx={{
              border: `1px solid ${
                darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
              }`,
              borderRadius: "8px",
              overflow: "hidden",
              height: "500px",
            }}
          >
            <Editor
              height="100%"
              language={
                selectedLanguage === "cpp"
                  ? "cpp"
                  : selectedLanguage === "c"
                  ? "c"
                  : selectedLanguage
              }
              value={languageData.boilerplateCode}
              theme={darkMode ? "vs-dark" : "vs-light"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                fontSize: 14,
                lineNumbers: "on",
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </Box>
        ) : (
          <Typography color="textSecondary" sx={{ fontSize: "0.9rem" }}>
            No boilerplate code available for {selectedLanguage.toUpperCase()}.
          </Typography>
        )}
      </Box>
    );
  };

  // Render Solutions tab content - solution code + editorial below
  const renderSolutionsTab = () => {
    const languageData = question?.languages?.find(
      (l) => l.name === selectedLanguage
    );

    return (
      <Box sx={{ p: 3 }}>
        {/* Solution Code Section (only for coding questions) */}
        {question.type === "programming" && (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: darkMode ? "#fff" : "#000", fontWeight: 600 }}
              >
                Solution Code
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.7)",
                  }}
                >
                  Language
                </InputLabel>
                <Select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  label="Language"
                  sx={{
                    color: darkMode ? "#fff" : "#000",
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    },
                  }}
                >
                  {question?.languages?.map((lang) => (
                    <MenuItem key={lang.name} value={lang.name}>
                      {lang.name.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {languageData?.solutionCode ? (
              <Box
                sx={{
                  border: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                  borderRadius: "8px",
                  overflow: "hidden",
                  height: "500px",
                  mb: 4,
                }}
              >
                <Editor
                  height="100%"
                  language={
                    selectedLanguage === "cpp"
                      ? "cpp"
                      : selectedLanguage === "c"
                      ? "c"
                      : selectedLanguage
                  }
                  value={languageData.solutionCode}
                  theme={darkMode ? "vs-dark" : "vs-light"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    fontSize: 14,
                    lineNumbers: "on",
                    automaticLayout: true,
                    padding: { top: 12 },
                  }}
                />
              </Box>
            ) : (
              <Typography
                color="textSecondary"
                sx={{ mb: 4, fontSize: "0.9rem" }}
              >
                Solution code is not available for{" "}
                {selectedLanguage.toUpperCase()}.
              </Typography>
            )}
          </>
        )}

        {/* For MCQ - Show all options with A/B/C/D labels and highlight correct */}
        {question.type === "mcq" && (
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                color: darkMode ? "#fff" : "#000",
                fontWeight: 600,
              }}
            >
              Options
            </Typography>
            {question.options?.map((option, idx) => {
              const label = String.fromCharCode(65 + idx); // A, B, C, D...
              const isCorrect = option.isCorrect === true;
              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: isCorrect
                      ? darkMode
                        ? "rgba(76,175,80,0.1)"
                        : "rgba(76,175,80,0.06)"
                      : darkMode
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)",
                    border: "1px solid",
                    borderColor: isCorrect
                      ? alpha("#4caf50", 0.3)
                      : darkMode
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.08)",
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      bgcolor: isCorrect
                        ? alpha("#4caf50", 0.15)
                        : darkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                      color: isCorrect
                        ? "#4caf50"
                        : darkMode
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.5)",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {label}
                  </Box>
                  <Typography
                    sx={{
                      color: darkMode ? "#fff" : "#222",
                      fontWeight: isCorrect ? 600 : 400,
                      fontSize: "0.9rem",
                      flex: 1,
                    }}
                  >
                    {option.text}
                  </Typography>
                  {isCorrect && (
                    <CheckIcon sx={{ color: "#4caf50", fontSize: "1.1rem", flexShrink: 0 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Editorial Section */}
        <Box
          sx={{
            borderTop: `1px solid ${
              darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
            }`,
            pt: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 2, color: darkMode ? "#fff" : "#000", fontWeight: 600 }}
          >
            Editorial
          </Typography>
          {question?.editorial ? (
            <Box
              className="question-description"
              dangerouslySetInnerHTML={{ __html: question.editorial }}
              sx={{
                ...htmlContentStyles,
                "& a": {
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                },
              }}
            />
          ) : (
            <Typography color="textSecondary">
              Editorial content is not available for this question yet.
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!question) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Question not found</Alert>
      </Box>
    );
  }

  const isMcq = question.type === "mcq";

  return (
    <Box
      sx={{
        display: "flex",
        height: { xs: "calc(100vh - 48px)", sm: "calc(100vh - 64px)" },
        bgcolor: darkMode ? "#0a0b0f" : "#f5f5f5",
        overflow: "hidden",
      }}
    >
      {/* Left Panel - Problem Description with hints, topics, companies */}
      <Box
        sx={{
          width: `${leftPanelWidth}%`,
          height: "100%",
          borderRight: "1px solid",
          borderColor: darkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
          overflow: "auto",
          bgcolor: darkMode ? "#0a0c10" : "#FFFFFF",
          "&::-webkit-scrollbar": { width: "8px" },
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
        {/* Problem Title and Stats */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: darkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {question.title}
            </Typography>
            {renderStatusIcon()}
          </Box>

          {/* Statistics bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              mt: 1.5,
              color: darkMode
                ? "rgba(255,255,255,0.7)"
                : "rgba(0,0,0,0.6)",
              fontSize: "0.75rem",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: "medium",
                  fontSize: "0.75rem",
                  color: darkMode
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(0,0,0,0.5)",
                }}
              >
                Difficulty:
              </Typography>
              <Typography
                component="span"
                sx={{
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  color:
                    question.difficultyLevel === "easy"
                      ? "#4caf50"
                      : question.difficultyLevel === "medium"
                      ? "#ff9800"
                      : "#f44336",
                }}
              >
                {question.difficultyLevel
                  ? question.difficultyLevel.charAt(0).toUpperCase() +
                    question.difficultyLevel.slice(1)
                  : "Medium"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: "medium",
                  fontSize: "0.75rem",
                  color: darkMode
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(0,0,0,0.5)",
                }}
              >
                Accuracy:
              </Typography>
              <Typography
                component="span"
                sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              >
                {question.stats &&
                typeof question.stats.acceptanceRate === "number"
                  ? Math.round(question.stats.acceptanceRate)
                  : "0"}
                %
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: "medium",
                  fontSize: "0.75rem",
                  color: darkMode
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(0,0,0,0.5)",
                }}
              >
                Submissions:
              </Typography>
              <Typography
                component="span"
                sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              >
                {question.stats &&
                typeof question.stats.totalSubmissions === "number"
                  ? question.stats.totalSubmissions
                  : "0"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: "medium",
                  fontSize: "0.75rem",
                  color: darkMode
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(0,0,0,0.5)",
                }}
              >
                Points:
              </Typography>
              <Typography
                component="span"
                sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              >
                {question.marks || 10}
              </Typography>
            </Box>

            {/* Question Type badge */}
            <Chip
              label={isMcq ? "MCQ" : "Coding"}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: "bold",
                bgcolor: isMcq
                  ? alpha("#9c27b0", 0.15)
                  : alpha("#0088cc", 0.15),
                color: isMcq ? "#9c27b0" : "#0088cc",
              }}
            />
          </Box>
        </Box>

        {/* Problem Description */}
        <Box sx={{ p: 2 }}>
          <Box
            className="question-description"
            dangerouslySetInnerHTML={{ __html: question.description }}
            sx={{ ...htmlContentStyles, mb: 3 }}
          />

          {/* Hints Section */}
          {question.hints && question.hints.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                  color: darkMode ? "#fff" : "#000",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                }}
              >
                <LightbulbOutlinedIcon sx={{ mr: 1, color: "#FFD700" }} />
                Hints:
              </Typography>

              {question.hints.map((hint, index) => (
                <Accordion
                  key={index}
                  sx={{
                    mb: 1,
                    bgcolor: darkMode
                      ? "rgba(255, 215, 0, 0.05)"
                      : "rgba(255, 215, 0, 0.1)",
                    border: "0px solid",
                    borderColor: "#FFD700",
                    borderRadius: "4px",
                    "&:before": { display: "none" },
                    "& .MuiAccordionSummary-root": {
                      minHeight: "48px",
                      "&.Mui-expanded": { minHeight: "48px" },
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreIcon sx={{ color: "#FFD700" }} />
                    }
                    sx={{
                      flexDirection: "row",
                      "& .MuiAccordionSummary-content": {
                        margin: "12px 0",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LightbulbIcon
                        sx={{
                          mr: 1,
                          color: "#FFD700",
                          fontSize: "1.1rem",
                        }}
                      />
                      <Typography
                        sx={{
                          fontWeight: "medium",
                          color: darkMode ? "#FFD700" : "#B8860B",
                        }}
                      >
                        Hint {index + 1}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
                    <Typography
                      sx={{
                        color: darkMode
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(0,0,0,0.85)",
                      }}
                    >
                      {hint}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Topics & Companies Section */}
          <Box sx={{ mb: 3 }}>
            {/* Topics Accordion */}
            <Accordion
              sx={{
                mb: 1,
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                border: "0px solid",
                borderColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
                borderRadius: "4px",
                "&:before": { display: "none" },
                "& .MuiAccordionSummary-root": {
                  minHeight: "48px",
                  "&.Mui-expanded": { minHeight: "48px" },
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  flexDirection: "row",
                  "& .MuiAccordionSummary-content": {
                    margin: "12px 0",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CategoryIcon sx={{ mr: 1, fontSize: "1.1rem" }} />
                  <Typography
                    sx={{
                      fontWeight: "medium",
                      color: darkMode
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Topics
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
                {question.tags && question.tags.length > 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.7,
                    }}
                  >
                    {question.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        sx={{
                          height: "24px",
                          fontSize: "0.75rem",
                          bgcolor: darkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.8)",
                          border: "1px solid",
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.15)",
                          mb: 0.5,
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    No topics available for this question.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Companies Accordion */}
            <Accordion
              sx={{
                mb: 1,
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                border: "0px solid",
                borderColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
                borderRadius: "4px",
                "&:before": { display: "none" },
                "& .MuiAccordionSummary-root": {
                  minHeight: "48px",
                  "&.Mui-expanded": { minHeight: "48px" },
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  flexDirection: "row",
                  "& .MuiAccordionSummary-content": {
                    margin: "12px 0",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <BusinessIcon sx={{ mr: 1, fontSize: "1.1rem" }} />
                  <Typography
                    sx={{
                      fontWeight: "medium",
                      color: darkMode
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Companies
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
                {question.companies &&
                question.companies.length > 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.7,
                    }}
                  >
                    {question.companies.map((company, index) => (
                      <Chip
                        key={index}
                        label={company}
                        size="small"
                        sx={{
                          height: "24px",
                          fontSize: "0.75rem",
                          bgcolor: darkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.8)",
                          border: "1px solid",
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.15)",
                          mb: 0.5,
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    No company tags available for this question.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </Box>

      {/* Resizer */}
      <Box
        sx={{
          width: "4px",
          bgcolor: darkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
          cursor: "col-resize",
          "&:hover": {
            bgcolor: theme.palette.primary.main,
          },
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = leftPanelWidth;

          const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const newWidth =
              startWidth + (deltaX / window.innerWidth) * 100;
            setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 70));
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }}
      />

      {/* Right Panel */}
      <Box
        sx={{
          width: `${100 - leftPanelWidth}%`,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: darkMode ? "#0a0c10" : "#FFFFFF",
        }}
      >
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            mt: 2,
            borderBottom: "1px solid",
            borderColor: darkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
            bgcolor: darkMode ? "#1a1d24" : "#f5f5f5",
            "& .MuiTab-root": {
              color: darkMode
                ? "rgba(255,255,255,0.6)"
                : "rgba(0,0,0,0.6)",
              fontWeight: "bold",
              textTransform: "none",
              fontSize: "0.875rem",
            },
            "& .Mui-selected": {
              color: theme.palette.primary.main,
            },
          }}
        >
          <Tab label={isMcq ? "Options" : "Boilerplate Code"} />
          <Tab label="Solutions" />
          <Tab label="Submissions" />
          <Tab label="Report" />
        </Tabs>

        {/* Tab Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            "&::-webkit-scrollbar": { width: "8px" },
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
          {/* Tab 0: Boilerplate / Options */}
          {activeTab === 0 &&
            (isMcq ? renderMcqOptions() : renderBoilerplateCode())}

          {/* Tab 1: Solutions + Editorial */}
          {activeTab === 1 && renderSolutionsTab()}

          {/* Tab 2: Submissions */}
          {activeTab === 2 && (
            <SubmissionsPanel
              submissions={[]}
              allUsersSubmissions={allUsersSubmissions}
              darkMode={darkMode}
              formatTime={formatTime}
              formatMemory={formatMemory}
              user={user}
              teacherView={true}
              questionType={question.type}
              questionOptions={question.options}
            />
          )}

          {/* Tab 3: Report */}
          {activeTab === 3 && (
            <QuestionReport
              cohortId={cohortId}
              moduleId={moduleId}
              questionId={questionId}
              darkMode={darkMode}
              user={user}
              teacherView={true}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherQuestionView;
