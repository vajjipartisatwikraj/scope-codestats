/**
 * Announcements controller: admins create and manage the announcements that open after sign-in.
 *
 * Wired to URLs in routes/announcements.js, which also applies the login and admin checks. The rules
 * live in services/notices/announcementService.js.
 */
const announcementService = require("../services/notices/announcementService");
const { createHandler } = require("../utils/controllerHandler");
const log = require("../utils/logger").scope("ANNOUNCEMENTS");

const handle = createHandler(log);

const listAnnouncements = handle("listing announcements", () =>
  announcementService.listAnnouncements().then((announcements) => ({ announcements }))
);

const createAnnouncement = handle(
  "creating an announcement",
  (req) => announcementService.createAnnouncement(req.body, req.user.id),
  201
);

const updateAnnouncement = handle("updating an announcement", (req) =>
  announcementService.updateAnnouncement(req.params.id, req.body)
);

const setAnnouncementActive = handle("switching an announcement", (req) =>
  announcementService.setAnnouncementActive(req.params.id, req.body?.isActive)
);

const deleteAnnouncement = handle("deleting an announcement", (req) => announcementService.deleteAnnouncement(req.params.id));

module.exports = { listAnnouncements, createAnnouncement, updateAnnouncement, setAnnouncementActive, deleteAnnouncement };
