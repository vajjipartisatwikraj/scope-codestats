/**
 * Notices controller: what a signed-in user sees of alerts and announcements, and what they do with
 * them (close one, press its button). The user is always the signed-in one, never taken from the
 * request.
 *
 * Wired to URLs in routes/notices.js, which applies the login check. The rules live in
 * services/notices/noticeFeedService.js.
 */
const noticeFeedService = require("../services/notices/noticeFeedService");
const { createHandler } = require("../utils/controllerHandler");
const log = require("../utils/logger").scope("NOTICES");

const handle = createHandler(log);

const getActive = handle("reading the active notices", (req) => noticeFeedService.getActiveFor(req.user.id));

/** The four actions, for one kind of notice ("alert" or "announcement"). */
const actionsFor = (kind) => ({
  close: handle(`closing an ${kind}`, (req) => noticeFeedService.closeNotice(kind, req.params.id, req.user.id)),
  click: handle(`pressing the button of an ${kind}`, (req) => noticeFeedService.clickNotice(kind, req.params.id, req.user.id)),
});

module.exports = { getActive, alert: actionsFor("alert"), announcement: actionsFor("announcement") };
