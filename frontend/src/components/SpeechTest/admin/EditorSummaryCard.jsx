import React from "react";
import { Box, Typography } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SaveIcon from "@mui/icons-material/Save";
import GroupIcon from "@mui/icons-material/Group";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SetupCard from "../setup/SetupCard";
import CardBanner from "../setup/CardBanner";
import SetupButton from "../setup/SetupButton";
import StatTile from "../setup/StatTile";
import useSurface from "../setup/useSurface";
import { formatDuration, formatShortDateTime } from "../speechTestMeta";

/**
 * The editor's side card, same look as the student's test card: the test's name
 * and schedule on the blue banner, headline numbers, and the main actions.
 */
const EditorSummaryCard = ({ form, isNew, saving, eligibleCount, onSave, onStudents, onExport }) => {
  const { muted } = useSurface();

  const questions = form.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const minutes = form.sections.reduce((sum, s) => sum + (Number(s.timeLimitMinutes) || 0), 0);

  return (
    <SetupCard sx={{ height: "auto" }}>
      <CardBanner
        compact
        label={isNew ? "New test" : form.isPublished ? "Published" : "Draft"}
        title={form.title.trim() || "Untitled test"}
        watermark={RecordVoiceOverIcon}
      >
        <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
          {form.startTime ? formatShortDateTime(form.startTime) : "Start not set"} to{" "}
          {form.endTime ? formatShortDateTime(form.endTime) : "end not set"}
        </Typography>
      </CardBanner>

      <Box sx={{ p: 2.75, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          <StatTile value={form.sections.length} label="Sections" />
          <StatTile value={questions} label="Questions" separated />
          <StatTile value={formatDuration(minutes)} label="Total time" separated />
        </Box>

        <SetupButton onClick={onSave} loading={saving} startIcon={<SaveIcon />}>
          {isNew ? "Create test" : "Save changes"}
        </SetupButton>

        {isNew ? (
          <Typography sx={{ color: muted, fontSize: "0.88rem", lineHeight: 1.6 }}>
            Save the test first. Then you can choose which students can take it.
          </Typography>
        ) : (
          <>
            <SetupButton variant="secondary" onClick={onStudents} startIcon={<GroupIcon />}>
              Students ({eligibleCount})
            </SetupButton>
            <SetupButton variant="secondary" onClick={onExport} startIcon={<FileDownloadOutlinedIcon />}>
              Download JSON
            </SetupButton>
          </>
        )}
      </Box>
    </SetupCard>
  );
};

export default EditorSummaryCard;
