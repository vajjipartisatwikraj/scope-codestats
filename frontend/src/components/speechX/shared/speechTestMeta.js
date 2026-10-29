/**
 * Shared labels, hues and formatters for the speech test screens.
 *
 * Copied from SpeechTest/speechTestMeta.js. One change: the raw hex colours of the old file are
 * retired, so `color` is now a CSS variable string of the data series (usable as an inline
 * `style={{ color: meta.color }}`), and `hue` is the series name for <TonalMark hue={...} />.
 * `BRAND` is the accent token.
 */

export const BRAND = "var(--ds-accent)";

export const SECTION_TYPE_META = {
  READING: {
    label: "Reading Aloud",
    hint: "Read the sentence on screen aloud.",
    hue: "blue",
    color: "var(--ds-series-blue)",
  },
  REPEAT: {
    label: "Repeat",
    hint: "Listen to the sentence, then repeat it from memory.",
    hue: "violet",
    color: "var(--ds-series-violet)",
  },
  JUMBLED: {
    label: "Jumbled Sentence",
    hint: "Rebuild the sentence from scrambled words.",
    hue: "amber",
    color: "var(--ds-series-amber)",
  },
  QUESTION_ANSWER: {
    label: "Question & Answer",
    hint: "Answer the question in your own words.",
    hue: "green",
    color: "var(--ds-series-green)",
  },
  STORYTELLING: {
    label: "Storytelling",
    hint: "Tell a short story about the topic.",
    hue: "coral",
    color: "var(--ds-series-coral)",
  },
  FILL_BLANKS: {
    label: "Fill in the Blanks",
    hint: "Type the missing word or words in the sentence.",
    hue: "teal",
    color: "var(--ds-series-teal)",
  },
  MCQ: {
    label: "Multiple Choice",
    hint: "Choose the correct option.",
    hue: "sky",
    color: "var(--ds-series-sky)",
  },
  EMAIL_WRITING: {
    label: "Email Writing",
    hint: "Write an email for the situation described.",
    hue: "slate",
    color: "var(--ds-series-slate)",
  },
};

export const SECTION_TYPES = Object.keys(SECTION_TYPE_META);

/** Types answered by typing or choosing: no microphone, no recording. */
export const TEXT_ONLY_TYPES = ["FILL_BLANKS", "MCQ", "EMAIL_WRITING"];

export const isTextOnly = (type) => TEXT_ONLY_TYPES.includes(type);

export const typeLabel = (type) => SECTION_TYPE_META[type]?.label || type;

/**
 * Student-facing wording of a section status. `color` is the old Material UI chip colour name,
 * kept so ported code keeps working; new code uses <ExamStatusBadge status={...} />.
 */
export const SECTION_STATUS_META = {
  not_started: { label: "Not started", color: "default" },
  in_progress: { label: "In progress", color: "primary" },
  queued: { label: "Submitted, waiting for results", color: "warning" },
  scoring: { label: "Submitted, waiting for results", color: "warning" },
  scored: { label: "Result ready", color: "success" },
  failed: { label: "Scoring failed", color: "error" },
};

export const TEST_STATE_META = {
  upcoming: { label: "Upcoming", color: "info" },
  live: { label: "Live", color: "success" },
  ended: { label: "Ended", color: "default" },
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** "Oct 09, 12:00 AM" - compact form for ranges where the year is obvious. */
export const formatShortDateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** 47 -> "47 min", 65 -> "1 h 5 min", 120 -> "2 h" */
export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const formatScore = (value) =>
  typeof value === "number" ? `${Number.isInteger(value) ? value : value.toFixed(1)}%` : "—";

/** 83 -> "1:23", 3700 -> "1:01:40" */
export const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

/** "2d 3h", "4h 10m", "5m 20s" until a moment; empty once it has passed. */
export const formatCountdown = (ms) => {
  if (ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};
