/**
 * Modules controller.
 *
 * The modules of a cohort: viewing them, and adding, editing and deleting them.
 *
 * Wired to URLs in routes/cohorts/module.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../../services/cohortCascadeService");
const mongoose = require("mongoose");
const { EXAM_MODE } = require("../../utils/examAccess");
const { blockedByExamWindow } = require("../../services/cohorts/examGateService");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { runWithOptionalTransaction } = require("../../utils/mongoTransaction");
const log = require("../../utils/logger").scope("COHORT-MODULES");

// Get modules for a specific cohort
const getModules = async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    log.debug(`Fetching modules for cohort: ${cohortId}, user: ${userId}`);
    log.debug(
      `User type: ${
        req.user.userType
      }, isAdmin/Teacher check: ${isAdminOrTeacher(req.user)}`
    );

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);
    log.debug(`User is admin/teacher: ${isAdmin}`);

    // First check if the cohort exists at all
    const cohortExists = await Cohort.findById(cohortId);
    if (!cohortExists) {
      log.debug(`Cohort ${cohortId} not found in the database`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // If user is admin, skip eligibility checks
    if (isAdmin) {
      log.debug(`Admin user: bypassing eligibility checks`);
      // Use the cohort's modules array as the source of truth (supports cloned/shared modules)
      const modules = await Module.find({ _id: { $in: cohortExists.modules } })
        .sort({ order: 1 })
        .populate({
          path: "questions",
          select: "title type difficultyLevel marks stats",
        });

      log.debug(
        `Found ${modules.length} modules for cohort ${cohortId} (admin access)`
      );
      return res.json({ modules });
    }

    // For regular users, check eligibility
    const isEligible = cohortExists.eligibleUsers.some(
      (id) => id.toString() === userId.toString()
    );
    const isActive = cohortExists.isActive;
    const isDraft = cohortExists.isDraft;

    log.debug(
      `User eligibility check - isEligible: ${isEligible}, isActive: ${isActive}, isDraft: ${isDraft}`
    );

    if (!isEligible) {
      return res.status(403).json({
        message: "You are not eligible for this cohort",
        reason: "not_eligible",
      });
    }

    if (!isActive) {
      return res
        .status(403)
        .json({ message: "This cohort is not active", reason: "not_active" });
    }

    if (isDraft) {
      return res.status(403).json({
        message: "This cohort is in draft mode",
        reason: "draft_mode",
      });
    }

    if (await blockedByExamWindow(res, cohortExists, {
        isPrivileged: false,
        userId: req.user.id,
      })) {
      return;
    }

    // Get the modules for this cohort (use the cohort's modules array as source of truth)
    const modules = await Module.find({ _id: { $in: cohortExists.modules } })
      .sort({ order: 1 })
      .populate({
        path: "questions",
        select: "title type difficultyLevel marks stats",
      });

    log.debug(`Found ${modules.length} modules for cohort ${cohortId}`);
    res.json({ modules });
  } catch (err) {
    log.error("Error fetching modules:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get a specific module from a cohort
const getModule = async (req, res) => {
  try {
    const { id: cohortId, moduleId } = req.params;
    const userId = req.user.id;

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);

    // Verify the cohort exists and user has access.
    // Exam cohorts are matched without the `isActive` filter so a closed exam
    // reports "exam ended" instead of a misleading 404.
    let cohort;
    if (isAdmin) {
      cohort = await Cohort.findById(cohortId);
    } else {
      cohort = await Cohort.findOne({
        _id: cohortId,
        eligibleUsers: userId,
        isDraft: false,
        $or: [{ isActive: true }, { mode: EXAM_MODE }],
      });
    }

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not eligible" });
    }

    if (!isAdmin && cohort.mode !== EXAM_MODE && !cohort.isActive) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not eligible" });
    }

    if (await blockedByExamWindow(res, cohort, {
      isPrivileged: isAdmin,
      userId: req.user.id,
    })) {
      return;
    }

    // Find the specific module
    const module = await Module.findOne({
      _id: moduleId,
      cohort: cohortId,
    }).populate({
      path: "questions",
      select: isAdmin ? "" : "title type difficultyLevel marks stats",
    });

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    res.json(module);
  } catch (err) {
    log.error("Error fetching module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// MODULES API Endpoints
// Create a new module in a cohort
// ✅ SHARED CONTENT MODEL: Create module and add to ALL related cohorts
const createModule = async (req, res) => {
  try {
    const {
      title,
      description,
      order,
      videoResource,
      documentationUrl,
      resources,
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description"],
      });
    }

    // Check if the cohort exists
    const cohort = await Cohort.findById(req.params.cohortId);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get all related cohorts (cohorts sharing the same modules)
    const relatedCohorts = await cascadeService.getRelatedCohorts(cohort._id);

    // PREVIEW MODE: Return information about affected cohorts for frontend confirmation
    if (req.query.preview === "true") {
      return res.json({
        action: "create_module",
        affectedCohorts: relatedCohorts,
        moduleData: {
          title,
          description,
          order: order || 0,
          videoResource,
          documentationUrl,
          resourcesCount: resources?.length || 0,
        },
      });
    }

    // Find the highest order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const highestOrderModule = await Module.findOne({
        cohort: cohort._id,
      }).sort({ order: -1 });

      moduleOrder = highestOrderModule ? highestOrderModule.order + 1 : 0;
    }

    const moduleData = {
      title,
      description,
      order: moduleOrder,
      videoResource,
      documentationUrl,
      resources: resources || [],
      cohort: cohort._id,
    };
    const relatedCohortIds = relatedCohorts.map((relatedCohort) => relatedCohort._id);
    const { isTransactionsUnavailableError } = require("../../utils/mongoTransaction");
    const session = await mongoose.startSession();
    let module;
    let requiresStandaloneFallback = false;

    try {
      session.startTransaction();
      module = new Module(moduleData);
      await module.save({ session });

      const cohortUpdate = await Cohort.updateMany(
        { _id: { $in: relatedCohortIds } },
        { $addToSet: { modules: module._id } },
        { session }
      );
      if (cohortUpdate.matchedCount !== relatedCohortIds.length) {
        throw new Error("One or more related cohorts no longer exist");
      }

      await session.commitTransaction();
    } catch (err) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          log.error("Error aborting module creation transaction:", abortError);
        }
      }
      if (!isTransactionsUnavailableError(err)) throw err;
      requiresStandaloneFallback = true;
    } finally {
      await session.endSession();
    }

    if (requiresStandaloneFallback) {
      log.warn(
        "MongoDB transactions are unavailable; creating the module with compensating rollback protection."
      );
      module = new Module(moduleData);
      await module.save();

      try {
        const cohortUpdate = await Cohort.updateMany(
          { _id: { $in: relatedCohortIds } },
          { $addToSet: { modules: module._id } }
        );
        if (cohortUpdate.matchedCount !== relatedCohortIds.length) {
          throw new Error("One or more related cohorts no longer exist");
        }
      } catch (fallbackError) {
        const compensation = await Promise.allSettled([
          Cohort.updateMany(
            { _id: { $in: relatedCohortIds } },
            { $pull: { modules: module._id } }
          ),
          Module.deleteOne({ _id: module._id }),
        ]);
        const compensationFailures = compensation.filter(
          (result) => result.status === "rejected"
        );
        if (compensationFailures.length > 0) {
          fallbackError.compensationFailed = true;
          log.error(
            "CRITICAL: Module creation compensation was incomplete:",
            compensationFailures.map((result) => result.reason)
          );
        }
        throw fallbackError;
      }
    }

    log.debug(
      `Module "${title}" created and added to ${relatedCohorts.length} cohort(s)`
    );

    res.status(201).json({
      message: `Module created and added to ${relatedCohorts.length} cohort(s)`,
      module,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("Error creating module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ SHARED CONTENT MODEL: Update module (affects ALL related cohorts)
const updateModule = async (req, res) => {
  try {
    const {
      title,
      description,
      order,
      videoResource,
      documentationUrl,
      resources,
    } = req.body;

    // Find the module (don't check cohort ownership since module is shared)
    const module = await Module.findById(req.params.moduleId);

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Get all related cohorts
    const relatedCohorts = await cascadeService.getRelatedCohorts(req.params.cohortId);

    // PREVIEW MODE: Return information about affected cohorts
    if (req.query.preview === "true") {
      return res.json({
        action: "edit_module",
        affectedCohorts: relatedCohorts,
        currentData: {
          title: module.title,
          description: module.description,
          order: module.order,
          videoResource: module.videoResource,
          documentationUrl: module.documentationUrl,
          resourcesCount: module.resources?.length || 0,
        },
        newData: req.body,
      });
    }

    // Update the fields (affects all cohorts since they share the reference)
    if (title) module.title = title;
    if (description) module.description = description;
    if (order !== undefined) module.order = order;
    if (videoResource !== undefined) module.videoResource = videoResource;
    if (documentationUrl !== undefined)
      module.documentationUrl = documentationUrl;
    if (resources) module.resources = resources;

    await module.save();

    log.debug(
      `Module "${module.title}" updated across ${relatedCohorts.length} cohort(s)`
    );

    res.json({
      message: `Module updated across ${relatedCohorts.length} cohort(s)`,
      module,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("Error updating module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ UNIFIED CASCADE MODEL: Delete module from ALL related cohorts with full cascade
const deleteModule = async (req, res) => {
  try {
    // Find the module
    const module = await Module.findById(req.params.moduleId).populate(
      "questions"
    );

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Get all related cohorts
    const relatedCohorts = await cascadeService.getRelatedCohorts(req.params.cohortId);

    // PREVIEW MODE: Return information about affected cohorts
    if (req.query.preview === "true") {
      return res.json({
        action: "delete_module",
        affectedCohorts: relatedCohorts,
        module: {
          _id: module._id,
          title: module.title,
          questionCount: module.questions?.length || 0,
        },
      });
    }

    const { result: deletionStats } = await runWithOptionalTransaction(
      async (session) => {
        // Use cascade service for comprehensive deletion
        const stats = await cascadeService.deleteModuleFromRelatedCohorts(
          req.params.cohortId,
          module._id,
          session
        );

        // Update user progress - remove module from ALL cohorts' user progress
        await UserCohort.updateMany(
          { cohort: { $in: relatedCohorts.map((c) => c._id) } },
          {
            $pull: {
              moduleProgress: { module: module._id },
              questionProgress: {
                question: { $in: module.questions.map((q) => q._id) },
              },
            },
          },
          session ? { session } : {}
        );

        return stats;
      },
      { label: "module deletion" }
    );

    log.debug(
      `✅ Module "${module.title}" deleted from ${deletionStats.affectedCohorts} cohort(s) with full cascade`
    );

    res.json({
      message: `Module deleted from ${deletionStats.affectedCohorts} cohort(s)`,
      ...deletionStats,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("❌ Error deleting module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
};
