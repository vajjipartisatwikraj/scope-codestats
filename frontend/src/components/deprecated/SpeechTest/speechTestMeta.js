/** Shared labels, colours and formatters for the speech test screens. */

export const BRAND = "#0088cc";

export const SECTION_TYPE_META = {
  READING: {
    label: "Reading Aloud",
    hint: "Read the sentence on screen aloud.",
    color: "#0088cc",
  },
  REPEAT: {
    label: "Repeat",
    hint: "Listen to the sentence, then repeat it from memory.",
    color: "#7b61ff",
  },
  JUMBLED: {
    label: "Jumbled Sentence",
    hint: "Rebuild the sentence from scrambled words.",
    color: "#e68a00",
  },
  QUESTION_ANSWER: {
    label: "Question & Answer",
    hint: "Answer the question in your own words.",
    color: "#2e9e5b",
  },
  STORYTELLING: {
    label: "Storytelling",
    hint: "Tell a short story about the topic.",
    color: "#d6457a",
  },
  FILL_BLANKS: {
    label: "Fill in the Blanks",
    hint: "Type the missing word or words in the sentence.",
    color: "#14a3a3",
  },
  MCQ: {
    label: "Multiple Choice",
    hint: "Choose the correct option.",
    color: "#5b7cfa",
  },
  EMAIL_WRITING: {
    label: "Email Writing",
    hint: "Write an email for the situation described.",
    color: "#b8742e",
  },
};

export const SECTION_TYPES = Object.keys(SECTION_TYPE_META);

/** Types answered by typing or choosing: no microphone, no recording. */
export const TEXT_ONLY_TYPES = ["FILL_BLANKS", "MCQ", "EMAIL_WRITING"];

export const isTextOnly = (type) => TEXT_ONLY_TYPES.includes(type);

export const typeLabel = (type) => SECTION_TYPE_META[type]?.label || type;

/** Student-facing wording and chip colour for a section status. */
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
