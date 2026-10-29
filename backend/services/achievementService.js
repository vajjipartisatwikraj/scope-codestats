/**
 * Rules and data preparation for a student's achievements (internships,
 * projects, certifications and other achievements).
 *
 * controllers/achievementController handles the request and the response; this
 * file decides what is allowed and what gets stored:
 *  - which fields a request may set (parseAchievementInput)
 *  - the limit on projects and internships (hasReachedLimit)
 *  - the "recognized" flag, always worked out here and never taken from the request
 *  - the export grouping (groupByUser)
 */
const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
const { normalizeDescriptionPoints, validateDescriptionPoints } = require("../utils/descriptionPoints");
const { findRecognizedCertification } = require("../constants/certifications");

const MAX_ITEMS_PER_TYPE = 5;
const LIMITED_TYPES = ["project", "internship"];
const REQUIRED_FIELDS = ["type", "title", "description"];

/** Only certifications can be recognized, and only by matching the catalogue. */
const resolveRecognized = (type, title) =>
  type === "certification" && Boolean(findRecognizedCertification(title));

/**
 * Checks a request body and turns it into the fields to store.
 *
 * Dates left empty are `undefined` when creating (the field is simply not set)
 * and `null` when updating (the stored value is cleared).
 *
 * @returns {{error: {message: string, required?: string[]}} | {fields: object}}
 */
function parseAchievementInput(body, { forUpdate = false } = {}) {
  const {
    type, title, description, tags, link, domainLink, imageUrl,
    startDate, endDate, role, issuer, issuedDate, expiryDate,
  } = body;

  if (!type || !title || !description) {
    return { error: { message: "Missing required fields", required: REQUIRED_FIELDS } };
  }

  // Description is a list of bullet points with per-point limits
  const descriptionPoints = normalizeDescriptionPoints(description);
  const descriptionError = validateDescriptionPoints(descriptionPoints);
  if (descriptionError) return { error: { message: descriptionError } };

  const emptyDate = forUpdate ? null : undefined;
  return {
    fields: {
      type,
      title,
      description: descriptionPoints,
      tags: tags || [],
      link,
      domainLink,
      imageUrl,
      // Internship specific
      startDate: startDate || emptyDate,
      endDate: endDate || emptyDate,
      role: role || "",
      // Certification specific
      issuer: issuer || "",
      issuedDate: issuedDate || emptyDate,
      expiryDate: expiryDate || emptyDate,
      recognized: resolveRecognized(type, title),
    },
  };
}

/** True when the student already has the most projects or internships allowed. */
async function hasReachedLimit(userId, type) {
  if (!LIMITED_TYPES.includes(type)) return false;
  return (await Achievement.countDocuments({ user: userId, type })) >= MAX_ITEMS_PER_TYPE;
}

/**
 * Finds an achievement for a student to change or delete.
 * @returns {Promise<{achievement: object} | {status: 404|403, message: string}>}
 */
async function findOwnedAchievement(id, userId) {
  // A malformed id is simply an achievement that does not exist.
  const achievement = mongoose.isValidObjectId(id) ? await Achievement.findById(id) : null;
  if (!achievement) return { status: 404, message: "Achievement not found" };
  if (achievement.user.toString() !== userId) return { status: 403, message: "Not authorized" };
  return { achievement };
}

/** { userId: [achievement, ...] } for the admin export. Achievements of deleted users are left out. */
function groupByUser(achievements) {
  const byUser = {};
  for (const achievement of achievements) {
    if (!achievement.user) continue;
    const userId = achievement.user._id.toString();
    (byUser[userId] ||= []).push(achievement);
  }
  return byUser;
}

module.exports = {
  MAX_ITEMS_PER_TYPE,
  parseAchievementInput,
  hasReachedLimit,
  findOwnedAchievement,
  groupByUser,
};
