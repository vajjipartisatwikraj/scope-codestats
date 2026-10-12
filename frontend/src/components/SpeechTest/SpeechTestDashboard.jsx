import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, CircularProgress, Container, IconButton, Paper, Tooltip, Typography, useTheme } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import BarChartIcon from "@mui/icons-material/BarChart";
import { toast } from "react-toastify";
import PageHero from "./PageHero";
import SetupCard from "./setup/SetupCard";
import CardBanner from "./setup/CardBanner";
import SetupButton from "./setup/SetupButton";
import StatTile from "./setup/StatTile";
import useSurface from "./setup/useSurface";
import ExamStatusPill from "./overview/ExamStatusPill";
import { examStatusOf } from "./overview/examStatus";
import { studentApi, apiErrorMessage } from "../../services/speechTestApi";
import { BRAND, formatCountdown, formatDateTime, formatScore } from "./speechTestMeta";

const POLL_MS = 30000;

const clip = (text, max) => (text && text.length > max ? `${text.slice(0, max).trim()}…` : text);

const TimeLine = ({ label, value }) => (
  <Typography sx={{ fontSize: "0.86rem", lineHeight: 1.6 }}>
    <Box component="span" sx={{ fontWeight: 700 }}>
      {label}
    </Box>{" "}
    {value}
  </Typography>
);

/**
 * One test in the student's grid, built like the card on the section list: a blue
 * banner with the name and schedule, headline numbers, one line about timing, and
 * the main action next to the leaderboard.
 */
const TestCard = ({ test, state, serverNow, onOpen, onLeaderboard }) => {
  const { border, muted, accent } = useSurface();

  const attempt = test.attempt;
  const completed = attempt?.status === "completed";
  const total = test.sections.length;
  const scored = attempt?.sections?.filter((s) => s.status === "scored").length || 0;
  const startsIn = new Date(test.startTime).getTime() - serverNow;
  const endsIn = new Date(test.endTime).getTime() - serverNow;

  // What the button does, and whether it is the call to action (filled) or a quiet one.
  let action;
  if (completed) action = { label: "View result", primary: false, icon: <BarChartIcon /> };
  else if (attempt) {
    action = {
      label: "Continue test",
      primary: true,
      icon: <PlayArrowIcon />,
      disabled: state === "ended" && attempt.status !== "in_progress",
    };
  } else if (state === "live") action = { label: "Start test", primary: true, icon: <PlayArrowIcon /> };
  else if (state === "upcoming") action = { label: "Not started yet", primary: false, disabled: true };
  else action = { label: "Missed", primary: false, disabled: true };

  // One line of timing context under the numbers.
  let note = null;
  let noteColor = muted;
  if (!completed && state === "upcoming" && startsIn > 0) {
    note = `Opens in ${formatCountdown(startsIn)}`;
    noteColor = accent;
  } else if (!completed && state === "live" && endsIn > 0) {
    note = `Closes in ${formatCountdown(endsIn)}`;
    noteColor = accent;
  } else if (completed) {
    note = "You have finished this test";
  } else if (state === "ended" && !attempt) {
    note = "The window closed before you started";
  }

  const highlighted = state === "live" && !completed;

  return (
    <SetupCard
      sx={{
        ...(highlighted && { borderColor: accent }),
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 28px rgba(0, 0, 0, 0.22)" },
      }}
    >
      <CardBanner
        compact
        label="Communication test"
        badge={<ExamStatusPill status={examStatusOf(state, attempt)} />}
        title={test.title}
        description={clip(test.description, 100)}
        watermark={RecordVoiceOverIcon}
      >
        <TimeLine label="Starts" value={formatDateTime(test.startTime)} />
        <TimeLine label="Ends" value={formatDateTime(test.endTime)} />
      </CardBanner>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          <StatTile value={total} label={total === 1 ? "Section" : "Sections"} />
          <StatTile value={attempt ? `${scored}/${total}` : "–"} label="Scored" separated />
          <StatTile value={completed ? formatScore(attempt.finalScore) : "–"} label="Final score" separated />
        </Box>

        <Typography sx={{ color: noteColor, fontSize: "0.86rem", fontWeight: noteColor === muted ? 400 : 600, minHeight: 22 }}>
          {note}
        </Typography>

        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
          <SetupButton
            variant={action.primary ? "primary" : "secondary"}
            disabled={action.disabled}
            startIcon={action.icon}
            onClick={onOpen}
            sx={{ flex: 1 }}
          >
            {action.label}
          </SetupButton>
          <Tooltip title="Leaderboard">
            <IconButton
              onClick={onLeaderboard}
              aria-label={`Leaderboard of ${test.title}`}
              sx={{ borderRadius: "10px", border: `1px solid ${border}`, width: 44, "&:hover": { borderColor: accent } }}
            >
              <LeaderboardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </SetupCard>
  );
};

/** Student-side list of scheduled speech tests. */
const SpeechTestDashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  // Server minus browser clock, so "live" follows the server and not a skewed PC clock.
  const offsetRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.myTests();
      offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
      setTests(data.tests || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load your speech tests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const serverNow = now + offsetRef.current;
  const stateOf = (test) => {
    if (serverNow < new Date(test.startTime).getTime()) return "upcoming";
    if (serverNow >= new Date(test.endTime).getTime()) return "ended";
    return "live";
  };

  // A test already started reopens directly. A new one begins with the
  // instructions screen; the attempt is created only after the student confirms.
  const open = (test) => {
    navigate(test.attempt ? `/speech-tests/${test._id}` : `/speech-tests/${test._id}/setup`);
  };

  const liveCount = tests.filter((t) => stateOf(t) === "live" && t.attempt?.status !== "completed").length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "transparent", pb: 6 }}>
      <PageHero
        title="Speech Test"
        icon={<RecordVoiceOverIcon sx={{ fontSize: "1.7rem" }} />}
        description="Communication tests scheduled for you. Each test has timed sections where you read, listen, speak and tell stories. Your speech is scored out of 100."
      />

      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 10 }, mt: 2 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Your tests
            </Typography>
            {liveCount > 0 && (
              <Chip size="small" color="success" label={`${liveCount} live now`} sx={{ fontWeight: 700 }} />
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : tests.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: "16px",
                border: `1px dashed ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
              }}
            >
              <RecordVoiceOverIcon sx={{ fontSize: 48, color: BRAND, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No speech tests yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When your teacher schedules a communication test for you, it will show up here.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(340px, 1fr))" },
              }}
            >
              {tests.map((test) => (
                <TestCard
                  key={test._id}
                  test={test}
                  state={stateOf(test)}
                  serverNow={serverNow}
                  onOpen={() => open(test)}
                  onLeaderboard={() => navigate(`/speech-tests/${test._id}/leaderboard`)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default SpeechTestDashboard;
