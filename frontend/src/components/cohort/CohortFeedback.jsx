import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Rating,
  TextField,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  Send as SendIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ThumbUp as ThumbUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import { toast } from "react-toastify";
import { apiUrl } from "../../config/apiConfig";

const CohortFeedback = ({ cohortId }) => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();
  const { token, user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userFeedback, setUserFeedback] = useState(null);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [error, setError] = useState(null);

  // Word/Character limit states
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogType, setLimitDialogType] = useState(""); // 'warning' or 'error'
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // Constants for limits
  const MAX_WORDS = 50;
  const MAX_CHARACTERS = 300;
  const WARNING_WORD_THRESHOLD = 40; // Show warning at 40 words
  const WARNING_CHAR_THRESHOLD = 240; // Show warning at 240 characters

  // Function to count words
  const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  // Function to handle comment change with validation
  const handleCommentChange = (event) => {
    const newComment = event.target.value;
    const newWordCount = countWords(newComment);
    const newCharCount = newComment.length;

    // Update counts
    setWordCount(newWordCount);
    setCharacterCount(newCharCount);

    // Check if we're exceeding limits
    if (newWordCount > MAX_WORDS) {
      setLimitDialogType("error");
      setShowLimitDialog(true);
      return; // Don't update comment if exceeding word limit
    }

    if (newCharCount > MAX_CHARACTERS) {
      setLimitDialogType("error");
      setShowLimitDialog(true);
      return; // Don't update comment if exceeding character limit
    }

    // Show warning when approaching limits
    if (
      (newWordCount >= WARNING_WORD_THRESHOLD && newWordCount < MAX_WORDS) ||
      (newCharCount >= WARNING_CHAR_THRESHOLD && newCharCount < MAX_CHARACTERS)
    ) {
      if (limitDialogType !== "warning") {
        setLimitDialogType("warning");
        setShowLimitDialog(true);
      }
    }

    setComment(newComment);
  };

  // Fetch user's existing feedback and all cohort feedbacks
  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        // Get user's feedback
        const userFeedbackResponse = await axios.get(
          `${apiUrl}/cohorts/${cohortId}/feedback/user`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // If user has already provided feedback, set it in the state
        if (userFeedbackResponse.data.hasFeedback) {
          const feedback = userFeedbackResponse.data.feedback;
          setUserFeedback(feedback);
          setRating(feedback.rating);
          const feedbackComment = feedback.comment || "";
          setComment(feedbackComment);
          setWordCount(countWords(feedbackComment));
          setCharacterCount(feedbackComment.length);
        }

        // Get all feedbacks for this cohort
        const allFeedbacksResponse = await axios.get(
          `${apiUrl}/cohorts/${cohortId}/feedback`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        setAllFeedbacks(allFeedbacksResponse.data.feedbacks || []);
      } catch (err) {
        console.error("Error fetching feedback:", err);
        setError("Failed to load feedback data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (cohortId && token) {
      fetchFeedbacks();
    }
  }, [cohortId, token]);

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error("Please select a rating before submitting");
      return;
    }

    // Final validation before submission
    if (wordCount > MAX_WORDS) {
      toast.error(
        `Comment cannot exceed ${MAX_WORDS} words. Current: ${wordCount} words.`
      );
      return;
    }

    if (characterCount > MAX_CHARACTERS) {
      toast.error(
        `Comment cannot exceed ${MAX_CHARACTERS} characters. Current: ${characterCount} characters.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${apiUrl}/cohorts/${cohortId}/feedback`,
        {
          rating,
          comment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setUserFeedback(response.data.feedback);

      // Refresh the feedbacks list
      const allFeedbacksResponse = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/feedback`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setAllFeedbacks(allFeedbacksResponse.data.feedbacks || []);
      toast.success("Thank you for your feedback!");
    } catch (err) {
      console.error("Error submitting feedback:", err);

      // Handle specific error responses from backend
      if (err.response?.data?.error === "COMMENT_TOO_LONG") {
        toast.error(
          `Comment is too long! Maximum ${err.response.data.maxLength} characters allowed.`
        );
      } else if (err.response?.data?.error === "TOO_MANY_WORDS") {
        toast.error(
          `Comment cannot exceed ${err.response.data.maxWords} words.`
        );
      } else {
        toast.error(
          err.response?.data?.message ||
            "Failed to submit feedback. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress size={32} sx={{ color: "#0088CC" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        flexGrow: 1,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 700,
            color: darkMode ? "#FFFFFF" : "#333333",
            mb: 0.5,
            fontSize: "1.25rem",
          }}
        >
          Cohort Feedback
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: darkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
            mb: 1.5,
            fontSize: "0.875rem",
          }}
        >
          Share your experience with this cohort and help others make informed
          decisions
        </Typography>
      </Box>

      {/* User Feedback Form */}
      <Card
        sx={{
          mb: 3,
          bgcolor: darkMode ? alpha("#0088CC", 0.08) : alpha("#0088CC", 0.04),
          boxShadow: "none",
          border: `1px solid ${
            darkMode ? alpha("#0088CC", 0.2) : alpha("#0088CC", 0.1)
          }`,
          borderRadius: "8px",
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 1.5,
              color: darkMode ? "#FFFFFF" : "#333333",
              fontSize: "1rem",
            }}
          >
            {userFeedback ? "Your Feedback" : "Rate This Cohort"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography
              variant="body2"
              sx={{
                mr: 1.5,
                color: darkMode ? "#FFFFFF" : "#333333",
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              Rating:
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => {
                setRating(newValue);
              }}
              precision={1}
              size="small"
              icon={
                <StarRateRoundedIcon
                  fontSize="small"
                  sx={{ color: darkMode ? "white" : "#FFC107" }}
                />
              }
              emptyIcon={
                <StarRateRoundedIcon
                  fontSize="small"
                  sx={{
                    color: darkMode
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(0, 0, 0, 0.2)",
                  }}
                />
              }
            />
          </Box>

          <TextField
            label="Your review (optional)"
            value={comment}
            onChange={handleCommentChange}
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            size="small"
            placeholder={`Share your experience... (Max ${MAX_WORDS} words)`}
            sx={{
              mb: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: darkMode
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.1)",
                },
                "&:hover fieldset": {
                  borderColor: darkMode
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.2)",
                },
                "&.Mui-focused fieldset": {
                  borderColor:
                    wordCount > MAX_WORDS || characterCount > MAX_CHARACTERS
                      ? "#f44336"
                      : "#0088CC",
                },
              },
              "& .MuiInputLabel-root": {
                color: darkMode
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.6)",
                fontSize: "0.875rem",
              },
              "& .MuiInputBase-input": {
                color: darkMode ? "#FFFFFF" : "#333333",
                fontSize: "0.875rem",
              },
            }}
          />

          {/* Character and Word Counter */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    wordCount > MAX_WORDS
                      ? "#f44336"
                      : wordCount >= WARNING_WORD_THRESHOLD
                      ? "#ff9800"
                      : darkMode
                      ? "rgba(255, 255, 255, 0.6)"
                      : "rgba(0, 0, 0, 0.6)",
                  fontSize: "0.75rem",
                  fontWeight: wordCount > WARNING_WORD_THRESHOLD ? 600 : 400,
                }}
              >
                Words: {wordCount}/{MAX_WORDS}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color:
                    characterCount > MAX_CHARACTERS
                      ? "#f44336"
                      : characterCount >= WARNING_CHAR_THRESHOLD
                      ? "#ff9800"
                      : darkMode
                      ? "rgba(255, 255, 255, 0.6)"
                      : "rgba(0, 0, 0, 0.6)",
                  fontSize: "0.75rem",
                  fontWeight:
                    characterCount > WARNING_CHAR_THRESHOLD ? 600 : 400,
                }}
              >
                Characters: {characterCount}/{MAX_CHARACTERS}
              </Typography>
            </Box>

            {/* Progress bars */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((wordCount / MAX_WORDS) * 100, 100)}
                  sx={{
                    height: 3,
                    borderRadius: 1,
                    bgcolor: darkMode
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor:
                        wordCount > MAX_WORDS
                          ? "#f44336"
                          : wordCount >= WARNING_WORD_THRESHOLD
                          ? "#ff9800"
                          : "#0088CC",
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((characterCount / MAX_CHARACTERS) * 100, 100)}
                  sx={{
                    height: 3,
                    borderRadius: 1,
                    bgcolor: darkMode
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor:
                        characterCount > MAX_CHARACTERS
                          ? "#f44336"
                          : characterCount >= WARNING_CHAR_THRESHOLD
                          ? "#ff9800"
                          : "#0088CC",
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<SendIcon sx={{ fontSize: "1rem" }} />}
              onClick={handleSubmitFeedback}
              disabled={
                submitting ||
                rating === 0 ||
                wordCount > MAX_WORDS ||
                characterCount > MAX_CHARACTERS
              }
              sx={{
                bgcolor:
                  wordCount > MAX_WORDS || characterCount > MAX_CHARACTERS
                    ? "#f44336"
                    : "#0088CC",
                color: "white",
                fontSize: "0.75rem",
                py: 0.75,
                px: 1.5,
                "&:hover": {
                  bgcolor:
                    wordCount > MAX_WORDS || characterCount > MAX_CHARACTERS
                      ? alpha("#f44336", 0.9)
                      : alpha("#0088CC", 0.9),
                },
                "&.Mui-disabled": {
                  bgcolor: darkMode
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 0, 0, 0.12)",
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.26)",
                },
              }}
            >
              {submitting
                ? "Submitting..."
                : wordCount > MAX_WORDS || characterCount > MAX_CHARACTERS
                ? "Limit Exceeded"
                : userFeedback
                ? "Update Feedback"
                : "Submit Feedback"}
            </Button>
          </Box>

          {userFeedback && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 1,
                color: darkMode
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(0, 0, 0, 0.5)",
                textAlign: "right",
                fontSize: "0.7rem",
              }}
            >
              Last updated: {formatDate(userFeedback.createdAt)}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Community Feedback Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0, // Important for flexbox to allow child to scroll
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1.5,
            color: darkMode ? "#FFFFFF" : "#333333",
            fontSize: "1rem",
          }}
        >
          Community Feedback
        </Typography>

        {/* Scrollable Feedback Container */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            pr: 1,
            pb: 2,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: darkMode
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: darkMode
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(0, 0, 0, 0.3)",
            },
          }}
        >
          {allFeedbacks.length > 0 ? (
            allFeedbacks.map((feedback, index) => (
              <Card
                key={feedback._id || index}
                sx={{
                  mb: 1.5,
                  bgcolor: darkMode ? alpha("#121212", 0.5) : "#FFFFFF",
                  boxShadow: darkMode
                    ? "none"
                    : "0 1px 3px rgba(0, 0, 0, 0.05)",
                  border: darkMode
                    ? `1px solid ${alpha("#FFFFFF", 0.1)}`
                    : "none",
                  borderRadius: "8px",
                }}
              >
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Avatar
                      src={feedback.user?.avatar}
                      alt={feedback.user?.name}
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: "#0088CC",
                        color: "#FFFFFF",
                        fontSize: "0.8rem",
                      }}
                    >
                      {feedback.user?.name ? feedback.user.name[0] : "U"}
                    </Avatar>
                    <Box sx={{ ml: 1, flex: 1 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: darkMode ? "#FFFFFF" : "#333333",
                            fontSize: "0.815rem",
                          }}
                        >
                          {feedback.user?.name || "Anonymous User"}
                        </Typography>
                        {/* Verified Student Badge */}
                        <Chip
                          label="Verified"
                          size="small"
                          icon={
                            <StarIcon sx={{ fontSize: "0.7rem !important" }} />
                          }
                          sx={{
                            height: "16px",
                            fontSize: "0.65rem",
                            backgroundColor: darkMode
                              ? "rgba(76, 175, 80, 0.2)"
                              : "rgba(76, 175, 80, 0.1)",
                            color: darkMode ? "#81c784" : "#388e3c",
                            "& .MuiChip-icon": {
                              marginLeft: "4px",
                              color: darkMode ? "#81c784" : "#388e3c",
                            },
                            "& .MuiChip-label": {
                              padding: "0 4px",
                            },
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: darkMode
                              ? "rgba(255, 255, 255, 0.6)"
                              : "rgba(0, 0, 0, 0.6)",
                            fontSize: "0.7rem",
                          }}
                        >
                          {formatDate(feedback.createdAt)}
                        </Typography>
                        <Rating
                          value={feedback.rating}
                          readOnly
                          size="small"
                          icon={
                            <StarRateRoundedIcon
                              fontSize="small"
                              sx={{
                                color: darkMode ? "white" : "#FFC107",
                                fontSize: "0.9rem",
                              }}
                            />
                          }
                          emptyIcon={
                            <StarRateRoundedIcon
                              fontSize="small"
                              sx={{
                                color: darkMode
                                  ? "rgba(255, 255, 255, 0.3)"
                                  : "rgba(0, 0, 0, 0.2)",
                                fontSize: "0.9rem",
                              }}
                            />
                          }
                        />
                      </Box>
                    </Box>
                  </Box>

                  {feedback.comment && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: darkMode
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(0, 0, 0, 0.9)",
                        ml: 5,
                        mt: 0.25,
                        fontSize: "0.8rem",
                        wordWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                      }}
                    >
                      {feedback.comment}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Box
              sx={{
                p: 2,
                textAlign: "center",
                border: `1px dashed ${
                  darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"
                }`,
                borderRadius: "8px",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.6)",
                  mb: 0.5,
                  fontSize: "0.85rem",
                }}
              >
                No feedback available yet
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.5)",
                  fontSize: "0.75rem",
                }}
              >
                Be the first to share your experience with this cohort
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Limit Warning/Error Dialog */}
      <Dialog
        open={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: darkMode ? "#1a1a1a" : "#ffffff",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: limitDialogType === "error" ? "#f44336" : "#ff9800",
          }}
        >
          <WarningIcon />
          {limitDialogType === "error"
            ? "Character/Word Limit Exceeded"
            : "Approaching Limit"}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ mb: 2, color: darkMode ? "#ffffff" : "#333333" }}
          >
            {limitDialogType === "error" ? (
              <>
                Your comment has exceeded the allowed limits. Please reduce the
                length to continue.
              </>
            ) : (
              <>
                You're approaching the comment limits. Consider reviewing your
                feedback to stay within the limits.
              </>
            )}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color:
                  wordCount > MAX_WORDS
                    ? "#f44336"
                    : wordCount >= WARNING_WORD_THRESHOLD
                    ? "#ff9800"
                    : darkMode
                    ? "rgba(255, 255, 255, 0.8)"
                    : "rgba(0, 0, 0, 0.8)",
                mb: 1,
              }}
            >
              <strong>Words:</strong> {wordCount} / {MAX_WORDS}
              {wordCount > MAX_WORDS &&
                ` (${wordCount - MAX_WORDS} over limit)`}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={Math.min((wordCount / MAX_WORDS) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                mb: 2,
                "& .MuiLinearProgress-bar": {
                  bgcolor:
                    wordCount > MAX_WORDS
                      ? "#f44336"
                      : wordCount >= WARNING_WORD_THRESHOLD
                      ? "#ff9800"
                      : "#0088CC",
                  borderRadius: 3,
                },
              }}
            />

            <Typography
              variant="body2"
              sx={{
                color:
                  characterCount > MAX_CHARACTERS
                    ? "#f44336"
                    : characterCount >= WARNING_CHAR_THRESHOLD
                    ? "#ff9800"
                    : darkMode
                    ? "rgba(255, 255, 255, 0.8)"
                    : "rgba(0, 0, 0, 0.8)",
                mb: 1,
              }}
            >
              <strong>Characters:</strong> {characterCount} / {MAX_CHARACTERS}
              {characterCount > MAX_CHARACTERS &&
                ` (${characterCount - MAX_CHARACTERS} over limit)`}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={Math.min((characterCount / MAX_CHARACTERS) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                "& .MuiLinearProgress-bar": {
                  bgcolor:
                    characterCount > MAX_CHARACTERS
                      ? "#f44336"
                      : characterCount >= WARNING_CHAR_THRESHOLD
                      ? "#ff9800"
                      : "#0088CC",
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          {limitDialogType === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Please reduce your comment length before submitting your feedback.
            </Alert>
          )}

          {limitDialogType === "warning" && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You're getting close to the limit. Consider reviewing your
              feedback.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowLimitDialog(false)}
            sx={{ color: darkMode ? "#ffffff" : "#0088CC" }}
          >
            {limitDialogType === "error" ? "I'll Fix It" : "Got It"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CohortFeedback;
