/**
 * Achievement controller: a student's internships, projects, certifications
 * and other achievements, plus the admin export.
 *
 *   Student   getMyAchievements, createAchievement, updateAchievement,
 *             deleteAchievement, getCertificationCatalog
 *   Staff     exportAllAchievements
 *
 * The rules (limits, validation, the "recognized" flag) are in
 * services/achievementService. Who may call what is decided in
 * routes/achievements.js.
 */
const Achievement = require("../models/Achievement");
const User = require("../models/User");
const { RECOGNIZED_CERTIFICATIONS } = require("../constants/certifications");
const {
  MAX_ITEMS_PER_TYPE,
  parseAchievementInput,
  hasReachedLimit,
  findOwnedAchievement,
  groupByUser,
} = require("../services/achievementService");
const log = require("../utils/logger").scope("ACHIEVEMENTS");

const SERVER_ERROR = { message: "Server error" };

// ─── Student ────────────────────────────────────────────────────────────────

/**
 * GET /api/achievements/certifications/catalog
 * Globally recognized certifications, for the suggestions under the certificate name field.
 */
const getCertificationCatalog = (req, res) => {
  res.json({ certifications: RECOGNIZED_CERTIFICATIONS });
};

/** GET /api/achievements: the signed-in student's achievements, newest first. */
const getMyAchievements = async (req, res) => {
  try {
    res.json(await Achievement.find({ user: req.user.id }).sort({ createdAt: -1 }));
  } catch (err) {
    log.error("Error fetching achievements:", err);
    res.status(500).json(SERVER_ERROR);
  }
};

/** POST /api/achievements */
const createAchievement = async (req, res) => {
  try {
    const { error, fields } = parseAchievementInput(req.body);
    if (error) return res.status(400).json(error);

    if (await hasReachedLimit(req.user.id, fields.type)) {
      return res.status(400).json({
        message: `You can only add up to ${MAX_ITEMS_PER_TYPE} ${fields.type}s. Please delete an existing one to add more.`,
      });
    }

    const achievement = await new Achievement({ user: req.user.id, ...fields }).save();
    res.status(201).json(achievement);
  } catch (err) {
    log.error("Error creating achievement:", err);
    res.status(500).json(SERVER_ERROR);
  }
};

/** PUT /api/achievements/:id: replaces the fields of one of the student's achievements. */
const updateAchievement = async (req, res) => {
  try {
    const { error, fields } = parseAchievementInput(req.body, { forUpdate: true });
    if (error) return res.status(400).json(error);

    const owned = await findOwnedAchievement(req.params.id, req.user.id);
    if (!owned.achievement) return res.status(owned.status).json({ message: owned.message });

    const updated = await Achievement.findByIdAndUpdate(req.params.id, fields, { new: true });
    res.json(updated);
  } catch (err) {
    log.error("Error updating achievement:", err);
    res.status(500).json(SERVER_ERROR);
  }
};

/** DELETE /api/achievements/:id */
const deleteAchievement = async (req, res) => {
  try {
    const owned = await findOwnedAchievement(req.params.id, req.user.id);
    if (!owned.achievement) return res.status(owned.status).json({ message: owned.message });

    await owned.achievement.deleteOne();
    res.json({ message: "Achievement deleted successfully" });
  } catch (err) {
    log.error("Error deleting achievement:", err);
    res.status(500).json(SERVER_ERROR);
  }
};

// ─── Staff only (routes/achievements.js applies the admin / teacher check) ──

/**
 * GET /api/achievements/export/all
 * Every student with their achievements grouped by user id, for the admin export.
 */
const exportAllAchievements = async (req, res) => {
  try {
    const [users, achievements] = await Promise.all([
      User.find({ userType: { $nin: ["admin", "teacher"] } })
        .select("_id name rollNumber email department")
        .lean(),
      Achievement.find()
        .populate("user", "name rollNumber email department")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({ users, achievements: groupByUser(achievements) });
  } catch (err) {
    log.error("Error fetching all achievements for export:", err);
    res.status(500).json(SERVER_ERROR);
  }
};

module.exports = {
  getCertificationCatalog,
  getMyAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  exportAllAchievements,
};
