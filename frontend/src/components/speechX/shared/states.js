import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ArrowCircleRightIcon } from "@phosphor-icons/react/dist/csr/ArrowCircleRight";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";

/**
 * The state palette of a question (design/screens.md section 10), used by the runner's question
 * palette, the review screen and the section overview. Every state has a colour (speechX.css,
 * `[data-state]`), a word and a Phosphor icon, so colour is never the only signal.
 *
 *   answered  accent-soft                 the student gave an answer
 *   current   spotlight (the inverted)    the question on screen
 *   open      raised                      not answered yet
 *   later     warning-soft                "visit later"
 *   review    violet tonal                "marked for review"
 *   flagged   warning-soft                flagged (by the student or by a teacher)
 */
export const STATE_KEYS = ["answered", "current", "open", "later", "review", "flagged"];

/** Student-facing name of each state. */
export const STATE_LABEL = {
  answered: "Answered",
  current: "Current question",
  open: "Unanswered",
  later: "Visit later",
  review: "Marked for review",
  flagged: "Flagged",
};

/** The Phosphor icon component of each state: render with <Icon size={16} aria-hidden="true" />. */
export const STATE_ICON = {
  answered: CheckCircleIcon,
  current: ArrowCircleRightIcon,
  open: CircleDashedIcon,
  later: ClockCounterClockwiseIcon,
  review: BookmarkSimpleIcon,
  flagged: FlagIcon,
};

/**
 * One state out of a question's flags, with this precedence: current, review, flagged, later,
 * answered, open. (A question the student marked for review shows as review even if answered.)
 */
export const questionState = ({ current = false, answered = false, later = false, review = false, flagged = false } = {}) => {
  if (current) return "current";
  if (review) return "review";
  if (flagged) return "flagged";
  if (later) return "later";
  if (answered) return "answered";
  return "open";
};
