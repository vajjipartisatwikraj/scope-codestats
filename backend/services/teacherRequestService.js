/**
 * Teacher access requests.
 *
 * Someone who signs in from the teacher sign-in page gets a regular account
 * (userType "user", signupIntent "teacher"). They ask for teacher access here and an
 * admin approves or rejects it. Approving changes `userType` to "teacher"; the JWT is
 * the same one every user gets (it holds no role), and the role is read from the
 * database on each request, so the new access applies on the teacher's next request.
 */
const mongoose = require("mongoose");
const TeacherRequest = require("../models/TeacherRequest");
const User = require("../models/User");
const { ServiceError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("TEACHER-REQUESTS");

/** How long someone waits after a rejection before asking again. */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 500;

const isId = (value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(String(value));

function cleanText(value, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > MAX_TEXT) {
    throw new ServiceError(400, `${label} can have at most ${MAX_TEXT} characters`);
  }
  return text;
}

/** Only accounts created from the teacher sign-in page that are still regular users may ask. */
const canRequest = (user) => user.userType === "user" && user.signupIntent === "teacher";

const describe = (request) => ({
  _id: request._id,
  status: request.status,
  note: request.note,
  rejectionReason: request.rejectionReason,
  createdAt: request.createdAt,
  reviewedAt: request.reviewedAt,
  canRequestAgainAt:
    request.status === "rejected"
      ? new Date((request.reviewedAt || request.updatedAt).getTime() + COOLDOWN_MS)
      : null,
});

/** The person's latest request, or null. */
function latestRequestOf(userId) {
  return TeacherRequest.findOne({ user: userId }).sort({ createdAt: -1 });
}

/** The signed-in person's own state: can they ask, and what happened to their last request. */
async function statusFor(user) {
  const latest = await latestRequestOf(user._id);
  return {
    eligibleToRequest: canRequest(user),
    request: latest ? describe(latest) : null,
  };
}

/** Create a pending request for the signed-in person. */
async function submitRequest(userId, { note }) {
  const user = await User.findById(userId).select("userType signupIntent");
  if (!user) throw new ServiceError(404, "User not found");

  if (user.userType !== "user") {
    throw new ServiceError(409, "This account already has staff access", { reason: "already_staff" });
  }
  if (!canRequest(user)) {
    throw new ServiceError(
      403,
      "Teacher access can only be requested from the teacher sign-in page",
      { reason: "not_teacher_signup" }
    );
  }

  const latest = await latestRequestOf(userId);
  if (latest?.status === "pending") {
    throw new ServiceError(409, "Your request is already waiting for an admin", {
      reason: "already_pending",
    });
  }
  if (latest?.status === "rejected") {
    const retryAt = new Date((latest.reviewedAt || latest.updatedAt).getTime() + COOLDOWN_MS);
    if (retryAt > new Date()) {
      throw new ServiceError(429, "Please wait before sending another request", {
        reason: "cooldown",
        canRequestAgainAt: retryAt,
      });
    }
  }

  try {
    const request = await TeacherRequest.create({
      user: userId,
      note: cleanText(note, "The note"),
    });
    log.debug(`Teacher access requested by ${userId}`);
    return { request: describe(request) };
  } catch (err) {
    // The unique index on pending requests: two requests raced.
    if (err.code === 11000) {
      throw new ServiceError(409, "Your request is already waiting for an admin", {
        reason: "already_pending",
      });
    }
    throw err;
  }
}

const SHOWN_USER_FIELDS = "name email rollNumber profilePicture createdAt userType";

/** Requests for the admin: pending ones first (oldest first), then the most recent decisions. */
async function listRequests({ status }) {
  const filter = ["pending", "approved", "rejected"].includes(status) ? { status } : {};
  const requests = await TeacherRequest.find(filter)
    .sort(status === "pending" ? { createdAt: 1 } : { createdAt: -1 })
    .limit(200)
    .populate("user", SHOWN_USER_FIELDS)
    .populate("reviewedBy", "name email")
    .lean();

  return {
    // A request whose account was deleted has nothing left to review.
    requests: requests
      .filter((r) => r.user)
      .map((r) => ({
        _id: r._id,
        status: r.status,
        note: r.note,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reviewedBy: r.reviewedBy ? { name: r.reviewedBy.name, email: r.reviewedBy.email } : null,
        user: {
          _id: r.user._id,
          name: r.user.name,
          email: r.user.email,
          rollNumber: r.user.rollNumber,
          profilePicture: r.user.profilePicture,
          userType: r.user.userType,
          joinedAt: r.user.createdAt,
        },
      })),
  };
}

async function pendingCount() {
  const pending = await TeacherRequest.find({ status: "pending" })
    .select("user")
    .populate({ path: "user", select: "_id" })
    .lean();
  return { count: pending.filter((r) => r.user).length };
}

/** Tell the person what was decided. A failure here never undoes the decision. */
async function notify(userId, title, message) {
  try {
    const Notification = require("../models/Notification");
    await Notification.create({ userId, title, message, read: false });
  } catch (err) {
    log.error("Could not create the teacher request notification:", err);
  }
}

async function failIfMissing(requestId) {
  if (!isId(requestId)) throw new ServiceError(404, "Request not found");
  const exists = await TeacherRequest.exists({ _id: requestId });
  if (!exists) throw new ServiceError(404, "Request not found");
  throw new ServiceError(409, "This request has already been reviewed", { reason: "already_reviewed" });
}

/** Approve: the person becomes a teacher. Safe to click twice; only the first one acts. */
async function approve(requestId, adminId) {
  if (!isId(requestId)) throw new ServiceError(404, "Request not found");

  // Claim the request first, so two admins cannot both act on it.
  const request = await TeacherRequest.findOneAndUpdate(
    { _id: requestId, status: "pending" },
    { status: "approved", reviewedBy: adminId, reviewedAt: new Date() },
    { new: true }
  );
  if (!request) return failIfMissing(requestId);

  // Only a regular user becomes a teacher. An admin is never demoted.
  const promoted = await User.findOneAndUpdate(
    { _id: request.user, userType: "user" },
    { userType: "teacher" },
    { new: true }
  ).select("name email");

  if (!promoted) {
    const account = await User.findById(request.user).select("userType");
    if (!account) {
      // The account was deleted meanwhile: nothing to approve.
      await TeacherRequest.deleteOne({ _id: request._id });
      throw new ServiceError(404, "That account no longer exists");
    }
    // Already a teacher or admin: the request is simply marked approved.
  } else {
    log.debug(`Teacher access approved for ${promoted.email} by ${adminId}`);
    await notify(
      promoted._id,
      "Teacher access approved",
      "An admin approved your request. You now have teacher access."
    );
  }

  return { message: "Request approved", request: { _id: request._id, status: "approved" } };
}

/** Reject, with an optional reason the person can read. */
async function reject(requestId, adminId, { reason }) {
  if (!isId(requestId)) throw new ServiceError(404, "Request not found");
  const rejectionReason = cleanText(reason, "The reason");

  const request = await TeacherRequest.findOneAndUpdate(
    { _id: requestId, status: "pending" },
    { status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason },
    { new: true }
  );
  if (!request) return failIfMissing(requestId);

  log.debug(`Teacher access rejected for ${request.user} by ${adminId}`);
  await notify(
    request.user,
    "Teacher access request declined",
    rejectionReason
      ? `Your request was declined: ${rejectionReason}`
      : "An admin declined your request for teacher access."
  );

  return { message: "Request rejected", request: { _id: request._id, status: "rejected" } };
}

module.exports = {
  COOLDOWN_MS,
  statusFor,
  submitRequest,
  listRequests,
  pendingCount,
  approve,
  reject,
};
