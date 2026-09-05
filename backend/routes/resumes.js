const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const User = require("../models/User");
const Achievement = require("../models/Achievement");
const { buildProfileSnapshot } = require("../utils/resumeProfileImport");
const {
  templates,
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
  normalizeFields,
} = require("../resumeTemplates");
const {
  RESUME_FONTS,
  RESUME_FONT_IDS,
  DEFAULT_RESUME_FONT_ID,
} = require("../resumeFonts");

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

// Template and font catalogues: the editor renders its controls from these
router.get("/templates", (req, res) => {
  res.json({
    templates,
    defaultTemplate: DEFAULT_TEMPLATE_ID,
    fonts: RESUME_FONTS,
    defaultFont: DEFAULT_RESUME_FONT_ID,
  });
});

/**
 * Everything a resume needs from the user's saved profile, shaped by resume
 * field key. Powers the "Import from profile" button in the editor.
 */
router.get("/profile-data", async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "name email mobileNumber phone about education skills interests linkedinUrl resumeLink profiles",
      )
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const achievements = await Achievement.find({ user: req.user.id })
      .select("type title role issuer description tags link domainLink startDate endDate issuedDate createdAt")
      .lean();

    res.json({ profile: buildProfileSnapshot(user, achievements) });
  } catch (err) {
    console.error("Error building resume profile data:", err);
    res.status(500).json({ message: "Server error" });
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

    const resumes = await Resume.find(query).sort({ updatedAt: -1 }).lean();
    res.json({ resumes, limit: MAX_RESUMES_PER_USER });
  } catch (err) {
    console.error("Error fetching resumes:", err);
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

    res.json(resume);
  } catch (err) {
    console.error("Error fetching resume:", err);
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

    const template = TEMPLATE_IDS.includes(req.body.template)
      ? req.body.template
      : DEFAULT_TEMPLATE_ID;

    const resume = new Resume({
      user: req.user.id,
      title,
      template,
      font: RESUME_FONT_IDS.includes(req.body.font)
        ? req.body.font
        : DEFAULT_RESUME_FONT_ID,
      fields: normalizeFields(template, req.body.fields),
    });

    await resume.save();
    res.status(201).json(resume);
  } catch (err) {
    console.error("Error creating resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update title, template and/or field values
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

    if (req.body.template !== undefined && TEMPLATE_IDS.includes(req.body.template)) {
      resume.template = req.body.template;
    }

    if (req.body.font !== undefined && RESUME_FONT_IDS.includes(req.body.font)) {
      resume.font = req.body.font;
    }

    // Re-normalize against the (possibly new) template so the stored fields
    // always match the template definition
    if (req.body.fields !== undefined || req.body.template !== undefined) {
      resume.fields = normalizeFields(
        resume.template,
        req.body.fields === undefined ? resume.fields : req.body.fields,
      );
      // Field values are Mixed, so tell mongoose the subtree changed
      resume.markModified("fields");
    }

    await resume.save();
    res.json(resume);
  } catch (err) {
    console.error("Error updating resume:", err);
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
    console.error("Error deleting resume:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
