import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  tableCellClasses,
  styled,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TableSortLabel,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CodeIcon from "@mui/icons-material/Code";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TimerIcon from "@mui/icons-material/Timer";
import MemoryIcon from "@mui/icons-material/Memory";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DataObjectIcon from "@mui/icons-material/DataObject";
import BugReportIcon from "@mui/icons-material/BugReport";
import FilterListIcon from "@mui/icons-material/FilterList";
import Editor from "@monaco-editor/react";

// TabPanel component for the submission tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`submissions-tabpanel-${index}`}
      aria-labelledby={`submissions-tab-${index}`}
      {...other}
      style={{ height: "100%" }}
    >
      {value === index && <Box sx={{ height: "100%" }}>{children}</Box>}
    </div>
  );
}

// Styled components for enhanced table
const StyledTableCell = styled(TableCell, { shouldForwardProp: (prop) => prop !== 'darkMode' })(({ theme, darkMode }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: darkMode ? "#1A1A1A" : "#f5f5f5",
    color: darkMode ? "#fff" : theme.palette.common.black,
    fontWeight: "bold",
    fontSize: "0.75rem",
    padding: "10px 16px",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: "0.75rem",
    padding: "10px 16px",
    borderBottom: darkMode
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(0, 0, 0, 0.08)",
  },
}));

