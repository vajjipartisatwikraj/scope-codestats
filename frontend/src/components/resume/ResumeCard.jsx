import React from "react";
import { Box, Button, Card, CardContent, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import {
  Delete as DeleteIcon,
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { formatUpdatedAt } from "../../utils/resume";

/**
 * A single resume in the list. Styled to match the platform's course cards.
 * Edit opens the builder in a new tab.
 */
const ResumeCard = ({ resume, templateName, darkMode, onEdit, onDelete }) => (
  <Card
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      bgcolor: darkMode ? "rgba(255,255,255,0.08)" : "#ffffff",
      backdropFilter: "blur(10px)",
      border: darkMode
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.1)",
      borderRadius: "16px",
      position: "relative",
      transition: "all 0.3s ease",
      "&:hover": {
        transform: "translateY(-8px)",
        boxShadow: darkMode
          ? "0 20px 40px rgba(0,0,0,0.4)"
          : "0 20px 40px rgba(0,0,0,0.1)",
        border: darkMode
          ? "1px solid rgba(255, 255, 255, 0.2)"
          : "1px solid rgba(0, 0, 0, 0.2)",
        "& .resume-icon": { transform: "scale(1.08)" },
      },
    }}
  >
    {/* Template badge, mirroring the course level chip */}
    <Chip
      label={templateName}
      size="small"
      sx={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 2,
        bgcolor: "rgba(0, 136, 204, 0.15)",
        color: "#0088cc",
        border: "1px solid rgba(0, 136, 204, 0.3)",
        fontWeight: 500,
      }}
    />

    <CardContent sx={{ flexGrow: 1, p: 3 }}>
      <Box
        className="resume-icon"
        sx={{
          width: 52,
          height: 52,
          mb: 2,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(0,136,204,0.15)",
          color: "#0088cc",
          transition: "transform 0.3s ease",
        }}
      >
        <ArticleIcon sx={{ fontSize: 28 }} />
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: "1.05rem",
          color: darkMode ? "#ffffff" : "#000000",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {resume.title}
      </Typography>

      <Typography
        variant="caption"
        sx={{ color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}
      >
        Edited {formatUpdatedAt(resume.updatedAt)}
      </Typography>
    </CardContent>

    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderTop: `1px solid ${
          darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
        }`,
      }}
    >
      <Button
        size="small"
        startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
        onClick={() => onEdit(resume)}
        sx={{ textTransform: "none", color: "#0088cc", fontWeight: 600 }}
      >
        Open editor
      </Button>

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Delete resume">
        <IconButton size="small" onClick={() => onDelete(resume)} sx={{ color: "#f44336" }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  </Card>
);

export default ResumeCard;
