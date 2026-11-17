/**
 * What a signed-in user sees: the alerts and announcements that are live for them and that they have
 * not closed, and the two things they can do with one (close it, press its button).
 *
 * "Seen" is kept on the server in NoticeInteraction, so a notice that someone closed does not come
 * back after a refresh, on another browser or on another device. A press on the button counts as
 * closing it as well.
 *
 * Each person is counted once per notice: the counters on the alert or announcement go up only the
 * first time this user closes it and the first time they press its button.
 */
const Alert = require("../../models/Alert");
const Announcement = require("../../models/Announcement");
const NoticeInteraction = require("../../models/NoticeInteraction");
const User = require("../../models/User");
const UserGroup = require("../../models/UserGroup");
const escapeRegex = require("../../utils/escapeRegex");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { ServiceError } = require("../../utils/ServiceError");
const { assertObjectId, liveFilter } = require("./noticeShared");

const DUPLICATE_KEY = 11000;
// More than a few at once would be a wall of banners; the rest wait until these are closed
const MAX_PER_KIND = 5;

const KINDS = {
  alert: { Model: Alert, fields: "message buttonText buttonUrl startsAt" },
  announcement: { Model: Announcement, fields: "title description imageUrl buttonText buttonUrl startsAt" },
};

/** Ids of the notices of one kind that this user already closed. */
async function dismissedIds(userId, kind) {
  const rows = await NoticeInteraction.find({ user: userId, kind, dismissedAt: { $ne: null } })
    .select("notice")
    .lean();
  return rows.map((row) => row.notice);
}

/** The user groups whose roll number list holds this student (ignoring case). */
async function groupIdsOf(rollNumber) {
  if (!rollNumber) return [];
  const groups = await UserGroup.find({ rollNumbers: new RegExp(`^${escapeRegex(rollNumber)}$`, "i") })
    .select("_id")
    .lean();
  return groups.map((group) => group._id);
}

/** Who an announcement is for, as a query on the user: everyone, their kind of account, or their groups. */
function audienceFilter(staff, groupIds) {
  return {
    $or: [
      { audience: "all" },
      { audience: staff ? "teachers" : "students" },
      ...(groupIds.length > 0 ? [{ audience: "groups", userGroups: { $in: groupIds } }] : []),
    ],
  };
}

/**
 * The alerts and announcements to show this user now, newest start first. Both lists are short and
 * hold only the fields the screen draws.
 */
async function getActiveFor(userId) {
  const user = await User.findById(userId).select("userType rollNumber").lean();
  if (!user) throw new ServiceError(404, "User not found");
  const staff = isAdminOrTeacher(user);
  const now = new Date();

  const [closedAlerts, closedAnnouncements, groupIds] = await Promise.all([
    dismissedIds(userId, "alert"),
    dismissedIds(userId, "announcement"),
    staff ? [] : groupIdsOf(user.rollNumber),
  ]);

  const [alerts, announcements] = await Promise.all([
    Alert.find({ ...liveFilter(now), _id: { $nin: closedAlerts } })
      .sort({ startsAt: -1 })
      .limit(MAX_PER_KIND)
      .select(KINDS.alert.fields)
      .lean(),
    Announcement.find({ ...liveFilter(now), ...audienceFilter(staff, groupIds), _id: { $nin: closedAnnouncements } })
      .sort({ startsAt: -1 })
      .limit(MAX_PER_KIND)
      .select(KINDS.announcement.fields)
      .lean(),
  ]);

  return { alerts, announcements };
}

/**
 * Record that this user closed (`action` "close") or pressed the button of (`action` "click") a
 * notice, and count it once. The record is written first; the counter goes up only when this call
 * is the one that wrote it.
 */
async function record(kind, noticeId, userId, action) {
  const { Model } = KINDS[kind];
  assertObjectId(noticeId, "Notice not found");
  if (!(await Model.exists({ _id: noticeId }))) throw new ServiceError(404, "Notice not found");

  const now = new Date();
  // A click also closes the notice. The filter names the field this action sets, so a second press
  // matches nothing (and the unique index refuses to insert a twin): that is how a repeat is spotted.
  const filter = { user: userId, kind, notice: noticeId, [action === "click" ? "clickedAt" : "dismissedAt"]: { $exists: false } };
  const set = action === "click" ? { clickedAt: now, dismissedAt: now } : { dismissedAt: now };

  let first = false;
  try {
    const result = await NoticeInteraction.updateOne(filter, { $set: set }, { upsert: true });
    first = result.upsertedCount + result.modifiedCount > 0;
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
  }

  if (first) {
    await Model.updateOne({ _id: noticeId }, { $inc: { [action === "click" ? "buttonClicks" : "closeClicks"]: 1 } });
  }
  return { ok: true };
}

const closeNotice = (kind, noticeId, userId) => record(kind, noticeId, userId, "close");
const clickNotice = (kind, noticeId, userId) => record(kind, noticeId, userId, "click");

module.exports = { getActiveFor, closeNotice, clickNotice };