const StyledTableRow = styled(TableRow, { shouldForwardProp: (prop) => prop !== 'darkMode' })(({ theme, darkMode }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: darkMode
      ? "rgba(255, 255, 255, 0.02)"
      : "rgba(0, 0, 0, 0.02)",
  },
  "&:hover": {
    backgroundColor: darkMode
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.04)",
    cursor: "pointer",
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const StatusChip = styled(Chip, { shouldForwardProp: (prop) => prop !== 'darkMode' && prop !== 'status' })(({ theme, status, darkMode }) => ({
  borderRadius: "12px",
  backgroundColor:
    status === "accepted"
      ? darkMode
        ? "rgba(46, 125, 50, 0.15)"
        : "rgba(46, 125, 50, 0.1)"
      : status === "pending"
      ? darkMode
        ? "rgba(255, 152, 0, 0.15)"
        : "rgba(255, 152, 0, 0.1)"
      : darkMode
      ? "rgba(211, 47, 47, 0.15)"
      : "rgba(211, 47, 47, 0.1)",
  color:
    status === "accepted"
      ? "#2e7d32"
      : status === "pending"
      ? "#ff9800"
      : "#d32f2f",
  border: `1px solid ${
    status === "accepted"
      ? "rgba(46, 125, 50, 0.5)"
      : status === "pending"
      ? "rgba(255, 152, 0, 0.5)"
      : "rgba(211, 47, 47, 0.5)"
  }`,
  fontSize: "0.65rem",
  height: "20px",
  fontWeight: "medium",
}));

// Submission Details View Component
const SubmissionDetailsView = ({
  submission,
  onBack,
  darkMode,
  formatTime,
  formatMemory,
  copyToClipboard,
  isPersonalSubmission = true,
  questionType = null,
  questionOptions = [],
}) => {
  const isMcqSubmission = questionType === "mcq" || submission.submissionType === "mcq";

  // Resolve selected option text from questionOptions
  const getSelectedOptionInfo = () => {
    if (!isMcqSubmission || !submission.selectedOption || !questionOptions?.length) return null;
    const optionIndex = questionOptions.findIndex(
      (opt) => opt._id === submission.selectedOption || opt._id?.toString() === submission.selectedOption?.toString()
    );
    if (optionIndex === -1) return null;
    const option = questionOptions[optionIndex];
    return {
      text: option.text,
      label: String.fromCharCode(65 + optionIndex), // A, B, C, D
      isCorrect: option.isCorrect,
    };
  };
  const selectedOptionInfo = getSelectedOptionInfo();

  // Helper functions for data access
  const getTimeValue = (submission) => {
    // Check all possible time fields in order of priority
    if (submission.executionTime !== undefined && submission.executionTime !== null) {
      return submission.executionTime;
    }
    if (submission.maxExecutionTime !== undefined && submission.maxExecutionTime !== null) {
      return submission.maxExecutionTime;
    }
    if (submission.time !== undefined && submission.time !== null) {
      return submission.time;
    }
    return 0;
  };

  const getMemoryValue = (submission) => {
    // Check all possible memory fields in order of priority
    if (submission.memoryUsed !== undefined && submission.memoryUsed !== null) {
      return submission.memoryUsed;
    }
    if (submission.maxMemoryUsed !== undefined && submission.maxMemoryUsed !== null) {
      return submission.maxMemoryUsed;
    }
    if (submission.memory !== undefined && submission.memory !== null) {
      return submission.memory;
    }
    return 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "#2e7d32";
      case "pending":
        return "#ff9800";
      default:
        return "#d32f2f";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckIcon fontSize="small" />;
      case "pending":
        return <HistoryIcon fontSize="small" />;
      default:
        return <CloseIcon fontSize="small" />;
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        overflow: "hidden",
      }}
    >
      {/* Header with back button and user profile */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1.5,
          pb: 1,
          borderBottom: "1px solid",
          borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        }}
      >
        <IconButton
          onClick={onBack}
          sx={{
            mr: 1,
            color: darkMode ? "#fff" : "#000",
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: darkMode ? "#fff" : "#000",
            fontSize: "1.1rem",
          }}
        >
          Submission Details
        </Typography>

        {/* User profile */}
        {submission.user && typeof submission.user === 'object' && (
          <Box
            onClick={() => {
              // Use rollNumber or email prefix for user-view route
              const userIdentifier = submission.user?.rollNumber || 
                submission.user?.email?.split('@')[0] || 
                submission.user?.username;
              if (userIdentifier) {
                window.open(`/user-view/${userIdentifier}`, '_blank');
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: "auto",
              flexShrink: 0,
              cursor: "pointer",
              px: 1.5,
              py: 0.5,
              borderRadius: "20px",
              zIndex: 1,
              position: "relative",
              backgroundColor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              "&:hover": {
                backgroundColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              },
              transition: "background-color 0.2s",
            }}
          >
            <Avatar
              src={submission.user?.avatar}
              sx={{
                width: 28,
                height: 28,
                fontSize: "0.75rem",
                backgroundColor: darkMode ? "rgba(0,136,204,0.3)" : "rgba(0,136,204,0.15)",
                color: darkMode ? "#0088CC" : "#0077b6",
              }}
            >
              {submission.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                fontSize: "0.85rem",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {submission.user?.name || "Unknown"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Compact Submission Metrics - inline row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2.5,
          mb: 1.5,
          flexWrap: "wrap",
        }}
      >
        {/* Status */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {getStatusIcon(submission.status)}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: getStatusColor(submission.status),
              fontSize: "0.8rem",
            }}
          >
            {submission.status === "accepted"
              ? "Accepted"
              : submission.status === "pending"
              ? "Pending"
              : submission.status
              ? submission.status
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())
              : "Unknown"}
          </Typography>
        </Box>

        <Box sx={{ width: "1px", height: 16, backgroundColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />

        {/* Score */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <DataObjectIcon sx={{ fontSize: 16, color: darkMode ? "#FFD700" : "#B8860B" }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: darkMode ? "#FFD700" : "#B8860B",
              fontSize: "0.8rem",
            }}
          >
            {submission.score || 0}
          </Typography>
        </Box>

        {!isMcqSubmission && (
          <>
            <Box sx={{ width: "1px", height: 16, backgroundColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />

            {/* Execution Time */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <TimerIcon sx={{ fontSize: 16, color: "#0088CC" }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#0088CC", fontSize: "0.8rem" }}
              >
                {formatTime
                  ? formatTime(getTimeValue(submission))
                  : `${getTimeValue(submission)}ms`}
              </Typography>
            </Box>

            <Box sx={{ width: "1px", height: 16, backgroundColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />

            {/* Memory */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MemoryIcon sx={{ fontSize: 16, color: "#ed6c02" }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#ed6c02", fontSize: "0.8rem" }}
              >
                {formatMemory
                  ? formatMemory(getMemoryValue(submission))
                  : `${getMemoryValue(submission)}KB`}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Code Section */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
      {/* Code Section - Only for programming questions */}
      {!isMcqSubmission && (
        <Paper
          sx={{
            backgroundColor: darkMode ? "#121212" : "#fff",
            boxShadow: darkMode
              ? "0 2px 8px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid",
              borderColor: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CodeIcon sx={{ fontSize: 20 }} />
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, fontSize: "0.9rem" }}
              >
                Submitted Code
              </Typography>
              <Chip
                size="small"
                label={submission.language?.toUpperCase() || "N/A"}
                sx={{
                  backgroundColor: darkMode
                    ? "rgba(0, 136, 204, 0.1)"
                    : "rgba(0, 136, 204, 0.08)",
                  color: darkMode ? "#0088CC" : "#0077b6",
                  border: "1px solid",
                  borderColor: "rgba(0, 136, 204, 0.2)",
                  height: "22px",
                  fontSize: "0.7rem",
                  fontWeight: "medium",
                }}
              />
            </Box>
            <Tooltip title="Copy code">
              <IconButton
                size="small"
                onClick={() => copyToClipboard(submission.code || "")}
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 300 }}>
            <Editor
              height="100%"
              language={
                submission.language === "cpp" ? "cpp" : submission.language
              }
              value={submission.code || "// No code available"}
              theme={darkMode ? "vs-dark" : "vs-light"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                fontSize: 14,
                lineNumbers: "on",
                automaticLayout: true,
              }}
            />
          </Box>
        </Paper>
      )}

      {/* MCQ Answer Section - Only for MCQ questions */}
      {isMcqSubmission && (
        <Paper
          sx={{
            backgroundColor: darkMode ? "#121212" : "#fff",
            boxShadow: darkMode
              ? "0 2px 8px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            p: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 20, color: darkMode ? "#fff" : "#000" }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, fontSize: "0.9rem" }}
            >
              MCQ Submission
            </Typography>
          </Box>

          {/* Selected Option */}
          {selectedOptionInfo && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                mb: 1.5,
                borderRadius: "8px",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  bgcolor: selectedOptionInfo.isCorrect
                    ? "rgba(46, 125, 50, 0.15)"
                    : "rgba(211, 47, 47, 0.15)",
                  color: selectedOptionInfo.isCorrect ? "#2e7d32" : "#d32f2f",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                {selectedOptionInfo.label}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "#fff" : "#222",
                  fontSize: "0.9rem",
                }}
              >
                {selectedOptionInfo.text}
              </Typography>
            </Box>
          )}

          {/* Result */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              borderRadius: "8px",
              backgroundColor: submission.isCorrect || submission.status === "accepted"
                ? darkMode
                  ? "rgba(46, 125, 50, 0.1)"
                  : "rgba(46, 125, 50, 0.05)"
                : darkMode
                ? "rgba(211, 47, 47, 0.1)"
                : "rgba(211, 47, 47, 0.05)",
              border: "1px solid",
              borderColor: submission.isCorrect || submission.status === "accepted"
                ? "rgba(46, 125, 50, 0.3)"
                : "rgba(211, 47, 47, 0.3)",
            }}
          >
            {submission.isCorrect || submission.status === "accepted" ? (
              <CheckIcon sx={{ color: "#2e7d32" }} />
            ) : (
              <CloseIcon sx={{ color: "#d32f2f" }} />
            )}
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: submission.isCorrect || submission.status === "accepted" ? "#2e7d32" : "#d32f2f",
              }}
            >
              {submission.isCorrect || submission.status === "accepted" ? "Correct Answer" : "Wrong Answer"}
            </Typography>
          </Box>
          {submission.submittedAt && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 2,
                color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              Submitted at: {new Date(submission.submittedAt).toLocaleString()}
            </Typography>
          )}
        </Paper>
      )}
      </Box>

      {/* Test Case Results - Show for all submissions that have test case data */}
      {!isMcqSubmission && submission.testCaseResults &&
        submission.testCaseResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Accordion
              sx={{
                backgroundColor: darkMode ? "#121212" : "#fff",
                boxShadow: darkMode
                  ? "0 2px 8px rgba(0,0,0,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.1)",
                borderRadius: "8px",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: darkMode ? "#fff" : "#000" }} />
                }
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BugReportIcon sx={{ fontSize: 20 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, fontSize: "0.9rem" }}
                  >
                    Test Case Results (
                    {submission.testCaseSummary 
                      ? `${submission.testCaseSummary.passed}/${submission.testCaseSummary.total}` 
                      : `${submission.testCaseResults.filter((tc) => tc.passed).length}/${submission.testCaseResults.length}`} passed)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  pb: 3,
                  maxHeight: "400px", // Add max height
                  overflowY: "auto", // Enable vertical scrolling
                  overflowX: "hidden", // Hide horizontal overflow
                }}
              >
                <Grid container spacing={2}>
                  {submission.testCaseResults.map((testCase, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        sx={{
                          backgroundColor: testCase.passed
                            ? darkMode
                              ? "rgba(46, 125, 50, 0.1)"
                              : "rgba(46, 125, 50, 0.05)"
                            : darkMode
                            ? "rgba(211, 47, 47, 0.1)"
                            : "rgba(211, 47, 47, 0.05)",
                          border: "1px solid",
                          borderColor: testCase.passed
                            ? "rgba(46, 125, 50, 0.3)"
                            : "rgba(211, 47, 47, 0.3)",
                          borderRadius: "6px",
                        }}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: "medium", fontSize: "0.75rem" }}
                            >
                              Test Case {index + 1}
                            </Typography>
                            <Chip
                              size="small"
                              icon={
                                testCase.passed ? (
                                  <CheckIcon fontSize="small" />
                                ) : (
                                  <CloseIcon fontSize="small" />
                                )
                              }
                              label={testCase.passed ? "Passed" : "Failed"}
                              sx={{
                                backgroundColor: "transparent",
                                color: testCase.passed ? "#2e7d32" : "#d32f2f",
                                border: "none",
                                height: "18px",
                                fontSize: "0.65rem",
                                fontWeight: "medium",
                              }}
                            />
                          </Box>
                          {testCase.executionTime && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.7rem",
                                color: darkMode
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.6)",
                                display: "block",
                              }}
                            >
                              Time:{" "}
                              {formatTime
                                ? formatTime(testCase.executionTime)
                                : `${testCase.executionTime}ms`}
                            </Typography>
                          )}
                          {testCase.memoryUsed && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.7rem",
                                color: darkMode
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.6)",
                                display: "block",
                              }}
                            >
                              Memory:{" "}
                              {formatMemory
                                ? formatMemory(testCase.memoryUsed)
                                : `${testCase.memoryUsed}KB`}
                            </Typography>
                          )}
                          {testCase.error && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.7rem",
                                color: "#d32f2f",
                                display: "block",
                                mt: 0.5,
                                fontFamily: "monospace",
                                wordBreak: "break-word",
                              }}
                            >
                              Error: {testCase.error}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
    </Box>
  );
};

