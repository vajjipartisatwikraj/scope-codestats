/**
 * Notes controller.
 *
 * A student's private notes on a question.
 *
 * Wired to URLs in routes/cohorts/note.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Note = require("../../models/Note");
const UserCohort = require("../../models/UserCohort");
const log = require("../../utils/logger").scope("COHORT-NOTES");

// Get notes for a specific question
const getNotes = async (req, res) => {
  try {
    const { cohortId, moduleId, questionId } = req.params;
    const userId = req.user.id;

    // SECURITY: Check cohort published status
    const isAdminOrTeacher =
      req.user.userType === "admin" || req.user.userType === "teacher";

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    if (!isAdminOrTeacher && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }

    // Check if the user has access to this cohort
    const userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });

    if (!userCohort && !isAdminOrTeacher) {
      return res.status(403).json({
        message: "Not enrolled in this cohort",
        reason: "not_enrolled",
      });
    }

    // Find the note or return empty notes
    const note = await Note.findOne({
      user: userId,
      cohort: cohortId,
      module: moduleId,
      question: questionId,
    });

    // Return notes or empty string if not found
    res.json({
      notes: note ? note.notes : "",
      lastUpdated: note ? note.updatedAt : null,
    });
  } catch (err) {
    log.error("Error fetching notes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Save notes for a specific question
const saveNote = async (req, res) => {
  try {
    const { cohortId, moduleId, questionId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    // SECURITY: Check cohort published status
    const isAdminOrTeacher =
      req.user.userType === "admin" || req.user.userType === "teacher";

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    if (!isAdminOrTeacher && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }

    // Check if the user has access to this cohort
    const userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });

    if (!userCohort) {
      return res.status(403).json({
        message: "Not enrolled in this cohort",
        reason: "not_enrolled",
      });
    }

    // Find and update the note or create a new one
    let note = await Note.findOne({
      user: userId,
      cohort: cohortId,
      module: moduleId,
      question: questionId,
    });

    if (note) {
      // Update existing note
      note.notes = notes;
      note.updatedAt = Date.now();
    } else {
      // Create new note
      note = new Note({
        user: userId,
        cohort: cohortId,
        module: moduleId,
        question: questionId,
        notes,
      });
    }

    await note.save();

    res.json({
      message: "Notes saved successfully",
      lastUpdated: note.updatedAt,
    });
  } catch (err) {
    log.error("Error saving notes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getNotes,
  saveNote,
};
