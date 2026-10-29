import React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { getInnerGlassStyle } from "../Dashboard/dashboardUtils";

/**
 * What to say for each `state` the backend can answer with (see
 * backend/services/platformProgress/progressService.js). Returns the message, the severity
 * and which action button to offer, or null for the states that have data to chart.
 */
function describeState(answer, name) {
  const username = answer.username ? ` "${answer.username}"` : "";
  switch (answer.state) {
    case "not_linked":
      return {
        severity: "info",
        title: `No ${name} username yet`,
        text: `Add your ${name} username on the Platforms tab and your progress will start building here.`,
        action: "link",
      };
    case "pending":
      return {
        severity: "info",
        title: "Waiting for the first update",
        text: `Your ${name} username${username} is saved, but its first update has not finished. Press update on the Platforms tab, or wait for the nightly sync.`,
        action: "link",
      };
    case "invalid_username":
      return {
        severity: "error",
        title: `${name} could not find that account`,
        text: `${answer.message || `The username${username} does not exist or is private.`} Fix the username on the Platforms tab.`,
        action: "link",
      };
    case "sync_failed":
      return {
        severity: "warning",
        title: `The first ${name} update failed`,
        text: `${answer.message || "The platform did not answer."} It is tried again at every sync, or you can press update on the Platforms tab.`,
        action: "link",
      };
    case "no_history":
      return {
        severity: "info",
        title: "Nothing to chart yet",
        text: `Your ${name} account${username} is linked, but it has no solved problems or contests yet. Your history starts building as soon as its numbers change.`,
        action: null,
      };
    case "unavailable":
      return {
        severity: "warning",
        title: `${name} data is unavailable`,
        text: answer.message || "It could not be loaded right now.",
        action: "retry",
      };
    case "rate_limited":
      return {
        severity: "warning",
        title: `${name} is limiting requests`,
        text: answer.message || "Try again in a few minutes.",
        action: "retry",
      };
    default:
      return null;
  }
}

/** True when the state has no data to draw (the notice replaces the charts). */
export const isNoticeState = (answer) => Boolean(answer && describeState(answer, "") !== null);

const ProgressStateNotice = ({ answer, platformName, darkMode, onManagePlatforms, onRetry }) => {
  const info = describeState(answer, platformName);
  if (!info) return null;

  return (
    <Box sx={{ ...getInnerGlassStyle(darkMode), p: { xs: 2, sm: 3 }, "&:hover": { transform: "none" } }}>
      <Alert
        severity={info.severity}
        variant="outlined"
        sx={{ alignItems: "center" }}
        action={
          info.action === "link" && onManagePlatforms ? (
            <Button color="inherit" size="small" onClick={onManagePlatforms}>
              Go to Platforms
            </Button>
          ) : info.action === "retry" && onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Try again
            </Button>
          ) : null
        }
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{info.title}</Typography>
        <Typography variant="body2">{info.text}</Typography>
      </Alert>
    </Box>
  );
};

export default ProgressStateNotice;
