import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  useTheme as useMuiTheme,
  Tab,
  Tabs,
  alpha,
  Rating,
  Divider,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import { useNavigate } from "react-router-dom";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";

const CohortListRight = ({
  selectedCohort,
  hasActiveFilters = false,
  filteredCount = 0,
}) => {
  const muiTheme = useMuiTheme();
  const { darkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Add loading state for reviews
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState([]);

  // Simple progress state
  const [progress, setProgress] = useState({
    totalQuestions: 0,
    solvedQuestions: 0,
    progressPercentage: 0,
    isEnrolled: false,
  });

  // Effect to fetch reviews and progress whenever selectedCohort changes
  useEffect(() => {
    if (selectedCohort?._id && token) {
      fetchReviews(selectedCohort._id);
      fetchProgress(selectedCohort._id);
    }
  }, [selectedCohort?._id, token]);

  // Simple function to fetch progress
  const fetchProgress = async (cohortId) => {
    try {
      const response = await axios.get(`/cohorts/${cohortId}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgress(response.data);
    } catch (error) {
      console.error("Error fetching progress:", error);
      // Keep default progress state on error
    }
  };

  // Function to fetch reviews for the selected cohort
  const fetchReviews = async (cohortId) => {
    setLoadingReviews(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/feedback`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.feedbacks) {
        setReviews(response.data.feedbacks);
      }
    } catch (error) {
      console.error("Error fetching cohort reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Simple helper functions using the progress data
  const isUserEnrolled = () => progress.isEnrolled;
  const getProgressPercentage = () => progress.progressPercentage;

  // Handle button clicks - both enrollment and start learning
  const handleStartLearning = async () => {
    if (!selectedCohort || !selectedCohort._id) return;

    if (isUserEnrolled()) {
      // User is already enrolled, navigate to cohort page
      navigate(`/cohorts/${selectedCohort._id}`);
    } else {
      // User needs to enroll first - you might want to add enrollment API call here
      // For now, just navigate to cohort page where they can enroll
      navigate(`/cohorts/${selectedCohort._id}`);
    }
  };

  // Use the reviews data instead of selectedCohort.feedbacks for the Reviews tab
  const feedbacksToShow =
    activeTab === 1
      ? reviews.length > 0
        ? reviews
        : []
      : selectedCohort?.feedbacks && selectedCohort.feedbacks.length > 0
      ? selectedCohort.feedbacks
      : [];

  // Show empty state if no cohort is selected
  if (!selectedCohort) {
    return (
      <Box
        sx={{
          height: "80vh",
          border: `1px solid ${
            darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"
          }`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: darkMode ? "transparent" : "#FFFFFF",
          borderRadius: "12px",
          p: 4,
          textAlign: "center",
          boxShadow: darkMode
            ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
            : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            bgcolor: darkMode
              ? "rgba(0, 136, 204, 0.1)"
              : "rgba(0, 136, 204, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
              fill={
                darkMode ? "rgba(0, 136, 204, 0.4)" : "rgba(0, 136, 204, 0.3)"
              }
            />
            <path
              d="M7 10H17V12H7V10ZM7 14H17V16H7V14ZM7 6H17V8H7V6Z"
              fill={
                darkMode ? "rgba(0, 136, 204, 0.4)" : "rgba(0, 136, 204, 0.3)"
              }
            />
          </svg>
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.87)",
            mb: 1,
          }}
        >
          {hasActiveFilters && filteredCount === 0
            ? "No Cohorts Found"
            : "No Cohort Selected"}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            maxWidth: "350px",
            lineHeight: 1.6,
          }}
        >
          {hasActiveFilters && filteredCount === 0
            ? "No cohorts match your current filters. Try adjusting your search criteria."
            : "Select a cohort from the list to view details"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "80vh", // Fixed height
        border: `1px solid ${
          darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"
        }`,
        display: "flex",
        flexDirection: "column",
        bgcolor: darkMode ? "transparent" : "#FFFFFF",
        color: darkMode ? "#FFFFFF" : "#0F0F0F",
        borderRadius: "12px",
        px: 3,
        pb: 3,
        pt: 2,
        width: "100%",
        position: "relative",
        overflow: "hidden", // Prevent overflow
        boxShadow: darkMode
          ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: darkMode
            ? "0 6px 16px rgba(0, 0, 0, 0.4), 0 3px 8px rgba(0, 0, 0, 0.3)"
            : "0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.06)",
          border: `1px solid ${
            darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 136, 204, 0.2)"
          }`,
        },
      }}
    >
      {/* Gaussian Blur Effect - Only for dark mode */}
      {darkMode && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            overflow: "hidden",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 629 583"
            fill="none"
            style={{ position: "absolute", top: 0, left: 0, opacity: 1 }}
          >
            <g opacity="0.9" filter="url(#filter0_f_255_604)">
              <path d="M697.5 -237L26 194L714 268L697.5 -237Z" fill="#1580CC" />
              <path d="M697.5 -237L26 194L714 268L697.5 -237Z" stroke="black" />
            </g>
            <defs>
              <filter
                id="filter0_f_255_604"
                x="-440.563"
                y="-702.996"
                width="1620.18"
                height="1436.66"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                />
                <feGaussianBlur
                  stdDeviation="232.55"
                  result="effect1_foregroundBlur_255_604"
                />
              </filter>
            </defs>
          </svg>
        </Box>
      )}

      {/* Cohort Title */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          mb: 2,
          mt: 2,
          fontSize: "2rem",
          color: darkMode ? "#FFFFFF" : "#666666",
        }}
      >
        {selectedCohort.title || "Object Oriented Programming"}
      </Typography>

      {/* Cohort Description */}
      <Typography
        variant="body1"
        sx={{
          mb: 3,
          color: darkMode ? "rgba(255,255,255,0.8)" : "rgba(15,15,15,0.8)",
          lineHeight: 1.6,
          fontSize: "0.95rem",
        }}
      >
        {selectedCohort.description ||
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and"}
      </Typography>

      {/* Progress Bar */}
      <Box
        sx={{ mb: 3, width: "100%", display: "flex", flexDirection: "column" }}
      >
        <Typography
          variant="body2"
          sx={{
            color: darkMode ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
            mb: 1,
            fontWeight: 500,
          }}
        >
          {isUserEnrolled() ? "Your Progress" : "Not Yet Enrolled"}
        </Typography>
        {isUserEnrolled() ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,1)",
                width: "50%",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  backgroundColor: "#0088CC",
                },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "#FFFFFF" : "#666666",
                fontWeight: "medium",
                ml: 2,
              }}
            >
              {getProgressPercentage()}% ({progress.solvedQuestions}/
              {progress.totalQuestions})
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              fontStyle: "italic",
            }}
          >
            Click "Enroll Now" to start your learning journey
          </Typography>
        )}
      </Box>

      {/* Combined container for tabs and content */}
      <Box
        sx={{
          bgcolor: darkMode ? "rgba(0, 0, 0, 0.50)" : "#FFFFFF",
          borderRadius: "10px",
          overflow: "hidden", // Change to hidden
          mb: 2,
          mt: 2,
          flex: 1, // Allow it to grow and fill available space
          display: "flex",
          flexDirection: "column",
          boxShadow: darkMode
            ? "0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15)"
            : "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03)",
          backdropFilter: darkMode ? "blur(10px)" : "none",
          border: `1px solid ${
            darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
          }`,
          transition: "all 0.2s ease",
          "&:hover": {
            boxShadow: darkMode
              ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
              : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        {/* Tab Selection */}
        <Box sx={{ display: "flex", px: 2, pt: 2 }}>
          <Button
            sx={{
              bgcolor: activeTab === 0 ? "#0088CC" : "transparent",
              color:
                activeTab === 0
                  ? "white"
                  : darkMode
                  ? "rgba(255,255,255,0.6)"
                  : "rgba(0,0,0,0.6)",
              borderRadius: "4px",
              textTransform: "none",
              mr: 2,
              "&:hover": {
                bgcolor: activeTab === 0 ? "#0088CC" : "transparent",
              },
            }}
            onClick={() => setActiveTab(0)}
          >
            Details
          </Button>
          <Button
            sx={{
              bgcolor: activeTab === 1 ? "#0088CC" : "transparent",
              color:
                activeTab === 1
                  ? "white"
                  : darkMode
                  ? "rgba(255,255,255,0.6)"
                  : "rgba(0,0,0,0.6)",
              borderRadius: "4px",
              textTransform: "none",
              "&:hover": {
                bgcolor: activeTab === 1 ? "#0088CC" : "transparent",
              },
            }}
            onClick={() => setActiveTab(1)}
          >
            Reviews
          </Button>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box
            sx={{
              p: 3,
              pt: 2,
              flex: 1, // Allow to grow
              overflowY: "auto", // Enable scrolling if content is too tall
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: darkMode
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(15, 15, 15, 0.1)",
                borderRadius: "3px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: darkMode
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(15, 15, 15, 0.2)",
              },
            }}
          >
            {/* Status */}
            <Box
              sx={{
                display: "flex",
                mb: 3,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontWeight: 400,
                  width: "120px",
                }}
              >
                Status:
              </Typography>
              <Chip
                label={selectedCohort.status || "Pending"}
                size="small"
                sx={{
                  bgcolor: "#0088CC",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  height: "24px",
                  borderRadius: "4px",
                }}
              />
            </Box>

            {/* Topics */}
            <Box
              sx={{
                display: "flex",
                mb: 3,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontWeight: 400,
                  width: "120px",
                }}
              >
                Topics:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "white" : "#666666",
                }}
              >
                {selectedCohort.topics || "Java, Python, OOP's"}
              </Typography>
            </Box>

            {/* Questions Count */}
            <Box
              sx={{
                display: "flex",
                mb: 3,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontWeight: 400,
                  width: "120px",
                }}
              >
                Questions:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "white" : "#666666",
                }}
              >
                {progress.totalQuestions} Total
              </Typography>
            </Box>

            {/* Start Date */}
            <Box
              sx={{
                display: "flex",
                mb: 3,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontWeight: 400,
                  width: "120px",
                }}
              >
                Start Date:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "white" : "#666666",
                }}
              >
                {selectedCohort.startDate
                  ? "January 21, 2025"
                  : formatDate(selectedCohort.startDate)}
              </Typography>
            </Box>

            {/* Level */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontWeight: 400,
                  width: "120px",
                }}
              >
                Level:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: "#4CAF50",
                }}
              >
                {selectedCohort.level || "Beginner"}
              </Typography>
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box
            sx={{
              p: 3,
              flex: 1, // Allow to grow
              overflowY: "auto", // Allow scrolling if content exceeds available space
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: darkMode
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(15, 15, 15, 0.1)",
                borderRadius: "3px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: darkMode
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(15, 15, 15, 0.2)",
              },
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: darkMode ? "white" : "#666666",
              }}
            >
              Recent Reviews
            </Typography>

            {loadingReviews ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={30} sx={{ color: "#0088CC" }} />
              </Box>
            ) : (
              <Box>
                {feedbacksToShow.length > 0 ? (
                  feedbacksToShow.map((feedback, index) => {
                    // Get user details safely with fallbacks
                    const userName = feedback.user?.name || "Anonymous User";
                    const userAvatar = feedback.user?.profilePicture || null;

                    return (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
                          {/* User Avatar */}
                          <Avatar
                            src={userAvatar}
                            alt={userName}
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: userAvatar ? "transparent" : "#0088CC",
                              color: "#ffffff",
                              fontSize: "1rem",
                              fontWeight: 600,
                              border: darkMode
                                ? "2px solid rgba(255, 255, 255, 0.1)"
                                : "2px solid rgba(0, 136, 204, 0.1)",
                            }}
                          >
                            {!userAvatar && userName.charAt(0).toUpperCase()}
                          </Avatar>

                          <Box sx={{ flex: 1, width: "100%" }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: darkMode ? "white" : "#666666",
                                fontSize: "0.85rem",
                                mb: 0.5,
                              }}
                            >
                              {userName}
                            </Typography>

                            <Box
                              sx={{
                                bgcolor: darkMode
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(0, 136, 204, 0.03)",
                                borderRadius: "8px",
                                p: 1.5,
                                color: darkMode
                                  ? "rgb(255, 255, 255)"
                                  : "#0F0F0F",
                                boxShadow: darkMode
                                  ? "0 1px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)"
                                  : "0 1px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                                border: `1px solid ${
                                  darkMode
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.08)"
                                }`,
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  boxShadow: darkMode
                                    ? "0 2px 6px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15)"
                                    : "0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)",
                                  border: `1px solid ${
                                    darkMode
                                      ? "rgba(255, 255, 255, 0.15)"
                                      : "rgba(0, 136, 204, 0.15)"
                                  }`,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 1,
                                }}
                              >
                                <Rating
                                  value={feedback.rating}
                                  size="small"
                                  readOnly
                                  precision={0.5}
                                  icon={
                                    <StarRateRoundedIcon
                                      fontSize="small"
                                      sx={{
                                        color: "#0088CC",
                                        fontSize: "1rem",
                                      }}
                                    />
                                  }
                                  emptyIcon={
                                    <StarRateRoundedIcon
                                      fontSize="small"
                                      sx={{
                                        color: "rgba(0, 136, 204, 0.3)",
                                        fontSize: "1rem",
                                      }}
                                    />
                                  }
                                  sx={{ mr: 1 }}
                                />
                                <Chip
                                  label={feedback.rating.toFixed(1)}
                                  size="small"
                                  sx={{
                                    bgcolor: "#0088CC",
                                    color: "white",
                                    fontWeight: "bold",
                                    height: "18px",
                                    fontSize: "0.65rem",
                                    px: 0.5,
                                  }}
                                />
                              </Box>

                              <Typography
                                variant="body2"
                                sx={{
                                  lineHeight: 1.5,
                                  fontSize: "0.75rem",
                                  fontWeight: 400,
                                  color: darkMode ? "white" : "#666666",
                                  wordWrap: "break-word",
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "break-word",
                                }}
                              >
                                {feedback.comment || "No comment provided"}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {index < feedbacksToShow.length - 1 && (
                          <Divider sx={{ my: 2, opacity: 0.1 }} />
                        )}
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="body1"
                      color={darkMode ? "white" : "#666666"}
                    >
                      No reviews available yet
                    </Typography>
                    <Typography
                      variant="body2"
                      color={
                        darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
                      }
                    >
                      Be the first to share your experience
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Box>
          <Button
            variant="contained"
            onClick={handleStartLearning}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: "#0088CC",
              color: "white",
              borderRadius: "6px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              py: 1,
              px: 3,
              "&:hover": {
                bgcolor: "#0077b6",
              },
            }}
          >
            {isUserEnrolled() ? "Start Learning" : "Enroll Now"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CohortListRight;
