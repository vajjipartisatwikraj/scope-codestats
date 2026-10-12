import React, { useState } from "react";
import { Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import GroupIcon from "@mui/icons-material/Group";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PublishIcon from "@mui/icons-material/Publish";
import UnpublishedOutlinedIcon from "@mui/icons-material/UnpublishedOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SetupCard from "../setup/SetupCard";
import CardBanner from "../setup/CardBanner";
import SetupButton from "../setup/SetupButton";
import StatTile from "../setup/StatTile";
import useSurface from "../setup/useSurface";
import ExamStatusPill from "../overview/ExamStatusPill";
import { SECTION_TYPE_META, formatShortDateTime } from "../speechTestMeta";

const clip = (text, max) => (text && text.length > max ? `${text.slice(0, max).trim()}…` : text);

/**
 * One test in the admin's grid: a banner with its name and schedule, headline
 * numbers, the types of its sections, and the actions. Less frequent actions
 * (publish, duplicate, export, delete) live in the menu.
 */
const AdminTestCard = ({
  test,
  onEdit,
  onResults,
  onStudents,
  onTogglePublish,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const { muted, divider } = useSurface();
  const [anchor, setAnchor] = useState(null);

  const choose = (action) => () => {
    setAnchor(null);
    action(test);
  };

  return (
    <SetupCard>
      <CardBanner
        compact
        label={test.isPublished ? "Published" : "Draft"}
        badge={test.isPublished ? <ExamStatusPill status={test.state} /> : null}
        title={test.title}
        description={clip(test.description, 110)}
        watermark={RecordVoiceOverIcon}
      >
        <Typography sx={{ fontSize: "0.86rem", lineHeight: 1.6 }}>
          {formatShortDateTime(test.startTime)} to {formatShortDateTime(test.endTime)}
        </Typography>
      </CardBanner>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <StatTile value={test.sectionCount} label="Sections" />
          <StatTile value={test.questionCount} label="Questions" separated />
          <StatTile value={test.eligibleCount} label="Students" separated />
          <StatTile value={test.completedCount} label="Completed" separated />
        </Box>

        <Typography sx={{ color: muted, fontSize: "0.82rem", minHeight: 20 }}>
          {test.attemptCount > test.completedCount && `${test.attemptCount - test.completedCount} taking it now`}
          {test.attemptCount > test.completedCount && test.feedbackCount > 0 && " · "}
          {test.feedbackCount > 0 &&
            `${test.feedbackCount} feedback${test.feedbackAverage != null ? ` · ★ ${test.feedbackAverage}` : ""}`}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", minHeight: 24 }}>
          {[...new Set(test.sections.map((s) => s.type))].map((type) => (
            <Box
              key={type}
              sx={{
                px: 1.1,
                py: 0.2,
                borderRadius: "999px",
                fontSize: "0.74rem",
                fontWeight: 600,
                color: SECTION_TYPE_META[type].color,
                border: `1px solid ${SECTION_TYPE_META[type].color}55`,
              }}
            >
              {SECTION_TYPE_META[type].label}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: "auto", pt: 0.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <SetupButton onClick={() => onEdit(test)} startIcon={<EditOutlinedIcon />} sx={{ px: 2.25 }}>
            Edit
          </SetupButton>
          <SetupButton variant="secondary" onClick={() => onStudents(test)} startIcon={<GroupIcon />} sx={{ px: 2 }}>
            Students
          </SetupButton>
          <Tooltip title="Results and leaderboard">
            <IconButton onClick={() => onResults(test)} aria-label={`Results of ${test.title}`}>
              <LeaderboardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label={`More actions for ${test.title}`}
            sx={{ ml: "auto" }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={choose(onTogglePublish)}>
          <ListItemIcon>
            {test.isPublished ? <UnpublishedOutlinedIcon fontSize="small" /> : <PublishIcon fontSize="small" />}
          </ListItemIcon>
          {test.isPublished ? "Unpublish" : "Publish to students"}
        </MenuItem>
        <MenuItem onClick={choose(onDuplicate)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          Duplicate
        </MenuItem>
        <MenuItem onClick={choose(onExport)}>
          <ListItemIcon>
            <FileDownloadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Download JSON
        </MenuItem>
        <Divider sx={{ borderColor: divider }} />
        <MenuItem onClick={choose(onDelete)} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </SetupCard>
  );
};

export default AdminTestCard;
