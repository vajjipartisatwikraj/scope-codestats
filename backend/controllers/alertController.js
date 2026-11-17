/**
 * Alerts controller: admins create and manage the alert band shown across the top of the app.
 *
 * Wired to URLs in routes/alerts.js, which also applies the login and admin checks. The rules live in
 * services/notices/alertService.js.
 */
const alertService = require("../services/notices/alertService");
const { createHandler } = require("../utils/controllerHandler");
const log = require("../utils/logger").scope("ALERTS");

const handle = createHandler(log);

const listAlerts = handle("listing alerts", () => alertService.listAlerts().then((alerts) => ({ alerts })));

const createAlert = handle("creating an alert", (req) => alertService.createAlert(req.body, req.user.id), 201);

const updateAlert = handle("updating an alert", (req) => alertService.updateAlert(req.params.id, req.body));

const setAlertActive = handle("switching an alert", (req) => alertService.setAlertActive(req.params.id, req.body?.isActive));

const deleteAlert = handle("deleting an alert", (req) => alertService.deleteAlert(req.params.id));

module.exports = { listAlerts, createAlert, updateAlert, setAlertActive, deleteAlert };
