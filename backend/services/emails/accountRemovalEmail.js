/**
 * The email a student gets when their linked coding profiles are removed (all of them, or one
 * platform). It names the profile and username in the opening sentence, says what was deleted and
 * what was not touched, and carries one button back to the app. It gives no reason for the removal:
 * the admin screen does not record one. See emailLayout.js for the frame and the look.
 *
 *   buildAccountRemovalEmail({ user, scope, platforms, deleted, reference })
 *     user        { name, email }
 *     scope       "account" (every coding profile) or "platform" (one of them)
 *     platforms   [{ key, username }] the profiles that were removed
 *     deleted     { snapshots, scoreHistory, heatmapDays } how much stored history went with them
 *     reference   the short id of the emailsHistory record, for the person to quote
 *   -> { subject, html, text }
 */
const { brand, appUrl } = require("../../config/email");
const { esc, firstName, istStamp, list, paragraph, renderEmail, rows, section, toPlainText } = require("./emailLayout");

const PLATFORM_NAMES = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  hackerrank: "HackerRank",
  github: "GitHub",
  scopecodestats: "CodeStats",
};
const platformName = (key) => PLATFORM_NAMES[key] || key;

const formatCount = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

/** "A", "A and B", "A, B and C" */
const joinNames = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** The lines of stored history that went, only the ones that had something */
function historyRows(deleted = {}) {
  return [
    { label: "Daily progress records", value: formatCount(deleted.snapshots), count: deleted.snapshots },
    { label: "Score and rank records", value: formatCount(deleted.scoreHistory), count: deleted.scoreHistory },
    { label: "Days of the activity heatmap", value: formatCount(deleted.heatmapDays), count: deleted.heatmapDays },
  ].filter((row) => row.count > 0);
}

function buildAccountRemovalEmail({ user, scope, platforms = [], deleted = {}, reference }) {
  const single = scope === "platform" && platforms.length === 1;
  const removedName = single ? platformName(platforms[0].key) : null;
  const url = appUrl();
  const when = istStamp();

  // "HackerRank profile <b>name</b>" or "HackerRank (<b>a</b>) and LeetCode (<b>b</b>)"; the same for plain text
  const named = platforms.map((profile) => ({ name: platformName(profile.key), username: profile.username || "" }));
  const inlineHtml = joinNames(named.map((item) => (item.username ? `${esc(item.name)} (<strong>${esc(item.username)}</strong>)` : esc(item.name))));
  const inlineText = joinNames(named.map((item) => (item.username ? `${item.name} (${item.username})` : item.name)));

  const subject = single ? `Your ${removedName} profile was unlinked from ${brand.platform}` : `Your coding profiles were unlinked from ${brand.platform}`;
  const title = single ? `${removedName} profile unlinked` : "Coding profiles unlinked";
  const subtitle = `Profile update, ${when}`;
  const preheader = single
    ? `Your ${removedName} profile has been unlinked from your ${brand.platform} account. Your account and coursework are unchanged.`
    : `Your linked coding profiles have been unlinked from your ${brand.platform} account. Your account and coursework are unchanged.`;

  const opening = single
    ? `Following a review of linked coding profiles, your ${esc(removedName)} profile${named[0].username ? ` <strong>${esc(named[0].username)}</strong>` : ""} has been unlinked from your ${esc(brand.platform)} account. The progress data stored for it has been deleted, so it no longer counts towards your score, rank or consistency level.`
    : `Following a review of linked coding profiles, the following profiles have been unlinked from your ${esc(brand.platform)} account: ${inlineHtml}. The progress data stored for them has been deleted, so it no longer counts towards your score, rank or consistency level.`;
  const openingText = single
    ? `Following a review of linked coding profiles, your ${removedName} profile${named[0].username ? ` ${named[0].username}` : ""} has been unlinked from your ${brand.platform} account. The progress data stored for it has been deleted, so it no longer counts towards your score, rank or consistency level.`
    : `Following a review of linked coding profiles, the following profiles have been unlinked from your ${brand.platform} account: ${inlineText}. The progress data stored for them has been deleted, so it no longer counts towards your score, rank or consistency level.`;

  const history = historyRows(deleted);
  const stays = [
    `Your ${esc(brand.platform)} account, name and profile details`,
    "Your cohorts, practice arena, communication tests and resumes",
    "Signing in works as before",
  ];
  const next = [
    "Your score, rank and consistency level are updated at the next ranking run.",
    `You can link ${single ? `a ${esc(removedName)} profile` : "a profile"} again from your profile page. Progress is counted from the day it is linked.`,
  ];

  const content = [
    paragraph(`Hi ${esc(firstName(user.name))},`),
    paragraph(opening),
    history.length > 0 ? section("What was deleted?", rows(history)) : "",
    section("What stays the same?", list(stays)),
    section("What happens next?", list(next)),
    section("Is this profile yours?", paragraph("Reply with your roll number and the platform username, and we will review the change with you.")),
  ].join("");

  const cta = url ? { label: "Open your profile", url: `${url}/profile` } : null;
  const html = renderEmail({ preheader, title, subtitle, content, cta, reference, sentAt: when });
  const text = toPlainText({
    title,
    subtitle,
    lines: [
      `Hi ${firstName(user.name)},`,
      "",
      openingText,
      "",
      ...(history.length ? ["What was deleted?", ...history.map((row) => `  ${row.label}: ${row.value}`), ""] : []),
      "What stays the same?",
      `  ${brand.platform} account, name and profile details`,
      "  Cohorts, practice arena, communication tests and resumes",
      "  Signing in works as before",
      "",
      "What happens next?",
      "  Your score, rank and consistency level are updated at the next ranking run.",
      "  You can link a profile again from your profile page. Progress is counted from the day it is linked.",
      "",
      "Is this profile yours?",
      "  Reply with your roll number and the platform username, and we will review the change with you.",
    ],
    cta,
    reference,
  });
  return { subject, html, text };
}

module.exports = { buildAccountRemovalEmail, platformName };
