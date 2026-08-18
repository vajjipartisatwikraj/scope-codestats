import React from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  alpha,
  useTheme as useMuiTheme,
  Avatar,
  AvatarGroup,
  Rating,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import { getExamAccent } from "../../utils/examCardTheme";

/**
 * Exam cohorts are tinted so a timed assessment is never mistaken for a practice
 * cohort at a glance: red while it is scheduled or running, green once the window
 * has closed. Selected state keeps a solid fill for contrast with the white card
 * text, which is why the accents use mid-tones rather than pastels.
 */
const CohortCard = styled(ListItemButton, {
  shouldForwardProp: (prop) =>
    prop !== "isActive" && prop !== "darkMode" && prop !== "examAccent",
})(({ theme, isActive, darkMode, examAccent }) => ({
  borderRadius: "12px",
  marginBottom: "16px",
  padding: "20px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  background: examAccent
    ? isActive
      ? examAccent.solid
      : darkMode
      ? examAccent.fillDark
      : examAccent.fillLight
    : isActive
    ? "#0088CC"
    : darkMode
    ? "transparent"
    : "#FFFFFF",
  border: `1px solid ${
    examAccent
      ? isActive
        ? examAccent.solidBorder
        : examAccent.border
      : isActive
      ? "#0077b6"
      : darkMode
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.12)"
  }`,
  boxShadow: isActive
    ? darkMode
      ? "0 4px 12px rgba(0, 0, 0, 0.3)"
      : "0 4px 12px rgba(0, 0, 0, 0.15)"
    : darkMode
    ? "0 2px 8px rgba(0, 0, 0, 0.2)"
    : "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
  position: "relative",
  overflow: "hidden",
  "&::after": darkMode
    ? {
        content: '""',
        position: "absolute",
        bottom: -180,
        right: -100,
        width: "300px",
        height: "300px",
        background: examAccent ? examAccent.glow : "rgba(30, 111, 169, 0.65)",
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 1,
      }
    : {},
  "&:hover": {
    backgroundColor: examAccent
      ? isActive
        ? examAccent.solidHover
        : darkMode
        ? examAccent.hoverDark
        : examAccent.hoverLight
      : isActive
      ? "#006699"
      : darkMode
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 136, 204, 0.04)",
    boxShadow: isActive
      ? darkMode
        ? "0 6px 16px rgba(0, 0, 0, 0.4)"
        : "0 6px 16px rgba(0, 0, 0, 0.2)"
      : darkMode
      ? "0 6px 16px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)"
      : "0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
    transform: "translateY(-3px)",
    border: `1px solid ${
      examAccent
        ? isActive
          ? examAccent.solidBorder
          : examAccent.borderHover
        : isActive
        ? "#005580"
        : darkMode
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 136, 204, 0.2)"
    }`,
  },
}));

