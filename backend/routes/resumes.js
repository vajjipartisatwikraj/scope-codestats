const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Achievement = require("../models/Achievement");
const { buildProfileSnapshot } = require("../utils/resumeProfileImport");
const {
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  renderResume,
  catalogue,
  normalizeDetails,
} = require("../resumeTemplates");
const log = require("../utils/logger").scope("RESUMES");

const MAX_RESUMES_PER_USER = 5;

/**
 * Resume building is a student-only feature; admins and teachers have no
 * resumes of their own.
 */
const studentsOnly = (req, res, next) => {
  if (req.user.userType === "admin" || req.user.userType === "teacher") {
    return res.status(403).json({
      message: "Resume building is available to students only",
    });
  }
  next();
};

router.use(auth, studentsOnly);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The editor asks for a fresh preview while the student types, so allow a lot, but not unlimited
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `resume-preview:${req.user.id}`,
  message: { message: "Too many previews. Wait a moment and try again." },
});

/** The template id to store: the one asked for when it exists, else the default */
const pickTemplate = (id) => (TEMPLATE_IDS.includes(id) ? id : DEFAULT_TEMPLATE_ID);

/** A resume saved before templates became HTML files held `fields: [{ key, value }]` */
const detailsFromLegacyFields = (fields) =>
  Object.fromEntries((Array.isArray(fields) ? fields : []).map((field) => [field.key, field.value]));

// Template catalogue: names, the fields each template uses, and a preview of each
router.get("/templates", (req, res) => {
  res.json({ templates: catalogue(), defaultTemplate: DEFAULT_TEMPLATE_ID });
});

/**
 * Everything a resume needs from the user's saved profile, shaped like the resume's details.
 * Powers the "Import from profile" button in the editor.
 */
async function loadProfileDetails(userId) {
  const user = await User.findById(userId)
    .select("name email mobileNumber phone about education skills interests linkedinUrl resumeLink")
    .lean();
  if (!user) return null;

  const [achievements, platformProfiles] = await Promise.all([
    Achievement.find({ user: userId })
      .select("type title role issuer description tags link domainLink startDate endDate issuedDate createdAt")
      .lean(),
    // The resume links to the student's GitHub and LeetCode profiles.
    Profile.find({ userId, platform: { $in: ["github", "leetcode"] } })
      .select("platform username")
      .lean(),
  ]);
  const profiles = Object.fromEntries(platformProfiles.map((p) => [p.platform, p.username]));

  return buildProfileSnapshot({ ...user, profiles }, achievements);
}

router.get("/profile-data", async (req, res) => {
  try {
    const profile = await loadProfileDetails(req.user.id);
    if (!profile) return res.status(404).json({ message: "User not found" });
    res.json({ profile });
  } catch (err) {
    log.error("Error building resume profile data:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// A preview of unsaved details: the template filled in, as a whole HTML document
router.post("/render", previewLimiter, (req, res) => {
  try {
    const template = pickTemplate(req.body?.template);
    res.json({ html: renderResume(template, req.body?.details) });
  } catch (err) {
    log.error("Error rendering resume:", err);
    res.status(500).json({ message: "Could not draw the preview" });
  }
});

// List the user's resumes, newest first, with an optional title search
router.get("/", async (req, res) => {
  try {
    const query = { user: req.user.id };

    const search = String(req.query.search || "").trim();
    if (search) {
      query.title = new RegExp(escapeRegex(search), "i");
    }

    // The cards show a thumbnail of the saved HTML; the details are only needed by the editor
    const found = await Resume.find(query)
      .select("title template templateName html fields createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    // An older resume has no HTML yet: draw it for the thumbnail (it is saved when it is opened)
    const resumes = found.map(({ fields, ...resume }) => ({
      ...resume,
      html: resume.html || renderResume(pickTemplate(resume.template), detailsFromLegacyFields(fields)),
    }));
    res.json({ resumes, limit: MAX_RESUMES_PER_USER });
  } catch (err) {
    log.error("Error fetching resumes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Single resume, used by the editor
router.get("/:id", async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!resume) return res.status(404).json({ message: "Resume not found" });

    // An older resume is brought across once: its fields become details and its HTML is drawn
    if (!resume.details || Object.keys(resume.details).length === 0) {
      const template = pickTemplate(resume.template);
      const details = normalizeDetails(detailsFromLegacyFields(resume.fields));
      const html = renderResume(template, details);
      const templateName = getTemplate(template).name;
      await Resume.updateOne(
        { _id: resume._id },
        { $set: { template, templateName, details, html }, $unset: { fields: "", font: "" } },
        // fields and font are no longer in the schema, so strict mode would ignore the $unset
        { strict: false },
      );
      return res.json({ ...resume, template, templateName, details, html, fields: undefined, font: undefined });
    }

    res.json(resume);
  } catch (err) {
    log.error("Error fetching resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a resume, capped per user
router.post("/", async (req, res) => {
  try {
    const count = await Resume.countDocuments({ user: req.user.id });
    if (count >= MAX_RESUMES_PER_USER) {
      return res.status(400).json({
        message: `You can only have up to ${MAX_RESUMES_PER_USER} resumes. Please delete one to create another.`,
      });
    }

    const title = String(req.body.title || "").trim();
    if (!title) {
      return res.status(400).json({ message: "Resume name is required" });
    }

    const template = pickTemplate(req.body.template);

    // By default a new resume starts from the student's profile, so it is not a blank page
    let source = {};
    if (req.body.useProfile !== false) {
      source = (await loadProfileDetails(req.user.id)) || {};
    }
    const details = normalizeDetails(source);

    const resume = await Resume.create({
      user: req.user.id,
      title,
      template,
      templateName: getTemplate(template).name,
      details,
      html: renderResume(template, details),
    });

    res.status(201).json(resume);
  } catch (err) {
    log.error("Error creating resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update the title, the template and/or the details; the HTML is drawn again from them
router.put("/:id", async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) {
        return res.status(400).json({ message: "Resume name is required" });
      }
      resume.title = title;
    }

    if (req.body.template !== undefined) {
      resume.template = pickTemplate(req.body.template);
    }
    resume.templateName = getTemplate(resume.template).name;

    resume.details = normalizeDetails(req.body.details === undefined ? resume.details : req.body.details);
    resume.html = renderResume(resume.template, resume.details);
    // Details are Mixed, so tell mongoose the subtree changed
    resume.markModified("details");

    await resume.save();
    res.json(resume);
  } catch (err) {
    log.error("Error updating resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!resume) return res.status(404).json({ message: "Resume not found" });

    res.json({ message: "Resume deleted successfully" });
  } catch (err) {
    log.error("Error deleting resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