// Stats card component
const StatsCard = ({ number, label, icon, color, darkMode }) => (
  <Card
    sx={{
      height: "100%",
      backgroundColor: darkMode ? "#1A1A1A" : "#fff",
      boxShadow: darkMode
        ? "0 1px 4px rgba(0,0,0,0.3)"
        : "0 1px 4px rgba(0,0,0,0.1)",
    }}
  >
    <CardContent sx={{ p: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: color,
              fontSize: "1.2rem",
              lineHeight: 1.2,
            }}
          >
            {number}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: "0.7rem",
              display: "block",
              color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            }}
          >
            {label}
          </Typography>
        </Box>
        <Box
          sx={{
            color: color,
            opacity: 0.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SubmissionsPanel = ({
  submissions = [],
  allUsersSubmissions = [],
  darkMode,
  formatTime,
  formatMemory,
  user = null,
  teacherView = false,
  onLoadAllUsersSubmissions = null,
  questionType = null,
  questionOptions = [],
}) => {
  const [tabValue, setTabValue] = useState(teacherView ? 1 : 0); // Default to "All Users" tab for teacher view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [allUsersLoaded, setAllUsersLoaded] = useState(false); // Track if all users data has been loaded

  // Sorting and filtering state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Check if user is admin or teacher
  const isAdminOrTeacher =
    user && (user.userType === "admin" || user.userType === "teacher");

  // Determine if this is an MCQ question
  const isMcq = questionType === "mcq";

  // Helper function to get time value with fallback
  const getTimeValue = (submission) => {
    // Check all possible time fields in order of priority
    if (submission.executionTime !== undefined && submission.executionTime !== null) {
      return submission.executionTime;
    }
    if (submission.maxExecutionTime !== undefined && submission.maxExecutionTime !== null) {
      return submission.maxExecutionTime;
    }
    if (submission.time !== undefined && submission.time !== null) {
      return submission.time;
    }
    return 0;
  };

  // Helper function to get memory value with fallback
  const getMemoryValue = (submission) => {
    // Check all possible memory fields in order of priority
    if (submission.memoryUsed !== undefined && submission.memoryUsed !== null) {
      return submission.memoryUsed;
    }
    if (submission.maxMemoryUsed !== undefined && submission.maxMemoryUsed !== null) {
      return submission.maxMemoryUsed;
    }
    if (submission.memory !== undefined && submission.memory !== null) {
      return submission.memory;
    }
    return 0;
  };

  // Reset error when props change
  useEffect(() => {
    setError(null);
  }, [submissions, allUsersSubmissions]);

  // Reset submission details when switching tabs or when submissions change
  useEffect(() => {
    setSelectedSubmission(null);
    setShowSubmissionDetails(false);
    // Reset filters when switching tabs
    setSortField(null);
    setSortDirection("asc");
    setLanguageFilter("all");
    setStatusFilter("all");
  }, [tabValue, submissions, allUsersSubmissions]);

  const handleTabChange = (event, newValue) => {
    // Prevent switching to "All Users" tab if user hasn't solved the question
    // Exception: Admins and teachers can always switch
    if (newValue === 1 && !hasAcceptedSubmission) {
      return;
    }

    // Load all users' submissions when "All Users" tab is clicked for the first time
    if (newValue === 1 && !allUsersLoaded && onLoadAllUsersSubmissions) {
      onLoadAllUsersSubmissions();
      setAllUsersLoaded(true);
    }

    setTabValue(newValue);
  };

  // Handle submission click
  const handleSubmissionClick = (submission) => {
    setSelectedSubmission(submission);
    setShowSubmissionDetails(true);
  };

  // Handle back to submissions list
  const handleBackToSubmissions = () => {
    setSelectedSubmission(null);
    setShowSubmissionDetails(false);
  };

  // Copy code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast here if needed
    });
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        // Reset to default order (by submission time)
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and filtered submissions
  const getSortedAndFilteredSubmissions = (submissionList) => {
    let filtered = submissionList;

    // Apply filters
    if (languageFilter !== "all") {
      filtered = filtered.filter((sub) => sub.language === languageFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;

        if (sortField === "time") {
          aVal = getTimeValue(a);
          bVal = getTimeValue(b);
        } else if (sortField === "memory") {
          aVal = getMemoryValue(a);
          bVal = getMemoryValue(b);
        } else {
          return 0;
        }

        if (sortDirection === "asc") {
          return aVal - bVal;
        } else {
          return bVal - aVal;
        }
      });
    } else {
      // Default sort by submission time (newest first)
      filtered = [...filtered].sort((a, b) => {
        const aTime = new Date(a.submittedAt || 0);
        const bTime = new Date(b.submittedAt || 0);
        return bTime - aTime;
      });
    }

    return filtered;
  };

  // Get unique languages and statuses for filter options
  const getFilterOptions = (submissionList) => {
    const languages = [
      ...new Set(submissionList.map((sub) => sub.language).filter(Boolean)),
    ];
    const statuses = [
      ...new Set(submissionList.map((sub) => sub.status).filter(Boolean)),
    ];
    return { languages, statuses };
  };

  // Get filtered and sorted data
  const filteredAllUsersSubmissions =
    getSortedAndFilteredSubmissions(allUsersSubmissions);
  const filterOptions = getFilterOptions(allUsersSubmissions);

  // Calculate stats for all users submissions (using filtered data for display)
  const allUsersAcceptedCount = filteredAllUsersSubmissions.filter(
    (sub) => sub.status === "accepted"
  ).length;
  const allUsersAcceptedPercentage =
    filteredAllUsersSubmissions.length > 0
      ? Math.round(
          (allUsersAcceptedCount / filteredAllUsersSubmissions.length) * 100
        )
      : 0;

  // Calculate stats for personal submissions
  const acceptedCount = submissions.filter(
    (sub) => sub.status === "accepted"
  ).length;
  const acceptedPercentage =
    submissions.length > 0
      ? Math.round((acceptedCount / submissions.length) * 100)
      : 0;

  // Check if user has solved the question (has at least one accepted submission)
  // Admins and teachers can always view all submissions without solving
  const hasAcceptedSubmission = isAdminOrTeacher || acceptedCount > 0;

  // For the progress bar color
  const progressColor =
    acceptedPercentage >= 80
      ? "#2e7d32"
      : acceptedPercentage >= 50
      ? "#ed6c02"
      : "#d32f2f";

  // Personal submissions table view
  const renderPersonalTableView = () => (
    <TableContainer
      component={Paper}
      sx={{
        mt: 1.5,
        mb: 3,
        backgroundColor: darkMode ? "#121212" : "#fff",
        boxShadow: darkMode
          ? "0 2px 6px rgba(0,0,0,0.3)"
          : "0 2px 6px rgba(0,0,0,0.1)",
        borderRadius: "6px",
        overflow: "auto",
        maxHeight: "calc(100vh - 300px)",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "25%" : "20%"}>
              Status
            </StyledTableCell>
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="20%">
                Language
              </StyledTableCell>
            )}
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "20%" : "20%"}>
              Score
            </StyledTableCell>
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="15%">
                Max Time
              </StyledTableCell>
            )}
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="15%">
                Max Memory
              </StyledTableCell>
            )}
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "50%" : "40%"}>
              Submitted At
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {submissions.map((submission, index) => (
            <StyledTableRow
              key={index}
              darkMode={darkMode}
              onClick={() => handleSubmissionClick(submission)}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: darkMode
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                },
              }}
            >
              <StyledTableCell darkMode={darkMode} align="center">
                <StatusChip
                  size="small"
                  icon={
                    submission.status === "accepted" ? (
                      <CheckIcon fontSize="small" />
                    ) : submission.status === "pending" ? (
                      <HistoryIcon fontSize="small" />
                    ) : (
                      <CloseIcon fontSize="small" />
                    )
                  }
                  label={
                    submission.status === "accepted"
                      ? "Accepted"
                      : submission.status === "pending"
                      ? "Pending"
                      : submission.status
                      ? submission.status.replace("_", " ")
                      : "Unknown"
                  }
                  status={
                    submission.status === "accepted"
                      ? "accepted"
                      : submission.status === "pending"
                      ? "pending"
                      : "failed"
                  }
                  darkMode={darkMode}
                />
              </StyledTableCell>
              {!isMcq && (
                <StyledTableCell darkMode={darkMode} align="center">
                  <Chip
                    size="small"
                    label={submission.language?.toUpperCase() || "N/A"}
                    sx={{
                      backgroundColor: darkMode
                        ? "rgba(0, 136, 204, 0.1)"
                        : "rgba(0, 136, 204, 0.08)",
                      color: darkMode ? "#0088CC" : "#0077b6",
                      border: "1px solid",
                      borderColor: "rgba(0, 136, 204, 0.2)",
                      height: "20px",
                      fontSize: "0.65rem",
                      fontWeight: "medium",
                    }}
                  />
                </StyledTableCell>
              )}
              <StyledTableCell
                darkMode={darkMode}
                align="center"
                sx={{
                  fontWeight: "medium",
                  color: darkMode ? "#FFD700" : "#B8860B",
                  fontSize: "0.75rem",
                }}
              >
                {submission.score || 0}
              </StyledTableCell>
              {!isMcq && (
                <StyledTableCell
                  darkMode={darkMode}
                  align="center"
                  sx={{ fontSize: "0.75rem" }}
                >
                  {formatTime
                    ? formatTime(getTimeValue(submission))
                    : `${getTimeValue(submission)}ms`}
                </StyledTableCell>
              )}
              {!isMcq && (
                <StyledTableCell
                  darkMode={darkMode}
                  align="center"
                  sx={{ fontSize: "0.75rem" }}
                >
                  {formatMemory
                    ? formatMemory(getMemoryValue(submission))
                    : `${getMemoryValue(submission)}KB`}
                </StyledTableCell>
              )}
              <StyledTableCell
                darkMode={darkMode}
                align="center"
                sx={{ fontSize: "0.75rem" }}
              >
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString()
                  : "N/A"}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // All users submissions table view
  const renderAllUsersTableView = () => (
    <TableContainer
      component={Paper}
      sx={{
        mt: 1.5,
        mb: 3,
        backgroundColor: darkMode ? "#121212" : "#fff",
        boxShadow: darkMode
          ? "0 2px 6px rgba(0,0,0,0.3)"
          : "0 2px 6px rgba(0,0,0,0.1)",
        borderRadius: "6px",
        overflow: "auto",
        maxHeight: "calc(100vh - 300px)",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "35%" : "20%"}>
              User
            </StyledTableCell>
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "20%" : "15%"}>
              Status
            </StyledTableCell>
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="15%">
                Language
              </StyledTableCell>
            )}
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "10%" : "10%"}>
              Score
            </StyledTableCell>
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="15%">
                <TableSortLabel
                  active={sortField === "time"}
                  direction={sortField === "time" ? sortDirection : "asc"}
                  onClick={() => handleSort("time")}
                  sx={{
                    color: darkMode ? "#fff" : "#000",
                    "&.Mui-active": {
                      color: darkMode ? "#fff" : "#000",
                    },
                    "& .MuiTableSortLabel-icon": {
                      color: darkMode ? "#fff !important" : "#000 !important",
                    },
                  }}
                >
                  Max Time
                </TableSortLabel>
              </StyledTableCell>
            )}
            {!isMcq && (
              <StyledTableCell darkMode={darkMode} align="center" width="15%">
                <TableSortLabel
                  active={sortField === "memory"}
                  direction={sortField === "memory" ? sortDirection : "asc"}
                  onClick={() => handleSort("memory")}
                  sx={{
                    color: darkMode ? "#fff" : "#000",
                    "&.Mui-active": {
                      color: darkMode ? "#fff" : "#000",
                    },
                    "& .MuiTableSortLabel-icon": {
                      color: darkMode ? "#fff !important" : "#000 !important",
                    },
                  }}
                >
                  Max Memory
                </TableSortLabel>
              </StyledTableCell>
            )}
            <StyledTableCell darkMode={darkMode} align="center" width={isMcq ? "35%" : "30%"}>
              Submitted At
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAllUsersSubmissions.map((submission, index) => (
            <StyledTableRow
              key={index}
              darkMode={darkMode}
              onClick={() => handleSubmissionClick(submission)}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: darkMode
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                },
              }}
            >
              <StyledTableCell darkMode={darkMode} align="center">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      fontSize: "0.7rem",
                      backgroundColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      color: darkMode ? "#fff" : "#000",
                    }}
                  >
                    {submission.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </Avatar>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      color: darkMode
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(0,0,0,0.8)",
                    }}
                  >
                    {submission.user?.name || "Unknown"}
                  </Typography>
                </Box>
              </StyledTableCell>
              <StyledTableCell darkMode={darkMode} align="center">
                <StatusChip
                  size="small"
                  icon={
                    submission.status === "accepted" ? (
                      <CheckIcon fontSize="small" />
                    ) : submission.status === "pending" ? (
                      <HistoryIcon fontSize="small" />
                    ) : (
                      <CloseIcon fontSize="small" />
                    )
                  }
                  label={
                    submission.status === "accepted"
                      ? "Accepted"
                      : submission.status === "pending"
                      ? "Pending"
                      : submission.status
                      ? submission.status.replace("_", " ")
                      : "Unknown"
                  }
                  status={
                    submission.status === "accepted"
                      ? "accepted"
                      : submission.status === "pending"
                      ? "pending"
                      : "failed"
                  }
                  darkMode={darkMode}
                />
              </StyledTableCell>
              {!isMcq && (
                <StyledTableCell darkMode={darkMode} align="center">
                  <Chip
                    size="small"
                    label={submission.language?.toUpperCase() || "N/A"}
                    sx={{
                      backgroundColor: darkMode
                        ? "rgba(0, 136, 204, 0.1)"
                        : "rgba(0, 136, 204, 0.08)",
                      color: darkMode ? "#0088CC" : "#0077b6",
                      border: "1px solid",
                      borderColor: "rgba(0, 136, 204, 0.2)",
                      height: "20px",
                      fontSize: "0.65rem",
                      fontWeight: "medium",
                    }}
                  />
                </StyledTableCell>
              )}
              <StyledTableCell
                darkMode={darkMode}
                align="center"
                sx={{
                  fontWeight: "medium",
                  color: darkMode ? "#FFD700" : "#B8860B",
                  fontSize: "0.75rem",
                }}
              >
                {submission.score || 0}
              </StyledTableCell>
              {!isMcq && (
                <StyledTableCell
                  darkMode={darkMode}
                  align="center"
                  sx={{ fontSize: "0.75rem" }}
                >
                  {formatTime
                    ? formatTime(getTimeValue(submission))
                    : `${getTimeValue(submission)}ms`}
                </StyledTableCell>
              )}
              {!isMcq && (
                <StyledTableCell
                  darkMode={darkMode}
                  align="center"
                  sx={{ fontSize: "0.75rem" }}
                >
                  {formatMemory
                    ? formatMemory(getMemoryValue(submission))
                    : `${getMemoryValue(submission)}KB`}
                </StyledTableCell>
              )}
              <StyledTableCell
                darkMode={darkMode}
                align="center"
                sx={{ fontSize: "0.75rem" }}
              >
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString()
                  : "N/A"}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Error handling
  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <Alert severity="error" sx={{ width: "100%", maxWidth: 500 }}>
          Error loading submissions: {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Please try refreshing the page or contact support if the issue
          persists.
        </Typography>
      </Box>
    );
  }

  // Show submission details if selected
  if (showSubmissionDetails && selectedSubmission) {
    // Check if this is a personal submission (from My Submissions tab)
    const isPersonalSubmission = tabValue === 0;

    return (
      <SubmissionDetailsView
        submission={selectedSubmission}
        onBack={handleBackToSubmissions}
        darkMode={darkMode}
        formatTime={formatTime}
        formatMemory={formatMemory}
        copyToClipboard={copyToClipboard}
        isPersonalSubmission={isPersonalSubmission}
        questionType={questionType}
        questionOptions={questionOptions}
      />
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        pb: 3, // Added bottom padding
        overflow: "hidden",
      }}
    >
      {/* Tabs for My Submissions vs All Submissions - Hide in teacher view */}
      {!teacherView && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              minHeight: "40px",
              "& .MuiTab-root": {
                minWidth: "auto",
                px: 2,
                py: 1,
                fontSize: "0.8rem",
                textTransform: "none",
                fontWeight: "medium",
                color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                minHeight: "40px",
              },
              "& .Mui-selected": {
                color: darkMode ? "#fff" : "#0088CC",
              },
              "& .MuiTabs-indicator": {
                height: 2,
              },
              "& .Mui-disabled": {
                color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                opacity: 0.5,
              },
            }}
          >
            <Tab
              icon={<PersonIcon sx={{ fontSize: 18, mr: 0.5 }} />}
              label="My Submissions"
              iconPosition="start"
            />
            <Tab
              icon={<GroupIcon sx={{ fontSize: 18, mr: 0.5 }} />}
              label="All Users"
              iconPosition="start"
              disabled={!hasAcceptedSubmission}
              title={
                !hasAcceptedSubmission
                  ? "Solve this question to view other users' submissions"
                  : ""
              }
            />
          </Tabs>

          {/* Info message when All Users tab is disabled (only for students) */}
          {!hasAcceptedSubmission && !isAdminOrTeacher && (
            <Alert
              severity="info"
              sx={{
                mt: 2,
                backgroundColor: darkMode
                  ? "rgba(33, 150, 243, 0.1)"
                  : "rgba(33, 150, 243, 0.08)",
                color: darkMode ? "#42a5f5" : "#1565c0",
                border: "1px solid",
                borderColor: "rgba(33, 150, 243, 0.3)",
                fontSize: "0.85rem",
                "& .MuiAlert-icon": {
                  color: darkMode ? "#42a5f5" : "#1565c0",
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                <strong>Solve this question first!</strong> The "All Users" tab
                will be unlocked once you submit an accepted solution.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* In teacher view, skip My Submissions tab and show All Users directly */}
      {!teacherView && (
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: "100%", pb: 4 }}>
            {submissions.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  backgroundColor: darkMode
                    ? "rgba(41, 182, 246, 0.1)"
                    : "rgba(41, 182, 246, 0.08)",
                  color: darkMode ? "#29b6f6" : "#0277bd",
                  border: "1px solid",
                  borderColor: "rgba(41, 182, 246, 0.3)",
                  "& .MuiAlert-icon": {
                    color: darkMode ? "#29b6f6" : "#0277bd",
                  },
                }}
              >
                You haven't made any submissions yet. Submit your solution to
                see results here.
              </Alert>
            ) : (
              <>
                {/* Submission Limit Warning - hide for MCQ */}
                {!isMcq && submissions.length >= 4 && (
                  <Alert
                    severity={submissions.length >= 5 ? "warning" : "info"}
                    sx={{
                      mb: 2,
                      backgroundColor:
                        submissions.length >= 5
                          ? darkMode
                            ? "rgba(255, 152, 0, 0.1)"
                            : "rgba(255, 152, 0, 0.08)"
                          : darkMode
                          ? "rgba(33, 150, 243, 0.1)"
                          : "rgba(33, 150, 243, 0.08)",
                      color:
                        submissions.length >= 5
                          ? darkMode
                            ? "#ffa726"
                            : "#e65100"
                          : darkMode
                          ? "#42a5f5"
                          : "#1565c0",
                      border: "1px solid",
                      borderColor:
                        submissions.length >= 5
                          ? "rgba(255, 152, 0, 0.3)"
                          : "rgba(33, 150, 243, 0.3)",
                      "& .MuiAlert-icon": {
                        color:
                          submissions.length >= 5
                            ? darkMode
                              ? "#ffa726"
                              : "#e65100"
                            : darkMode
                            ? "#42a5f5"
                            : "#1565c0",
                      },
                    }}
                  >
                    {submissions.length >= 5 ? (
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                          Submission Limit Reached (5/5)
                        </Typography>
                        <Typography variant="caption">
                          You've reached the maximum of 5 submissions for this
                          question. Your next submission will replace the oldest
                          one automatically.
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">
                        <strong>
                          {submissions.length}/5 submissions used.
                        </strong>{" "}
                        You have {5 - submissions.length} submission
                        {5 - submissions.length !== 1 ? "s" : ""} remaining.
                      </Typography>
                    )}
                  </Alert>
                )}

                {/* Stats Overview Section */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {!isMcq && (
                    <>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <CodeIcon sx={{ color: submissions.length >= 5 ? "#ed6c02" : "#0088CC", fontSize: "1.1rem" }} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                          }}
                        >
                          <span style={{ color: submissions.length >= 5 ? "#ed6c02" : "#0088CC", fontWeight: 700 }}>
                            {submissions.length}/5
                          </span>{" "}
                          Submissions
                        </Typography>
                      </Box>
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                          borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                          height: 20,
                          alignSelf: "center",
                        }}
                      />
                    </>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <CheckIcon sx={{ color: "#2e7d32", fontSize: "1.1rem" }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                      }}
                    >
                      <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                        {acceptedCount}
                      </span>{" "}
                      {isMcq ? "Correct" : "Accepted"}
                    </Typography>
                  </Box>

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                      height: 20,
                      alignSelf: "center",
                    }}
                  />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <CloseIcon sx={{ color: "#d32f2f", fontSize: "1.1rem" }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                      }}
                    >
                      <span style={{ color: "#d32f2f", fontWeight: 700 }}>
                        {submissions.length - acceptedCount}
                      </span>{" "}
                      {isMcq ? "Wrong" : "Failed"}
                    </Typography>
                  </Box>

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                      height: 20,
                      alignSelf: "center",
                    }}
                  />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: progressColor,
                      }}
                    >
                      {acceptedPercentage}%
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 80 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                          lineHeight: 1,
                        }}
                      >
                        Acceptance Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={acceptedPercentage}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: darkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: progressColor,
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                    pb: 0.75,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: darkMode
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                      fontSize: "0.8rem",
                    }}
                  >
                    My Submissions
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Total: {submissions.length}
                  </Typography>
                </Box>

                {/* Render personal table view */}
                {renderPersonalTableView()}
              </>
            )}
          </Box>
        </TabPanel>
      )}

      {/* All Users Tab - Always shown in teacher view, or as second tab for students */}
      {teacherView ? (
        // Teacher view: Show all users submissions directly without TabPanel wrapper
        <Box sx={{ height: "100%", pb: 4 }}>
          {allUsersSubmissions.length === 0 ? (
            <Alert
              severity="info"
              sx={{
                mt: 2,
                backgroundColor: darkMode
                  ? "rgba(41, 182, 246, 0.1)"
                  : "rgba(41, 182, 246, 0.08)",
                color: darkMode ? "#29b6f6" : "#0277bd",
                border: "1px solid",
                borderColor: "rgba(41, 182, 246, 0.3)",
                "& .MuiAlert-icon": {
                  color: darkMode ? "#29b6f6" : "#0277bd",
                },
              }}
            >
              No submissions from users yet.
            </Alert>
          ) : (
            <>
              {/* Compact Stats and Filters Section */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                {/* Left side - Compact Stats */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    flexGrow: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckIcon sx={{ color: "#2e7d32", fontSize: "1.1rem" }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                      }}
                    >
                      <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                        {allUsersAcceptedCount}
                      </span>
                      /{filteredAllUsersSubmissions.length} Accepted
                    </Typography>
                  </Box>

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(0,0,0,0.15)",
                      height: 20,
                      alignSelf: "center",
                    }}
                  />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color:
                          allUsersAcceptedPercentage >= 80
                            ? "#2e7d32"
                            : allUsersAcceptedPercentage >= 50
                            ? "#ed6c02"
                            : "#d32f2f",
                      }}
                    >
                      {allUsersAcceptedPercentage}%
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 80 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          color: darkMode
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                          lineHeight: 1,
                        }}
                      >
                        Acceptance Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={allUsersAcceptedPercentage}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: darkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor:
                              allUsersAcceptedPercentage >= 80
                                ? "#2e7d32"
                                : allUsersAcceptedPercentage >= 50
                                ? "#ed6c02"
                                : "#d32f2f",
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Right side - Filters */}
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <FilterListIcon
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                      fontSize: "1.2rem",
                    }}
                  />

                  {!isMcq && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel
                        sx={{
                          color: darkMode
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                          fontSize: "0.8rem",
                        }}
                      >
                        Language
                      </InputLabel>
                      <Select
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        label="Language"
                        sx={{
                          height: "36px",
                          fontSize: "0.8rem",
                          color: darkMode ? "#fff" : "#000",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode
                              ? "rgba(255,255,255,0.3)"
                              : "rgba(0,0,0,0.3)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.5)",
                          },
                          "& .MuiSvgIcon-root": {
                            color: darkMode ? "#fff" : "#000",
                          },
                        }}
                      >
                        <MenuItem value="all">All Languages</MenuItem>
                        {filterOptions.languages.map((lang) => (
                          <MenuItem key={lang} value={lang}>
                            {lang.toUpperCase()}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel
                      sx={{
                        color: darkMode
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                        fontSize: "0.8rem",
                      }}
                    >
                      Status
                    </InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Status"
                      sx={{
                        height: "36px",
                        fontSize: "0.8rem",
                        color: darkMode ? "#fff" : "#000",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(0,0,0,0.3)",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        },
                        "& .MuiSvgIcon-root": {
                          color: darkMode ? "#fff" : "#000",
                        },
                      }}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      {filterOptions.statuses.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid",
                  borderColor: darkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                  pb: 0.75,
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.9)",
                    fontSize: "0.8rem",
                  }}
                >
                  All Users' Submissions
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                    fontSize: "0.7rem",
                  }}
                >
                  Showing: {filteredAllUsersSubmissions.length} /{" "}
                  {allUsersSubmissions.length}
                </Typography>
              </Box>

              {/* Render all users table view */}
              {renderAllUsersTableView()}
            </>
          )}
        </Box>
      ) : (
        // Student view: Show as TabPanel
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: "100%", pb: 4 }}>
            {allUsersSubmissions.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  backgroundColor: darkMode
                    ? "rgba(41, 182, 246, 0.1)"
                    : "rgba(41, 182, 246, 0.08)",
                  color: darkMode ? "#29b6f6" : "#0277bd",
                  border: "1px solid",
                  borderColor: "rgba(41, 182, 246, 0.3)",
                  "& .MuiAlert-icon": {
                    color: darkMode ? "#29b6f6" : "#0277bd",
                  },
                }}
              >
                No submissions from other users yet.
              </Alert>
            ) : (
              <>
                {/* Compact Stats and Filters Section */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Stats Card */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 3,
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AssignmentTurnedInIcon
                        sx={{
                          fontSize: 20,
                          color: darkMode ? "#4caf50" : "#2e7d32",
                        }}
                      />
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                            display: "block",
                            fontSize: "0.65rem",
                            lineHeight: 1.2,
                          }}
                        >
                          Accepted
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            color: darkMode ? "#4caf50" : "#2e7d32",
                            fontSize: "0.9rem",
                          }}
                        >
                          {allUsersAcceptedCount} ({allUsersAcceptedPercentage}
                          %)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Filters */}
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    {!isMcq && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: "0.75rem" }}>
                          Language
                        </InputLabel>
                        <Select
                          value={languageFilter}
                          onChange={(e) => setLanguageFilter(e.target.value)}
                          label="Language"
                          sx={{
                            fontSize: "0.75rem",
                            height: "32px",
                            "& .MuiSelect-select": {
                              py: 0.5,
                            },
                          }}
                        >
                          <MenuItem value="all" sx={{ fontSize: "0.75rem" }}>
                            All Languages
                          </MenuItem>
                          {filterOptions.languages.map((lang) => (
                            <MenuItem
                              key={lang}
                              value={lang}
                              sx={{ fontSize: "0.75rem" }}
                            >
                              {lang?.toUpperCase()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ fontSize: "0.75rem" }}>
                        Status
                      </InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                        sx={{
                          fontSize: "0.75rem",
                          height: "32px",
                          "& .MuiSelect-select": {
                            py: 0.5,
                          },
                        }}
                      >
                        <MenuItem value="all" sx={{ fontSize: "0.75rem" }}>
                          All Status
                        </MenuItem>
                        {filterOptions.statuses.map((status) => (
                          <MenuItem
                            key={status}
                            value={status}
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {status === "accepted"
                              ? "Accepted"
                              : status === "pending"
                              ? "Pending"
                              : status
                              ? status.replace("_", " ")
                              : "Unknown"}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Table Header with Count */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: "bold",
                      color: darkMode ? "#fff" : "#000",
                      fontSize: "0.9rem",
                    }}
                  >
                    All Users' Submissions
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Showing: {filteredAllUsersSubmissions.length} /{" "}
                    {allUsersSubmissions.length}
                  </Typography>
                </Box>

                {/* Render all users table view */}
                {renderAllUsersTableView()}
              </>
            )}
          </Box>
        </TabPanel>
      )}
    </Box>
  );
};

export default SubmissionsPanel;