const CohortListLeft = ({
  cohorts,
  activeTab,
  handleCohortClick,
  selectedCohortId,
}) => {
  const muiTheme = useMuiTheme();
  const { darkMode } = useAppTheme();

  // Function to render individual cohort card
  const renderCohortCard = (cohort) => {
    const isActive = selectedCohortId === cohort._id;
    // Red while an exam is scheduled or running, green once it has finished,
    // null for practice cohorts.
    const examAccent = getExamAccent(cohort);

    return (
      <CohortCard
        key={cohort._id}
        isActive={isActive}
        darkMode={darkMode}
        examAccent={examAccent}
        onClick={() => handleCohortClick(cohort)}
        sx={
          {
            // Styling is now handled in the styled component
          }
        }
      >
        <Box sx={{ width: "100%", position: "relative" }}>
          {/* Removing the blue top bar as requested */}

          <Box sx={{ p: 0, position: "relative", zIndex: 2 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: 700,
                fontSize: "1.4rem",
                lineHeight: 1.3,
                color: isActive ? "white" : darkMode ? "white" : "#0F0F0F",
                mb: 1,
              }}
            >
              {cohort.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: isActive
                  ? "rgba(255, 255, 255, 0.9)"
                  : darkMode
                  ? "rgba(255, 255, 255, 0.8)"
                  : "rgba(15, 15, 15, 0.7)",
                mb: 3,
                fontSize: "1rem",
                opacity: 0.8,
              }}
            >
              {cohort.modules?.length || 0} Modules
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: isActive ? "white" : darkMode ? "white" : "#0F0F0F",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    mr: 1,
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 12.75C13.63 12.75 15.07 13.14 16.24 13.65C17.32 14.13 18 15.21 18 16.38V17C18 17.55 17.55 18 17 18H7C6.45 18 6 17.55 6 17V16.39C6 15.21 6.68 14.13 7.76 13.66C8.93 13.14 10.37 12.75 12 12.75ZM4 13C5.1 13 6 12.1 6 11C6 9.9 5.1 9 4 9C2.9 9 2 9.9 2 11C2 12.1 2.9 13 4 13ZM5.13 14.1C4.76 14.04 4.39 14 4 14C3.01 14 2.07 14.21 1.22 14.58C0.48 14.9 0 15.62 0 16.43V17C0 17.55 0.45 18 1 18H4.5V16.39C4.5 15.56 4.73 14.78 5.13 14.1ZM20 13C21.1 13 22 12.1 22 11C22 9.9 21.1 9 20 9C18.9 9 18 9.9 18 11C18 12.1 18.9 13 20 13ZM24 16.43C24 15.62 23.52 14.9 22.78 14.58C21.93 14.21 20.99 14 20 14C19.61 14 19.24 14.04 18.87 14.1C19.27 14.78 19.5 15.56 19.5 16.39V18H23C23.55 18 24 17.55 24 17V16.43ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6Z"
                      fill={isActive ? "white" : darkMode ? "white" : "#333333"}
                    />
                  </svg>
                </Box>
                {cohort.eligibleUsers?.length || 0}+ Users Enrolled
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    // The rating badge follows the card's accent so a blue chip
                    // never sits on a red exam card.
                    bgcolor: isActive
                      ? "rgba(255, 255, 255, 0.2)"
                      : examAccent
                      ? examAccent.solid
                      : "#0088CC",
                    color: "white",
                    borderRadius: "4px",
                    px: 1,
                    py: 0.2,
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    lineHeight: 1.5,
                    border: isActive
                      ? "1px solid rgba(255, 255, 255, 0.3)"
                      : "none",
                  }}
                >
                  {cohort.averageRating?.toFixed(1) || "0.0"}
                </Box>
                <Rating
                  value={cohort.averageRating || 0}
                  readOnly
                  size="small"
                  precision={0.5}
                  icon={
                    <StarRateRoundedIcon
                      fontSize="small"
                      sx={{
                        color: isActive
                          ? "white"
                          : darkMode
                          ? "white"
                          : "#FFC107",
                      }}
                    />
                  }
                  emptyIcon={
                    <StarRateRoundedIcon
                      fontSize="small"
                      sx={{
                        color: isActive
                          ? "rgba(255, 255, 255, 0.5)"
                          : darkMode
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(0, 0, 0, 0.2)",
                      }}
                    />
                  }
                  sx={{ fontSize: "1.1rem" }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </CohortCard>
    );
  };

  return (
    <Box
      sx={{
        height: "80vh", // Fixed height
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Scrollable Cohort List or Empty State */}
      <Box
        sx={{
          height: "100%", // Take full height of parent
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": {
            width: "5px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: darkMode
              ? "rgba(61, 61, 61, 0.50)"
              : "rgba(0, 0, 0, 0.20)",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: darkMode
              ? "rgba(61, 61, 61, 0.50)"
              : "rgba(0, 0, 0, 0.30)",
          },
        }}
      >
        {cohorts.length > 0 ? (
          <List sx={{ p: 0 }}>
            {cohorts.map((cohort) => renderCohortCard(cohort))}
          </List>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              p: 4,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
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
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 12.75C13.63 12.75 15.07 13.14 16.24 13.65C17.32 14.13 18 15.21 18 16.38V17C18 17.55 17.55 18 17 18H7C6.45 18 6 17.55 6 17V16.39C6 15.21 6.68 14.13 7.76 13.66C8.93 13.14 10.37 12.75 12 12.75ZM4 13C5.1 13 6 12.1 6 11C6 9.9 5.1 9 4 9C2.9 9 2 9.9 2 11C2 12.1 2.9 13 4 13ZM5.13 14.1C4.76 14.04 4.39 14 4 14C3.01 14 2.07 14.21 1.22 14.58C0.48 14.9 0 15.62 0 16.43V17C0 17.55 0.45 18 1 18H4.5V16.39C4.5 15.56 4.73 14.78 5.13 14.1ZM20 13C21.1 13 22 12.1 22 11C22 9.9 21.1 9 20 9C18.9 9 18 9.9 18 11C18 12.1 18.9 13 20 13ZM24 16.43C24 15.62 23.52 14.9 22.78 14.58C21.93 14.21 20.99 14 20 14C19.61 14 19.24 14.04 18.87 14.1C19.27 14.78 19.5 15.56 19.5 16.39V18H23C23.55 18 24 17.55 24 17V16.43ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6Z"
                  fill={
                    darkMode
                      ? "rgba(0, 136, 204, 0.4)"
                      : "rgba(0, 136, 204, 0.3)"
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
              You are not enrolled in any cohort
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                maxWidth: "300px",
                lineHeight: 1.6,
              }}
            >
              Contact your administrator to get enrolled in a cohort and start
              your learning journey
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CohortListLeft;
