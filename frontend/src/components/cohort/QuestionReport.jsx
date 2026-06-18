import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Collapse,
  InputLabel,
} from "@mui/material";
import {
  BugReport,
  Send as SendIcon,
  Delete as DeleteIcon,
  ErrorOutline as ErrorIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

const QuestionReport = ({
  cohortId,
  moduleId,
  questionId,
  darkMode,
  user = null,
  teacherView = false,
}) => {
  const { token, user: authUser } = useAuth();
  const currentUser = user || authUser;
  const isAdminOrTeacher =
    currentUser &&
    (currentUser.userType === "admin" || currentUser.userType === "teacher");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [updatingReport, setUpdatingReport] = useState(false);

  // Validation constants
  const MAX_CHARACTERS = 500;
  const MAX_WORDS = 100;

  // Validation functions
  const getWordCount = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const isValidDescription = (text) => {
    const wordCount = getWordCount(text);
    return text.length <= MAX_CHARACTERS && wordCount <= MAX_WORDS;
  };

  const getCharacterCount = () => description.length;
  const getWordCountForDescription = () => getWordCount(description);

  // Report type options
  const reportTypes = [
    { value: "test_case_issue", label: "Test Case Issue" },
    { value: "incorrect_question", label: "Incorrect Question" },
    { value: "constraints_issue", label: "Constraints Issue" },
    { value: "technical_issue", label: "Technical Issue" },
    { value: "other", label: "Other Issue" },
  ];

  // Status color mapping
  const statusColors = {
    pending: {
      color: darkMode ? "#f0c000" : "#b45309",
      bgColor: darkMode ? "rgba(240, 192, 0, 0.1)" : "rgba(240, 192, 0, 0.1)",
    },
    in_progress: {
      color: darkMode ? "#0088cc" : "#0066b2",
      bgColor: darkMode ? "rgba(0, 136, 204, 0.1)" : "rgba(0, 136, 204, 0.1)",
    },
    resolved: {
      color: darkMode ? "#00c853" : "#2e7d32",
      bgColor: darkMode ? "rgba(0, 200, 83, 0.1)" : "rgba(0, 200, 83, 0.1)",
    },
    rejected: {
      color: darkMode ? "#ff5252" : "#d32f2f",
      bgColor: darkMode ? "rgba(255, 82, 82, 0.1)" : "rgba(255, 82, 82, 0.1)",
    },
  };

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, [cohortId, moduleId, questionId, token]);

  // Fetch reports from API
  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Submit new report
  const handleSubmitReport = async () => {
    if (!reportType || !description) {
      toast.error("Please select a report type and provide a description");
      return;
    }

    if (!isValidDescription(description)) {
      toast.error(
        "Description exceeds the limit of 100 words or 500 characters"
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/report`,
        { reportType, description },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Report submitted successfully");

      // Clear form and refresh reports
      setReportType("");
      setDescription("");
      fetchReports();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render status chip
  const renderStatusChip = (status) => {
    const statusConfig = statusColors[status] || statusColors.pending;
    const statusLabel = status
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return (
      <Chip
        label={statusLabel}
        size="small"
        sx={{
          bgcolor: statusConfig.bgColor,
          color: statusConfig.color,
          fontWeight: "medium",
          borderRadius: "4px",
          height: "20px",
          fontSize: "0.65rem",
          px: 0.5,
        }}
      />
    );
  };

  // Add a new function to handle report deletion
  const handleDeleteReport = async (reportId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this report? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await axios.delete(`${apiUrl}/cohorts/${cohortId}/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("Report deleted successfully");
      fetchReports(); // Refresh the report list
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  // Handle expanding/collapsing report for admin response
  const handleToggleExpand = (reportId, currentResponse, currentStatus) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      setAdminResponse("");
      setReportStatus("");
    } else {
      setExpandedReportId(reportId);
      setAdminResponse(currentResponse || "");
      setReportStatus(currentStatus || "pending");
    }
  };

  // Update report with admin response and status
  const handleUpdateReport = async (reportId) => {
    if (!adminResponse.trim() && !reportStatus) {
      toast.error("Please provide a response or update the status");
      return;
    }

    setUpdatingReport(true);
    try {
      await axios.put(
        `${apiUrl}/cohorts/${cohortId}/reports/${reportId}`,
        {
          status: reportStatus,
          adminResponse: adminResponse.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Report updated successfully");
      setExpandedReportId(null);
      setAdminResponse("");
      setReportStatus("");
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setUpdatingReport(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: { xs: 2, md: 3 },
        color: darkMode ? "#fff" : "#000",
      }}
    >
      {/* Report Form - Only show for regular users, not for teacher/admin view */}
      {!teacherView && !isAdminOrTeacher && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2.5,
              display: "flex",
              alignItems: "center",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: darkMode ? "#ff5252" : "#d32f2f",
            }}
          >
            <BugReport sx={{ mr: 1, fontSize: "1.1rem" }} />
            Report an Issue
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl
              size="small"
              sx={{
                minWidth: 200,
                maxWidth: 300,
                "& .MuiOutlinedInput-root": {
                  bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                  color: darkMode ? "#fff" : "#000",
                  borderRadius: "4px",
                  "& fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.23)",
                  },
                },
              }}
            >
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                displayEmpty
                renderValue={(selected) =>
                  selected
                    ? reportTypes.find((t) => t.value === selected)?.label
                    : "Issue Type"
                }
                sx={{
                  fontSize: "0.8rem",
                  height: "40px",
                }}
              >
                {reportTypes.map((type) => (
                  <MenuItem
                    key={type.value}
                    value={type.value}
                    sx={{ fontSize: "0.8rem" }}
                  >
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              placeholder="Describe the issue (max 100 words, 500 characters)"
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              value={description}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isValidDescription(newValue)) {
                  setDescription(newValue);
                }
              }}
              error={!isValidDescription(description) && description.length > 0}
              helperText={
                <>
                  <span style={{ marginRight: "auto" }}>
                    {getCharacterCount()}/{MAX_CHARACTERS} characters,{" "}
                    {getWordCountForDescription()}/{MAX_WORDS} words
                  </span>
                  {!isValidDescription(description) &&
                    description.length > 0 && (
                      <span style={{ color: "#f44336", marginLeft: "8px" }}>
                        Limit exceeded
                      </span>
                    )}
                </>
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                  color: darkMode ? "#fff" : "#000",
                  fontSize: "0.8rem",
                  "& fieldset": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.23)",
                  },
                },
                "& .MuiFormHelperText-root": {
                  color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  fontSize: "0.7rem",
                  mx: 0,
                  mt: 0.5,
                },
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="error"
                disabled={
                  submitting ||
                  !reportType ||
                  !description ||
                  !isValidDescription(description)
                }
                onClick={handleSubmitReport}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon />
                  )
                }
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  py: 0.7,
                  px: 2,
                  bgcolor: darkMode ? "#d32f2f" : "#f44336",
                  "&:hover": {
                    bgcolor: darkMode ? "#b71c1c" : "#d32f2f",
                  },
                }}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Reports List */}
      {reports.length > 0 && (
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
              variant="subtitle1"
              sx={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
              }}
            >
              {isAdminOrTeacher
                ? `All Reports (${reports.length})`
                : `Your Reports (${reports.length})`}
            </Typography>

            <Tooltip title="Refresh reports">
              <IconButton
                size="small"
                onClick={fetchReports}
                disabled={loading}
                sx={{ color: darkMode ? "#aaa" : "#666" }}
              >
                <TimeIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Tooltip>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {reports.map((report) => (
                <Box
                  key={report._id}
                  sx={{
                    p: 1.5,
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.15)",
                    bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
                    boxShadow: darkMode ? "none" : "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.75,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: darkMode
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(0,0,0,0.9)",
                        }}
                      >
                        {reportTypes.find((t) => t.value === report.reportType)
                          ?.label || "Issue Report"}
                      </Typography>
                      {isAdminOrTeacher && report.user && (
                        <Chip
                          label={report.user.name || report.user.email}
                          size="small"
                          sx={{
                            height: "18px",
                            fontSize: "0.65rem",
                            bgcolor: darkMode
                              ? "rgba(33,150,243,0.15)"
                              : "rgba(33,150,243,0.1)",
                            color: darkMode ? "#42a5f5" : "#1976d2",
                            fontWeight: "medium",
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {renderStatusChip(report.status)}
                      {!isAdminOrTeacher && (
                        <Tooltip title="Delete report">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteReport(report._id)}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: "0.9rem" }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isAdminOrTeacher && (
                        <Tooltip
                          title={
                            expandedReportId === report._id
                              ? "Close"
                              : "Respond to report"
                          }
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              handleToggleExpand(
                                report._id,
                                report.adminResponse,
                                report.status
                              )
                            }
                            sx={{ p: 0.5 }}
                          >
                            {expandedReportId === report._id ? (
                              <CloseIcon sx={{ fontSize: "0.9rem" }} />
                            ) : (
                              <EditIcon sx={{ fontSize: "0.9rem" }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      whiteSpace: "pre-wrap",
                      fontSize: "0.85rem",
                      color: darkMode
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                      lineHeight: 1.5,
                    }}
                  >
                    {report.description}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      mt: 0.5,
                      pt: 0.75,
                      borderTop: "1px solid",
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.7rem",
                        color: darkMode
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <TimeIcon
                        sx={{ fontSize: "0.8rem", mr: 0.5, opacity: 0.7 }}
                      />
                      {formatDate(report.createdAt)}
                    </Typography>
                  </Box>

                  {report.adminResponse && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: darkMode ? "rgba(0,0,0,0.3)" : "#ffffff",
                        borderRadius: "4px",
                        border: "1px solid",
                        borderColor: darkMode
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.15)",
                        boxShadow: darkMode
                          ? "none"
                          : "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 0.5,
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.9)",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <ErrorIcon
                          sx={{
                            fontSize: "0.9rem",
                            mr: 0.5,
                            color: statusColors.in_progress.color,
                          }}
                        />
                        Admin Response:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          fontSize: "0.85rem",
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.9)",
                          lineHeight: 1.5,
                        }}
                      >
                        {report.adminResponse}
                      </Typography>
                    </Box>
                  )}

                  {/* Admin/Teacher Response Form - Collapsible */}
                  {isAdminOrTeacher && (
                    <Collapse in={expandedReportId === report._id}>
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 2,
                          bgcolor: darkMode
                            ? "rgba(33,150,243,0.05)"
                            : "rgba(33,150,243,0.05)",
                          borderRadius: "6px",
                          border: "1px solid",
                          borderColor: darkMode
                            ? "rgba(33,150,243,0.2)"
                            : "rgba(33,150,243,0.2)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mb: 1.5,
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            color: darkMode ? "#42a5f5" : "#1976d2",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <EditIcon sx={{ fontSize: "0.9rem", mr: 0.5 }} />
                          Update Report Status & Response
                        </Typography>

                        <Stack spacing={2}>
                          <FormControl size="small" fullWidth>
                            <InputLabel sx={{ fontSize: "0.8rem" }}>
                              Status
                            </InputLabel>
                            <Select
                              value={reportStatus}
                              onChange={(e) => setReportStatus(e.target.value)}
                              label="Status"
                              sx={{
                                fontSize: "0.8rem",
                                bgcolor: darkMode
                                  ? "rgba(255,255,255,0.05)"
                                  : "#fff",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: darkMode
                                    ? "rgba(255,255,255,0.2)"
                                    : "rgba(0,0,0,0.23)",
                                },
                              }}
                            >
                              <MenuItem
                                value="pending"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Pending
                              </MenuItem>
                              <MenuItem
                                value="in_progress"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                In Progress
                              </MenuItem>
                              <MenuItem
                                value="resolved"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Resolved
                              </MenuItem>
                              <MenuItem
                                value="rejected"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Rejected
                              </MenuItem>
                            </Select>
                          </FormControl>

                          <TextField
                            placeholder="Write your response to the user..."
                            multiline
                            rows={3}
                            fullWidth
                            variant="outlined"
                            value={adminResponse}
                            onChange={(e) => setAdminResponse(e.target.value)}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                bgcolor: darkMode
                                  ? "rgba(255,255,255,0.05)"
                                  : "#fff",
                                color: darkMode ? "#fff" : "#000",
                                fontSize: "0.8rem",
                                "& fieldset": {
                                  borderColor: darkMode
                                    ? "rgba(255,255,255,0.2)"
                                    : "rgba(0,0,0,0.23)",
                                },
                              },
                            }}
                          />

                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleToggleExpand(report._id)}
                              sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                borderColor: darkMode
                                  ? "rgba(255,255,255,0.3)"
                                  : "rgba(0,0,0,0.3)",
                                color: darkMode
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.7)",
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              disabled={
                                updatingReport ||
                                (!adminResponse.trim() &&
                                  reportStatus === report.status)
                              }
                              onClick={() => handleUpdateReport(report._id)}
                              startIcon={
                                updatingReport ? (
                                  <CircularProgress size={14} color="inherit" />
                                ) : (
                                  <SendIcon />
                                )
                              }
                              sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                bgcolor: darkMode ? "#1976d2" : "#2196f3",
                                "&:hover": {
                                  bgcolor: darkMode ? "#1565c0" : "#1976d2",
                                },
                              }}
                            >
                              {updatingReport ? "Updating..." : "Update Report"}
                            </Button>
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {!loading && reports.length === 0 && (
        <Alert
          severity="info"
          icon={<ErrorIcon sx={{ fontSize: "1rem" }} />}
          sx={{
            fontSize: "0.75rem",
            py: 0.75,
            alignItems: "center",
            bgcolor: darkMode ? "rgba(0,136,204,0.1)" : "rgba(33,150,243,0.1)",
            color: darkMode ? "#0088cc" : "#0277bd",
            border: "none",
            mt: 2,
          }}
        >
          {isAdminOrTeacher
            ? "No reports have been submitted for this question yet."
            : "You haven't submitted any reports for this question yet."}
        </Alert>
      )}
    </Box>
  );
};

export default QuestionReport;
