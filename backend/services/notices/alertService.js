/**
 * Alerts, as admins manage them: a short message in a band across the top of the app, with a start
 * and end time and an optional button. Who sees an alert and who has closed it is in
 * noticeFeedService.js.
 */
const Alert = require("../../models/Alert");
const NoticeInteraction = require("../../models/NoticeInteraction");
const { ServiceError } = require("../../utils/ServiceError");
const { assertObjectId, cleanButton, cleanText, cleanWindow, statsOf, statusOf } = require("./noticeShared");

/** The alert as the admin screen shows it. */
const summaryOf = (alert, now = new Date()) => ({
  _id: alert._id,
  message: alert.message,
  startsAt: alert.startsAt,
  endsAt: alert.endsAt,
  isActive: alert.isActive,
  status: statusOf(alert, now),
  buttonText: alert.buttonText || "",
  buttonUrl: alert.buttonUrl || "",
  ...statsOf(alert),
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});

async function getAlertOrFail(alertId) {
  assertObjectId(alertId, "Alert not found");
  const alert = await Alert.findById(alertId);
  if (!alert) throw new ServiceError(404, "Alert not found");
  return alert;
}

/** The fields an admin can write, checked. Used by create and update. */
function cleanFields(body = {}) {
  return {
    message: cleanText(body.message, { label: "The message", max: 280, required: true }),
    ...cleanWindow(body.startsAt, body.endsAt),
    ...cleanButton(body.buttonText, body.buttonUrl),
  };
}

/** All alerts, newest start first. */
async function listAlerts() {
  const alerts = await Alert.find().sort({ startsAt: -1, createdAt: -1 }).lean();
  const now = new Date();
  return alerts.map((alert) => summaryOf(alert, now));
}

async function createAlert(body, userId) {
  const alert = await Alert.create({ ...cleanFields(body), isActive: body?.isActive !== false, createdBy: userId });
  return { alert: summaryOf(alert) };
}

async function updateAlert(alertId, body) {
  const alert = await getAlertOrFail(alertId);
  alert.set(cleanFields(body));
  if (typeof body?.isActive === "boolean") alert.isActive = body.isActive;
  await alert.save();
  return { alert: summaryOf(alert) };
}

/** Switch an alert on or off without opening it. */
async function setAlertActive(alertId, isActive) {
  if (typeof isActive !== "boolean") throw new ServiceError(400, "isActive must be true or false");
  const alert = await getAlertOrFail(alertId);
  alert.isActive = isActive;
  await alert.save();
  return { alert: summaryOf(alert) };
}

/** Delete an alert and the records of who closed it. */
async function deleteAlert(alertId) {
  const alert = await getAlertOrFail(alertId);
  await Promise.all([alert.deleteOne(), NoticeInteraction.deleteMany({ kind: "alert", notice: alert._id })]);
  return { message: "Alert deleted" };
}

module.exports = { listAlerts, createAlert, updateAlert, setAlertActive, deleteAlert };
