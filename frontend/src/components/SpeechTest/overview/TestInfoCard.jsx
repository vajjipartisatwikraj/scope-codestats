import React from "react";
import { Box, Typography } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SetupCard from "../setup/SetupCard";
import CardBanner from "../setup/CardBanner";
import useSurface from "../setup/useSurface";
import ProgressPanel from "./ProgressPanel";
import ExamStatusPill from "./ExamStatusPill";
import { formatDateTime } from "../speechTestMeta";

const TimeLine = ({ label, value }) => (
  <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
    <Box component="span" sx={{ fontWeight: 700 }}>
      {label}
    </Box>{" "}
    {value}
  </Typography>
);

/**
 * The fixed side card of the section list: a blue banner with the test's name,
 * description, window and the student's exam status, and below it the progress
 * and finish controls. With a `note` and no progress (the student has no
 * attempt) it shows that message instead of the controls.
 */
const TestInfoCard = ({ test, status, note, ...progress }) => {
  const { muted } = useSurface();

  return (
    <SetupCard sx={{ flex: 1, height: "auto", minHeight: 0, overflowY: "auto" }}>
      <CardBanner
        compact
        label="Communication test"
        badge={<ExamStatusPill status={status} />}
        title={test.title}
        description={test.description}
        watermark={RecordVoiceOverIcon}
      >
        <TimeLine label="Starts" value={formatDateTime(test.startTime)} />
        <TimeLine label="Ends" value={formatDateTime(test.endTime)} />
      </CardBanner>

      {note ? (
        <Box sx={{ p: 2.75 }}>
          <Typography sx={{ color: muted, fontSize: "0.92rem", lineHeight: 1.6 }}>{note}</Typography>
        </Box>
      ) : (
        <ProgressPanel {...progress} />
      )}
    </SetupCard>
  );
};

export default TestInfoCard;
