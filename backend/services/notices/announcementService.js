/**
 * Announcements, as admins manage them: a title, a rich text description, an optional image and
 * button, an audience and a time window. Who sees an announcement and who has closed it is in
 * noticeFeedService.js.
 */
const Announcement = require("../../models/Announcement");
const NoticeInteraction = require("../../models/NoticeInteraction");
const UserGroup = require("../../models/UserGroup");
const { ServiceError } = require("../../utils/ServiceError");
const {
  assertObjectId,
  cleanButton,
  cleanText,
  cleanUrl,
  cleanWindow,
  isObjectId,
  plainTextOf,
  statsOf,
  statusOf,
} = require("./noticeShared");

const AUDIENCES = ["all", "students", "teachers", "groups"];
const MAX_GROUPS = 50;
const MAX_DESCRIPTION = 20000;

/** The announcement as the admin screen shows it. `userGroups` are populated with their names. */
const summaryOf = (announcement, now = new Date()) => ({
  _id: announcement._id,
  title: announcement.title,
  description: announcement.description,
  imageUrl: announcement.imageUrl || "",
  audience: announcement.audience,
  userGroups: (announcement.userGroups || []).map((group) => ({ _id: group._id || group, name: group.name || "" })),
  startsAt: announcement.startsAt,
  endsAt: announcement.endsAt,
  isActive: announcement.isActive,
  status: statusOf(announcement, now),
  buttonText: announcement.buttonText || "",
  buttonUrl: announcement.buttonUrl || "",
  ...statsOf(announcement),
  createdAt: announcement.createdAt,
  updatedAt: announcement.updatedAt,
});

async function getAnnouncementOrFail(announcementId) {
  assertObjectId(announcementId, "Announcement not found");
  const announcement = await Announcement.findById(announcementId);
  if (!announcement) throw new ServiceError(404, "Announcement not found");
  return announcement;
}

/** The audience and, for "groups", the groups, checked against the ones that exist. */
async function cleanAudience(body) {
  const audience = body.audience === undefined ? "all" : body.audience;
  if (!AUDIENCES.includes(audience)) throw new ServiceError(400, "Choose who the announcement is for");
  if (audience !== "groups") return { audience, userGroups: [] };

  const ids = Array.isArray(body.userGroups) ? [...new Set(body.userGroups.map((id) => String(id?._id || id)))] : [];
  if (ids.length === 0) throw new ServiceError(400, "Choose at least one user group");
  if (ids.length > MAX_GROUPS) throw new ServiceError(400, `Choose at most ${MAX_GROUPS} user groups`);
  if (ids.some((id) => !isObjectId(id))) throw new ServiceError(400, "A chosen user group is not valid");
  const found = await UserGroup.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) throw new ServiceError(400, "A chosen user group no longer exists");
  return { audience, userGroups: ids };
}

/** The fields an admin can write, checked. Used by create and update. */
async function cleanFields(body = {}) {
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!plainTextOf(description)) throw new ServiceError(400, "The description is required");
  if (description.length > MAX_DESCRIPTION) {
    throw new ServiceError(400, "The description is too long. Shorten it or remove some formatting");
  }
  return {
    title: cleanText(body.title, { label: "The title", max: 120, required: true }),
    description,
    imageUrl: cleanUrl(body.imageUrl, { label: "The image address", max: 1000 }),
    ...(await cleanAudience(body)),
    ...cleanWindow(body.startsAt, body.endsAt),
    ...cleanButton(body.buttonText, body.buttonUrl),
  };
}

/** All announcements, newest start first. */
async function listAnnouncements() {
  const announcements = await Announcement.find()
    .sort({ startsAt: -1, createdAt: -1 })
    .populate("userGroups", "name")
    .lean();
  const now = new Date();
  return announcements.map((announcement) => summaryOf(announcement, now));
}

async function createAnnouncement(body, userId) {
  const announcement = await Announcement.create({
    ...(await cleanFields(body)),
    isActive: body?.isActive !== false,
    createdBy: userId,
  });
  await announcement.populate("userGroups", "name");
  return { announcement: summaryOf(announcement) };
}

async function updateAnnouncement(announcementId, body) {
  const announcement = await getAnnouncementOrFail(announcementId);
  announcement.set(await cleanFields(body));
  if (typeof body?.isActive === "boolean") announcement.isActive = body.isActive;
  await announcement.save();
  await announcement.populate("userGroups", "name");
  return { announcement: summaryOf(announcement) };
}

/** Switch an announcement on or off without opening it. */
async function setAnnouncementActive(announcementId, isActive) {
  if (typeof isActive !== "boolean") throw new ServiceError(400, "isActive must be true or false");
  const announcement = await getAnnouncementOrFail(announcementId);
  announcement.isActive = isActive;
  await announcement.save();
  await announcement.populate("userGroups", "name");
  return { announcement: summaryOf(announcement) };
}

/** Delete an announcement and the records of who closed it. */
async function deleteAnnouncement(announcementId) {
  const announcement = await getAnnouncementOrFail(announcementId);
  await Promise.all([
    announcement.deleteOne(),
    NoticeInteraction.deleteMany({ kind: "announcement", notice: announcement._id }),
  ]);
  return { message: "Announcement deleted" };
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementActive,
  deleteAnnouncement,
};
