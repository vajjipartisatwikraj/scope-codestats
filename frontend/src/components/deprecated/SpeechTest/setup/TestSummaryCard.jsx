import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SetupCard from "./SetupCard";
import CardBanner from "./CardBanner";
import StatTile from "./StatTile";
import InfoLine from "./InfoLine";
import useSurface from "./useSurface";
import { formatDuration, formatShortDateTime, typeLabel } from "../speechTestMeta";

/**
 * Everything a student should know about a test before starting: a banner with
 * its name, headline figures (sections, questions, time), when it is open, how
 * it is scored and which skills it covers. All values come from the test.
 *
 * It is laid out compactly so it fits beside the tips without the page
 * scrolling. On short screens the "Covers" list is dropped, and if the card is
 * still taller than the space it has, only the card scrolls.
 */
const TestSummaryCard = ({ test }) => {
  const { border, divider, muted } = useSurface();

  const questionCount = test.sections.reduce((sum, s) => sum + s.questionCount, 0);
  const totalMinutes = test.sections.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
  const skills = [...new Set(test.sections.map((s) => s.type))];

  return (
    <SetupCard>
      <CardBanner
        compact
        label="Communication test"
        title={test.title}
        description={test.description || "Read, listen, speak and tell stories."}
        watermark={RecordVoiceOverIcon}
      />

      <Box
        sx={{
          p: 2.5,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          scrollbarWidth: "thin",
        }}
      >
        {/* Headline figures */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            pb: 1.75,
            borderBottom: `1px solid ${divider}`,
          }}
        >
          <StatTile value={test.sections.length} label="Sections" />
          <StatTile value={questionCount} label="Questions" separated />
          <StatTile value={formatDuration(totalMinutes)} label="Total time" separated />
        </Box>

        {/* Facts: one vertical list, left-aligned */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.5 }}>
          <InfoLine
            icon={CalendarMonthOutlinedIcon}
            label="Available"
            value={`${formatShortDateTime(test.startTime)} to ${formatShortDateTime(test.endTime)}`}
          />
          <InfoLine icon={StarBorderRoundedIcon} label="Scoring" value="Out of 100" />
          <InfoLine icon={LockOutlinedIcon} label="Attempts" value="One attempt" />
        </Box>

        {/* Skills (hidden on short screens to save room) */}
        <Box
          sx={{
            mt: "auto", // pinned to the bottom of the card
            pt: 1.75,
            borderTop: `1px solid ${divider}`,
            "@media (max-height: 680px)": { display: "none" },
          }}
        >
          <Typography variant="body2" sx={{ color: muted, mb: 0.9, fontSize: "0.82rem" }}>
            Covers
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
            {skills.map((type) => (
              <Chip
                key={type}
                size="small"
                variant="outlined"
                label={typeLabel(type)}
                sx={{ borderColor: border, fontWeight: 500, fontSize: "0.78rem" }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </SetupCard>
  );
};

export default TestSummaryCard;
