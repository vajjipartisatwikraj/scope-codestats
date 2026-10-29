/**
 * Opportunity controller (competitions, hackathons, internships, workshops).
 *
 *   Students  list, listSaved, getOne, save, unsave
 *             (URLs under /api/opportunities, see routes/opportunities.js)
 *   Admin     adminList, adminCreate, adminUpdate, adminDelete
 *             (URLs under /api/admin/opportunities, see routes/adminCatalog.js)
 *
 * The student handlers are shared with courses
 * (controllers/shared/createCatalogHandlers). Input rules for the admin forms
 * are in services/opportunityService.
 */
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const createCatalogHandlers = require("./shared/createCatalogHandlers");
const { parseOpportunityInput } = require("../services/opportunityService");
const log = require("../utils/logger").scope("OPPORTUNITIES");

const catalog = createCatalogHandlers(Opportunity, {
  noun: "Opportunity",
  plural: "opportunities",
  log,
});

// ─── Admin ──────────────────────────────────────────────────────────────────

const adminError = (res, action, err) => {
  log.error(`${action}:`, err);
  res.status(500).json({ message: "Server error", error: err.message });
};

/** GET /api/admin/opportunities */
const adminList = async (req, res) => {
  try {
    res.json(await Opportunity.find());
  } catch (err) {
    adminError(res, "Error fetching opportunities", err);
  }
};

/** POST /api/admin/opportunities */
const adminCreate = async (req, res) => {
  try {
    const { error, fields } = parseOpportunityInput(req.body);
    if (error) return res.status(400).json(error);

    const opportunity = await new Opportunity({ ...fields, createdBy: req.user.id }).save();
    res.status(201).json(opportunity);
  } catch (err) {
    adminError(res, "Error creating opportunity", err);
  }
};

/** PUT /api/admin/opportunities/:id */
const adminUpdate = async (req, res) => {
  try {
    const { error, fields } = parseOpportunityInput(req.body, { forUpdate: true });
    if (error) return res.status(400).json(error);

    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findByIdAndUpdate(req.params.id, fields, { new: true })
      : null;
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });

    res.json(opportunity);
  } catch (err) {
    adminError(res, "Error updating opportunity", err);
  }
};

/** DELETE /api/admin/opportunities/:id */
const adminDelete = async (req, res) => {
  try {
    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findByIdAndDelete(req.params.id)
      : null;
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });

    res.json({ message: "Opportunity deleted successfully" });
  } catch (err) {
    adminError(res, "Error deleting opportunity", err);
  }
};

module.exports = {
  ...catalog,
  adminList,
  adminCreate,
  adminUpdate,
  adminDelete,
};
