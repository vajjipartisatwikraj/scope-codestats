import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  alpha,
  Button,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Divider,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import DoneIcon from "@mui/icons-material/Done";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { styled } from "@mui/material/styles";
import CreateRoundedIcon from "@mui/icons-material/CreateRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddIcon from "@mui/icons-material/Add";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import FeedbackIcon from "@mui/icons-material/Feedback";
import StarIcon from "@mui/icons-material/Star";
import axios from "axios";

// Styled components for cleaner code
const ModuleItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  borderRadius: "6px",
  marginBottom: "8px",
  backgroundColor: isActive ? "#0088CC" : "transparent",
  border: isActive
    ? "none"
    : `1px solid ${
        theme.palette.mode === "dark"
          ? "rgba(0, 136, 204, 0.3)"
          : "rgba(15, 15, 15, 0.08)"
      }`,
  padding: "16px",
  height: "70px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: isActive
      ? "#0088CC"
      : theme.palette.mode === "dark"
      ? "rgba(0, 136, 204, 0.1)"
      : "rgba(0, 136, 204, 0.1)",
    transform: "translateY(-1px)",
    boxShadow:
      theme.palette.mode === "light"
        ? "0 4px 12px rgba(15, 15, 15, 0.06)"
        : "none",
  },
}));

// Add new styled component for progress wrapper
const ProgressWrapper = styled(Box)({
  position: "relative",
  display: "inline-flex",
});

// Styled component for feedback item
const FeedbackItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  borderRadius: "6px",
  marginTop: "16px",
  backgroundColor: isActive ? "#0088CC" : "transparent",
  border: isActive
    ? "none"
    : `1px solid ${
        theme.palette.mode === "dark"
          ? "rgba(0, 136, 204, 0.3)"
          : "rgba(15, 15, 15, 0.08)"
      }`,
  padding: "16px",
  height: "70px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: isActive
      ? "#0088CC"
      : theme.palette.mode === "dark"
      ? "rgba(0, 136, 204, 0.1)"
      : "rgba(0, 136, 204, 0.1)",
    transform: "translateY(-1px)",
    boxShadow:
      theme.palette.mode === "light"
        ? "0 4px 12px rgba(15, 15, 15, 0.06)"
        : "none",
  },
}));

