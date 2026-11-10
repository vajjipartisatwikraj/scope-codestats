const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require("../config/monitoring");

/**
 * A single request worth a look: a server error, a slow request, or a client error that is not an
 * expired sign-in (config/monitoring.js). It answers "which user hit this, and what happened".
 * Ordinary requests are only counted (ApiMetric), never stored one by one.
 *
 * Holds no request body, query string, token or IP address. `user` is the id from the JWT.
 * Documents delete themselves after config.rawKeepDays.
 */
const apiRequestEventSchema = new Schema(
  {
    at: { type: Date, required: true },
    method: { type: String, required: true },
    route: { type: String, required: true },
    status: { type: Number, required: true },
    ms: { type: Number, required: true },
    bytes: { type: Number, default: 0 },
    kind: { type: String, default: "empty" },
    user: { type: String, default: null },
    userType: { type: String, default: null },
    // The one-sentence reason the response gave, or the main error: at most 160 characters
    message: { type: String, default: "" },
    // Matches the "req" id in the server log block of the same request
    requestId: { type: String, default: "" },
  },
  { versionKey: false }
);

// Newest first, and the expiry of old events
apiRequestEventSchema.index({ at: -1 });
apiRequestEventSchema.index({ at: 1 }, { expireAfterSeconds: config.rawKeepDays * 24 * 60 * 60 });

module.exports = mongoose.model("ApiRequestEvent", apiRequestEventSchema);
