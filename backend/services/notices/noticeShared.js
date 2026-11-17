/**
 * Rules that alerts and announcements share: the time window, the button, the status shown to admins
 * and the "live now" query. Nothing here touches the database.
 */
const { ServiceError } = require("../../utils/ServiceError");
const { assertObjectId, cleanText, isObjectId } = require("../mentorships/mentorshipShared");

/** The state of a notice for the admin screens: off, scheduled, live or ended. */
const STATUS = { OFF: "off", SCHEDULED: "scheduled", LIVE: "live", ENDED: "ended" };

/** The notices that are on and whose window contains `now`. Used by the feed and by the counts. */
const liveFilter = (now = new Date()) => ({
  isActive: true,
  startsAt: { $lte: now },
  endsAt: { $gte: now },
});

/**
 * Where a notice is right now. An admin's switch wins: a notice that is switched off is "off" even
 * inside its window.
 */
function statusOf(notice, now = new Date()) {
  if (!notice.isActive) return STATUS.OFF;
  if (now < new Date(notice.startsAt)) return STATUS.SCHEDULED;
  if (now > new Date(notice.endsAt)) return STATUS.ENDED;
  return STATUS.LIVE;
}

function cleanDate(value, label) {
  const date = new Date(value);
  if (value === undefined || value === null || value === "" || Number.isNaN(date.getTime())) {
    throw new ServiceError(400, `${label} is required and must be a valid date and time`);
  }
  return date;
}

/** The start and end of the window, with the end after the start. */
function cleanWindow(startsAt, endsAt) {
  const start = cleanDate(startsAt, "The start time");
  const end = cleanDate(endsAt, "The end time");
  if (end <= start) throw new ServiceError(400, "The end time must be after the start time");
  return { startsAt: start, endsAt: end };
}

/**
 * An address a button may open: "https://..." or "http://...", or a path inside the app that starts
 * with a single "/". Anything else (javascript:, data:, a bare word) is refused.
 */
function cleanUrl(value, { label, max = 500 }) {
  const text = cleanText(value, { label, max });
  if (!text) return "";
  const isPath = text.startsWith("/") && !text.startsWith("//");
  if (!isPath) {
    let parsed;
    try {
      parsed = new URL(text);
    } catch (err) {
      throw new ServiceError(400, `${label} must start with https:// or be a path inside the app such as /dashboard`);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new ServiceError(400, `${label} must start with https:// or be a path inside the app such as /dashboard`);
    }
  }
  return text;
}

/** The button of a notice: both fields or neither. */
function cleanButton(buttonText, buttonUrl) {
  const text = cleanText(buttonText, { label: "The button text", max: 40 });
  const url = cleanUrl(buttonUrl, { label: "The button link" });
  if (text && !url) throw new ServiceError(400, "Add the link the button opens, or clear the button text");
  if (url && !text) throw new ServiceError(400, "Add the text of the button, or clear the link");
  return { buttonText: text, buttonUrl: url };
}

/** The text of an HTML string, to tell an empty editor ("<p><br></p>") from a real description. */
const plainTextOf = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The counters and the status that admins see on a card. */
const statsOf = (notice) => ({ closeClicks: notice.closeClicks || 0, buttonClicks: notice.buttonClicks || 0 });

module.exports = {
  STATUS,
  liveFilter,
  statusOf,
  cleanWindow,
  cleanUrl,
  cleanButton,
  cleanText,
  plainTextOf,
  statsOf,
  assertObjectId,
  isObjectId,
};
