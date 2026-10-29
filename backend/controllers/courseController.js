/**
 * Course controller.
 *
 *   Students  list, listSaved, getOne, save, unsave
 *             (URLs under /api/courses, see routes/courses.js)
 *   Admin     adminList, adminCreate, adminUpdate, adminDelete
 *             (URLs under /api/admin/courses, see routes/adminCatalog.js)
 *
 * The student handlers are shared with opportunities
 * (controllers/shared/createCatalogHandlers). Input rules for the admin forms
 * are in services/courseService.
 */
const mongoose = require("mongoose");
const Course = require("../models/Course");
const createCatalogHandlers = require("./shared/createCatalogHandlers");
const { parseCourseInput } = require("../services/courseService");
const log = require("../utils/logger").scope("COURSES");

const catalog = createCatalogHandlers(Course, {
  noun: "Course",
  plural: "courses",
  log,
});

// ─── Admin ──────────────────────────────────────────────────────────────────

const adminError = (res, action, err) => {
  log.error(`${action}:`, err);
  res.status(500).json({ message: "Server error", error: err.message });
};

/** GET /api/admin/courses */
const adminList = async (req, res) => {
  try {
    res.json(await Course.find());
  } catch (err) {
    adminError(res, "Error fetching courses", err);
  }
};

/** POST /api/admin/courses */
const adminCreate = async (req, res) => {
  try {
    const { error, fields } = parseCourseInput(req.body);
    if (error) return res.status(400).json(error);

    const course = await new Course({ ...fields, createdBy: req.user.id }).save();
    res.status(201).json(course);
  } catch (err) {
    adminError(res, "Error creating course", err);
  }
};

/** PUT /api/admin/courses/:id */
const adminUpdate = async (req, res) => {
  try {
    const { error, fields } = parseCourseInput(req.body);
    if (error) return res.status(400).json(error);

    const course = mongoose.isValidObjectId(req.params.id)
      ? await Course.findByIdAndUpdate(req.params.id, fields, { new: true })
      : null;
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json(course);
  } catch (err) {
    adminError(res, "Error updating course", err);
  }
};

/** DELETE /api/admin/courses/:id */
const adminDelete = async (req, res) => {
  try {
    const course = mongoose.isValidObjectId(req.params.id) ? await Course.findByIdAndDelete(req.params.id) : null;
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    adminError(res, "Error deleting course", err);
  }
};

module.exports = {
  ...catalog,
  adminList,
  adminCreate,
  adminUpdate,
  adminDelete,
};
