import React from "react";
import { Box, IconButton, List, ListItem, Tooltip } from "@mui/material";
import {
  Home as HomeIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useTheme } from "../../contexts/ThemeContext";

// Matches the cohort problem-solving rail so the two full-screen editors feel
// like the same product.
export const RESUME_SIDEBAR_WIDTH = 60;

const NAV_BG = "#0088CC";
const BUTTON_BG = "#FFFFFF";
const BUTTON_COLOR = "#000000";
const BUTTON_HOVER_BG = "#F0F0F0";

const circleButtonSx = (size) => ({
  width: size,
  height: size,
  bgcolor: BUTTON_BG,
  color: BUTTON_COLOR,
  borderRadius: "50%",
  "&:hover": {
    bgcolor: BUTTON_HOVER_BG,
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
});

const ResumeSidebar = () => {
  const { darkMode, toggleTheme } = useTheme();

  // The editor opens in its own tab, so "back" means the resume list
  const goToResumes = () => {
    window.location.href = "/build-resume";
  };

  const goHome = () => {
    window.location.href = "/dashboard";
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100%",
        width: RESUME_SIDEBAR_WIDTH,
        boxSizing: "border-box",
        bgcolor: NAV_BG,
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 1250,
      }}
    >
      <Box>
        {/* Logo in a white rounded tile */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 1,
            m: 1,
            mb: 2,
            borderRadius: "10px",
            bgcolor: "#FFFFFF",
            boxShadow: darkMode
              ? "0 4px 8px rgba(0,0,0,0.3)"
              : "0 4px 8px rgba(0,0,0,0.1)",
            width: "48px",
            height: "48px",
            mx: "auto",
          }}
        >
          <img
            src="/scope-blac.png"
            alt="Scope Logo"
            style={{ maxHeight: "32px", maxWidth: "100%", objectFit: "contain" }}
          />
        </Box>

        <List>
          <ListItem sx={{ display: "flex", justifyContent: "center", mb: 2, p: 0.5 }}>
            <Tooltip title="Back to my resumes" placement="right">
              <IconButton onClick={goToResumes} sx={circleButtonSx(36)}>
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </ListItem>
          <ListItem sx={{ display: "flex", justifyContent: "center", mb: 2, p: 0.5 }}>
            <Tooltip title="Home" placement="right">
              <IconButton onClick={goHome} sx={circleButtonSx(36)}>
                <HomeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>

      <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
        <Tooltip title="Toggle Dark Mode" placement="right">
          <IconButton onClick={toggleTheme} sx={circleButtonSx(32)}>
            {darkMode ? (
              <Brightness7Icon sx={{ fontSize: 16, color: BUTTON_COLOR }} />
            ) : (
              <Brightness4Icon sx={{ fontSize: 16, color: BUTTON_COLOR }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default ResumeSidebar;
