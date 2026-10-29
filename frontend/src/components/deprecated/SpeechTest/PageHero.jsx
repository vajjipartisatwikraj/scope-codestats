import React from "react";
import { Box, Container, Typography, useTheme } from "@mui/material";

/**
 * Blue banner used at the top of the speech test pages, matching the hero on
 * Practice Arena and the Leaderboard so the section feels native to the app.
 */
const PageHero = ({ title, icon, description, actions }) => {
  const theme = useTheme();

  return (
    <Container maxWidth={false} sx={{ pt: { xs: 4, md: 6 }, px: { xs: 2, sm: 10 }, pb: 2 }}>
      <Box
        sx={{
          mx: "auto",
          mt: { xs: 0, sm: 2, md: 2 },
          bgcolor: "#0585E0",
          border: `1px solid ${theme.palette.mode === "dark" ? "#232323" : "transparent"}`,
          borderRadius: "20px",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          p: { xs: 3, md: 3 },
          minHeight: { md: 100 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              color: "#ffffff",
              fontWeight: 700,
              mb: description ? 1.5 : 0,
              fontSize: { xs: "1.6rem", sm: "1.7rem" },
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            {title}
            {icon}
          </Typography>
          {description && (
            <Typography
              variant="body1"
              sx={{ color: "#ffffff", fontWeight: 200, fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 640 }}
            >
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{actions}</Box>}
      </Box>
    </Container>
  );
};

export default PageHero;
