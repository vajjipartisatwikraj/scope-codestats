/**
 * Emails history controller (admin only): the record of every email the platform sent to a person.
 *
 *   list  a page of emails, newest first, with the status figures and filters
 *   get   one email with its body, for the preview
 *
 * Wired to URLs in routes/emailsHistory.js, which applies the login and admin checks. The rules live
 * in services/emails/emailHistoryService.js.
 */
const emailHistoryService = require("../services/emails/emailHistoryService");
const { createHandler } = require("../utils/controllerHandler");
const log = require("../utils/logger").scope("EMAILS-HISTORY");

const handle = createHandler(log);

const list = handle("listing the emails history", (req) =>
  emailHistoryService.listEmails({
    status: req.query.status,
    type: req.query.type,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  })
);

const get = handle("reading one email of the history", (req) => emailHistoryService.getEmail(req.params.id));

module.exports = { list, get };