const CohortDetailLeft = ({
  cohort,
  modules,
  userProgress,
  handleModuleClick,
  currentModuleId,
  onProgressClick,
  showProgress,
  isAdmin = false,
  onStatsClick,
  showStats,
  handleEditModule,
  handleDeleteModule,
  handleOpenModuleDialog,
  handleBack,
  handleToggleDraftStatus,
  onFeedbackClick,
  showFeedback,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Removed duplicate state since it's managed by parent
  // const [currentModuleId, setCurrentModuleId] = useState(null);

  // Event handlers that call parent handlers
  const onModuleClick = (module) => {
    if (handleModuleClick) {
      handleModuleClick(module);
    }
  };

  // Function to calculate module progress correctly based on the actual data structure
  const calculateModuleProgress = (moduleId) => {
    if (!userProgress || !userProgress.moduleProgress) return 0;

    const moduleProgress = userProgress.moduleProgress.find(
      (mp) => String(mp.module) === String(moduleId)
    );
    if (!moduleProgress) return 0;

    // If module is completed, return 100%
    if (moduleProgress.completed) return 100;

    // Get questions for this module
    const moduleQuestions =
      modules?.find((m) => m._id === moduleId)?.questions || [];
    if (moduleQuestions.length === 0) return 0;

    // Count solved questions for this module
    let solvedCount = 0;
    if (
      userProgress.questionProgress &&
      userProgress.questionProgress.length > 0
    ) {
      moduleQuestions.forEach((question) => {
        const qId = String(question._id || question);
        const questionProgress = userProgress.questionProgress.find(
          (qp) => String(qp.question) === qId
        );
        if (questionProgress && questionProgress.solved) {
          solvedCount++;
        }
      });
    }

    // Calculate percentage
    return Math.round((solvedCount / moduleQuestions.length) * 100);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDarkMode ? "#000D16" : "#ffffff",
        borderRadius: "10px",
        boxShadow: isDarkMode
          ? "0 4px 15px rgba(0,0,0,0.15)"
          : "0 4px 12px rgba(15, 15, 15, 0.06)",
        border: isDarkMode ? "none" : "1px solid rgba(15, 15, 15, 0.08)",
        overflow: "hidden",
        flex: 1,
      }}
    >
      {/* Header Section with Cohort Title - Blue top section */}
      <Box
        sx={{
          bgcolor: "#0088CC",
          p: 3,
          borderTopLeftRadius: "10px",
          borderTopRightRadius: "10px",
          borderBottomLeftRadius: "0px",
          borderBottomRightRadius: "0px",
          position: "relative",
          zIndex: 1,
          boxShadow: isDarkMode ? "none" : "0 4px 12px rgba(0, 136, 204, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 700,
            color: "#ffffff",
            mb: 1,
            fontSize: "1.3rem",
          }}
        >
          {cohort?.title || "Hello World"}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "rgba(255,255,255,0.9)",
            mb: 2,
            fontSize: "0.85rem",
            lineHeight: 1.5,
          }}
        >
          {cohort?.description?.substring(0, 150) ||
            "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500..."}
          {cohort?.description?.length > 150 ? "..." : ""}
        </Typography>

        {/* Admin publish/unpublish status and button */}
        {isAdmin && cohort && cohort.isDraft !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Chip
              label={cohort.isDraft ? "Draft" : "Published"}
              color={cohort.isDraft ? "default" : "success"}
              size="small"
              sx={{
                bgcolor: cohort.isDraft
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(76, 175, 80, 0.3)",
                color: "#ffffff",
                mr: 2,
                fontSize: "0.75rem",
              }}
            />

            <Button
              variant="contained"
              size="small"
              onClick={handleToggleDraftStatus}
              sx={{
                textTransform: "none",
                py: 0.5,
                fontSize: "0.75rem",
                bgcolor: cohort.isDraft
                  ? "rgba(76, 175, 80, 0.8)"
                  : "rgba(244, 67, 54, 0.8)",
                color: "#ffffff",
                "&:hover": {
                  bgcolor: cohort.isDraft
                    ? "rgba(76, 175, 80, 1)"
                    : "rgba(244, 67, 54, 1)",
                },
                borderRadius: "50px",
              }}
            >
              {cohort.isDraft ? "Publish" : "Unpublish"}
            </Button>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 2 }}>
          {/* Progress button for all users (admin and regular) */}
          <Button
            variant="contained"
            startIcon={<InsightsIcon />}
            onClick={onProgressClick}
            sx={{
              bgcolor: showProgress ? alpha("#FFFFFF", 0.85) : "#FFFFFF",
              color: "#0088CC",
              borderRadius: "50px",
              textTransform: "none",
              fontWeight: "medium",
              px: 2.5,
              py: 0.75,
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.9)",
              },
            }}
          >
            Progress
          </Button>
        </Box>
      </Box>

      {/* Modules Section */}
      <Box
        sx={{
          px: 2,
          pt: 3,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: isDarkMode ? "#ffffff" : "#666666",
            fontSize: "1rem",
          }}
        >
          Modules
        </Typography>

        {/* Admin add module button */}
        {isAdmin && handleOpenModuleDialog && (
          <Tooltip title="Add Module">
            <IconButton
              onClick={handleOpenModuleDialog}
              size="small"
              sx={{
                color: isDarkMode ? "#0088CC" : "#0088CC",
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

      {/* Modules List - Scrollable Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          pb: 2,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(isDarkMode ? "#ffffff" : "#0F0F0F", 0.2),
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(isDarkMode ? "#ffffff" : "#0F0F0F", 0.3),
          },
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(
            isDarkMode ? "#ffffff" : "#0F0F0F",
            0.2
          )} transparent`,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={30} sx={{ color: "#0088CC" }} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {modules?.map((module) => {
              // Check if this module is completed by the user
              const moduleProgress = userProgress?.moduleProgress?.find(
                (mp) => mp.module === module._id
              );
              const isCompleted =
                moduleProgress?.isCompleted ||
                moduleProgress?.completed ||
                false;

              // Check if this is the currently selected module
              const isActive = currentModuleId === module._id;

              // Get progress for this module if not admin
              const progress = !isAdmin
                ? calculateModuleProgress(module._id)
                : 0;

              return (
                <ListItem
                  key={module._id}
                  disablePadding
                  sx={{
                    mb: 1.5,
                    display: "block",
                  }}
                >
                  <ModuleItem
                    isActive={isActive ? 1 : 0}
                    onClick={() => onModuleClick(module)}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "flex-start",
                        width: "100%",
                        position: "relative",
                        height: "100%",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: isActive ? 600 : 500,
                          color: isActive
                            ? "#ffffff"
                            : isDarkMode
                            ? "#dddddd"
                            : "#666666",
                          fontSize: "0.9rem",
                          mb: "4px",
                        }}
                      >
                        {module.title}
                      </Typography>

                      {/* Show completion counter for all modules */}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          color: isActive
                            ? "rgba(255, 255, 255, 0.7)"
                            : isDarkMode
                            ? "rgba(255, 255, 255, 0.6)"
                            : "rgba(0, 0, 0, 0.6)",
                        }}
                      >
                        {userProgress?.questionProgress?.filter(
                          (qp) =>
                            module.questions?.some(
                              (q) => String(q._id || q) === String(qp.question)
                            ) && qp.solved
                        ).length || 0}
                        /{module.questions?.length || 0} Completed
                      </Typography>

                      {/* Admin controls */}
                      {isAdmin && isActive && (
                        <Box
                          sx={{
                            display: "flex",
                            position: "absolute",
                            top: "50%",
                            right: "8px",
                            transform: "translateY(-50%)",
                            gap: "12px",
                          }}
                        >
                          {handleEditModule && (
                            <Tooltip title="Edit Module">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditModule(module);
                                }}
                                sx={{
                                  color: "#ffffff",
                                  p: 0.5,
                                  "&:hover": {
                                    bgcolor: "transparent",
                                  },
                                }}
                              >
                                <CreateRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {handleDeleteModule && (
                            <Tooltip title="Delete Module">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete the module "${module.title}"?`
                                    )
                                  ) {
                                    handleDeleteModule(module._id);
                                  }
                                }}
                                sx={{
                                  color: "#ff5252",
                                  p: 0.5,
                                  "&:hover": {
                                    bgcolor: "transparent",
                                  },
                                }}
                              >
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}

                      {/* Progress indicators for non-admin users */}
                      {!isAdmin && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            position: "absolute",
                            top: "50%",
                            right: "0",
                            transform: "translateY(-50%)",
                          }}
                        >
                          <ProgressWrapper>
                            <CircularProgress
                              variant="determinate"
                              value={100}
                              size={28}
                              thickness={4}
                              sx={{
                                color: isActive
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "rgba(0, 136, 204, 0.15)",
                                position: "absolute",
                                left: 0,
                                "& .MuiCircularProgress-circle": {
                                  strokeLinecap: "round",
                                },
                              }}
                            />
                            <CircularProgress
                              variant="determinate"
                              value={progress}
                              size={28}
                              thickness={4}
                              sx={{
                                color: isActive ? "#ffffff" : "#0088CC",
                                "& .MuiCircularProgress-circle": {
                                  strokeLinecap: "round",
                                },
                              }}
                            />

                            {/* Show tick mark when progress is 100% */}
                            {progress === 100 && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  right: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <CheckRoundedIcon
                                  sx={{
                                    color: isActive ? "#ffffff" : "#0088CC",
                                    fontSize: "16px",
                                  }}
                                />
                              </Box>
                            )}
                          </ProgressWrapper>
                        </Box>
                      )}
                    </Box>
                  </ModuleItem>
                </ListItem>
              );
            })}

            {modules.length === 0 && !loading && !error && (
              <Typography
                variant="body2"
                sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
              >
                {isAdmin
                  ? "No modules available. Click the '+' button to add a module."
                  : "No modules available for this cohort."}
              </Typography>
            )}
          </List>
        )}

        {/* Feedback Card - Now inside the scrollable area */}
        {!isAdmin && userProgress && (
          <>
            <Divider sx={{ mx: 0, my: 1, opacity: 0.6 }} />
            <FeedbackItem
              isActive={showFeedback ? 1 : 0}
              onClick={onFeedbackClick}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  position: "relative",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: showFeedback
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 136, 204, 0.1)",
                    mr: 2,
                  }}
                >
                  <FeedbackIcon
                    sx={{
                      color: showFeedback ? "#ffffff" : "#0088CC",
                      fontSize: "1.5rem",
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: showFeedback ? 600 : 500,
                      color: showFeedback
                        ? "#ffffff"
                        : isDarkMode
                        ? "#dddddd"
                        : "#666666",
                      fontSize: "0.9rem",
                    }}
                  >
                    Rate & Review
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.7rem",
                      color: showFeedback
                        ? "rgba(255, 255, 255, 0.7)"
                        : isDarkMode
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    Share your experience
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    marginLeft: "auto",
                  }}
                >
                  <StarIcon
                    sx={{
                      color: showFeedback ? "#ffffff" : "#FFD700",
                      fontSize: "1.1rem",
                    }}
                  />
                </Box>
              </Box>
            </FeedbackItem>
          </>
        )}
      </Box>
    </Box>
  );
};

export default CohortDetailLeft;
