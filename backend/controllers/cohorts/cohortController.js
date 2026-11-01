/**
 * Cohorts controller.
 *
 * Listing, viewing, creating, editing, duplicating, deleting and enrolling in cohorts.
 *
 * Wired to URLs in routes/cohorts/cohort.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const Question = require("../../models/Question");
const User = require("../../models/User");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../../services/cohortCascadeService");
const { attachedGroupsOf } = require("../../services/userGroups/cohortGroupService");
const cohortProctorService = require("../../services/cohortProctorService");
const mongoose = require("mongoose");
const { ATTEMPT_FIELDS, EXAM_LIST_FIELDS, parseExamModeInput } = require("../../services/cohorts/examSettings");
const { EXAM_MODE, EXAM_STATE, getExamAttempt, getExamWindow } = require("../../utils/examAccess");
const { blockedByExamWindow, ensureExamAttemptStarted } = require("../../services/cohorts/examGateService");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { runWithOptionalTransaction } = require("../../utils/mongoTransaction");
const log = require("../../utils/logger").scope("COHORTS");

// Get all cohorts (admin view) - OPTIMIZED with minimal data
const getAdminCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find()
      .select(
        `title description startDate endDate accessType eligibleUsers userGroups createdBy createdAt isActive isDraft ${EXAM_LIST_FIELDS}`
      )
      .populate("createdBy", "name email")
      .lean()
      .sort({ createdAt: -1 });

    // Transform cohorts to include user count instead of full user array
    const cohortsWithCount = cohorts.map((cohort) => {
      const userCount = cohort.eligibleUsers ? cohort.eligibleUsers.length : 0;
      // Remove the full eligibleUsers array, replace with count
      const { eligibleUsers, userGroups, ...cohortWithoutUsers } = cohort;
      return {
        ...cohortWithoutUsers,
        eligibleUsersCount: userCount,
        userGroupsCount: userGroups ? userGroups.length : 0,
      };
    });

    res.json(cohortsWithCount);
  } catch (err) {
    log.error("Error fetching cohorts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all cohorts (user view - only eligible cohorts) - OPTIMIZED with minimal data
const getMyCohorts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cohorts where the user is eligible - ONLY return fields needed for list display
    //
    // Published exam cohorts stay listed regardless of `isActive` so an eligible
    // student can see the exam before it opens and see that it has closed
    // afterwards. Opening one is still gated by the window; this is visibility
    // only.
    const eligibleCohorts = await Cohort.find({
      ...Cohort.accessFilter(userId),
      isDraft: false,
      $or: [{ isActive: true }, { mode: EXAM_MODE }],
    })
      .select(
        `title description startDate endDate createdBy createdAt modules accessType eligibleUsers averageRating feedbacks isActive ${EXAM_LIST_FIELDS}`
      ) // Include modules, eligibleUsers, rating and exam scheduling fields
      .populate("createdBy", "name email")
      .lean();

    // Get the user's cohort progress - only essential fields
    const userCohorts = await UserCohort.find({ user: userId })
      .select(`cohort status totalScore rank ${ATTEMPT_FIELDS}`)
      .lean();

    // Combine the data
    const cohortsWithProgress = eligibleCohorts.map((cohort) => {
      const userCohort = userCohorts.find(
        (uc) => uc.cohort.toString() === cohort._id.toString()
      );

      return {
        ...cohort,
        // Server-evaluated attempt state: the card renders from this instead of
        // comparing exam times against the browser clock. Includes this student's
        // own deadline when their attempt is running.
        examWindow: getExamAttempt(cohort, userCohort),
        // The exam is over for this student — by their hand or their clock — even
        // if the joining window is still open for everyone else.
        examSubmitted: Boolean(userCohort?.examSubmittedAt),
        userProgress: userCohort
          ? {
              status: userCohort.status,
              totalScore: userCohort.totalScore,
              rank: userCohort.rank,
            }
          : null,
      };
    });

    res.json(cohortsWithProgress);
  } catch (err) {
    log.error("Error fetching cohorts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get a specific cohort (admin view) - OPTIMIZED to not populate questions OR users
const getAdminCohort = async (req, res) => {
  try {
    const cohortId = req.params.id;
    log.debug(`Admin fetching cohort: ${cohortId}`);

    // Check if the cohort exists - ONLY populate modules WITHOUT questions
    // DO NOT populate eligibleUsers - the attached user groups are fetched on demand
    const cohort = await Cohort.findById(cohortId)
      .select(
        `title description startDate endDate videoResource documentationUrl accessType createdBy createdAt updatedAt isActive isDraft ${EXAM_LIST_FIELDS}`
      )
      .populate("createdBy", "name email")
      .populate({
        path: "modules",
        select:
          "title description order videoResource documentationUrl resources cohort questions createdAt updatedAt",
      })
      .lean();

    if (!cohort) {
      log.debug(`Cohort ${cohortId} not found in the database (admin view)`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    log.debug(
      `Successfully fetched cohort ${cohortId} for admin with ${
        cohort.modules?.length || 0
      } modules (questions NOT populated, eligibleUsers NOT populated - will load on demand)`
    );
    res.json(cohort);
  } catch (err) {
    log.error("Error fetching cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get a specific cohort (user view)
const getCohort = async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    log.debug(`Fetching cohort: ${cohortId}, user: ${userId}`);

    // First check if the cohort exists at all
    const cohortExists = await Cohort.findById(cohortId);
    if (!cohortExists) {
      log.debug(`Cohort ${cohortId} not found in the database`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // Check if user is admin or teacher - use consistent property access
    const isAdmin = isAdminOrTeacher(req.user);
    log.debug(
      `User is admin/teacher: ${isAdmin}, userType: ${req.user.userType}`
    );

    // If admin, skip the eligibility checks
    if (!isAdmin) {
      const isEligible = cohortExists.isOpenTo(userId);
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

      // The gate covers all of it: before the window, after it without having
      // started, a personal deadline that has passed, and an exam already ended.
      if (await blockedByExamWindow(res, cohortExists, {
        isPrivileged: false,
        userId: req.user.id,
      })) {
        return;
      }

      if (cohortExists.mode === EXAM_MODE) {
        // Opening the cohort is what starts the personal clock. Doing it here
        // rather than trusting a client call means a student cannot dodge the
        // timer by skipping the exam screen and going straight to a question.
        await ensureExamAttemptStarted(cohortExists, userId).catch((err) =>
          log.error("Exam attempt start failed:", err.message)
        );

        // Opening the cohort during the window also counts as attending.
        // Recorded fire-and-forget so proctoring can never block the exam.
        cohortProctorService
          .recordExamEntry(cohortExists, userId)
          .catch((err) =>
            log.error("Proctor entry record failed:", err.message)
          );
      }
    } else {
      log.debug(
        `Admin user: bypassing eligibility checks for cohort ${cohortId}`
      );
    }

    // Get the cohort with properly populated fields - INCLUDING modules array and feedbacks
    const cohort = await Cohort.findById(cohortId)
      .select(
        `title description startDate endDate videoResource documentationUrl accessType eligibleUsers modules createdBy createdAt updatedAt cloneGroupId feedbacks averageRating isActive isDraft ${EXAM_LIST_FIELDS}`
      )
      .populate("createdBy", "name email")
      .lean(); // Use lean() for better performance

    // Get the modules for this cohort - fetch by IDs from cohort.modules array
    // This supports the shared content model where modules are referenced, not owned
    const moduleIds = cohort.modules || [];
    const modules = await Module.find({ _id: { $in: moduleIds } })
      .sort({ order: 1 })
      .select(
        "title description order videoResource documentationUrl resources cohort questions"
      )
      .lean();

    // Get the user's progress
    const userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    })
      .select(
        `status totalScore rank moduleProgress questionProgress ${ATTEMPT_FIELDS}`
      )
      .lean();

    // Get cohort leaderboard excluding admin and teacher users
    const leaderboard = await UserCohort.find({ cohort: cohortId })
      .sort({ totalScore: -1 })
      .limit(10)
      .populate({
        path: "user",
        match: { userType: { $nin: ["admin", "teacher"] } }, // Exclude admin and teacher users
        select: "name rollNumber department userType",
      });

    // Filter out entries where user is null (admin users filtered out by populate match)
    const filteredLeaderboard = leaderboard.filter(
      (entry) => entry.user !== null
    );

    // EXPLICITLY fetch the top 3 enrolled users with profile pictures
    // Convert ID strings to ObjectIds if necessary
    // A global cohort has no eligible list, so its avatars come from the leaderboard.
    const userIds =
      cohort.accessType === "global"
        ? filteredLeaderboard.map((entry) => entry.user._id)
        : cohort.eligibleUsers.map((id) =>
            typeof id === "string" ? mongoose.Types.ObjectId(id) : id
          );

    // Get top 3 eligible users with their profile pictures
    const enrolledUsers = await User.find({
      _id: { $in: userIds },
    })
      .select("name profilePicture")
      .limit(3);

    log.debug(
      "Enrolled users with profile pictures:",
      JSON.stringify(enrolledUsers)
    );

    // Combine the data
    const result = {
      ...cohort,
      modules,
      // Drives the countdown banner and the client-side exam guard. Reflects this
      // student's own deadline once their attempt has begun.
      examWindow: getExamAttempt(cohort, userCohort),
      userProgress: userCohort
        ? {
            status: userCohort.status,
            totalScore: userCohort.totalScore,
            rank: userCohort.rank,
            moduleProgress: userCohort.moduleProgress,
            questionProgress: userCohort.questionProgress,
          }
        : null,
      leaderboard: filteredLeaderboard.map((entry) => ({
        user: entry.user,
        totalScore: entry.totalScore,
        rank: entry.rank,
      })),
      enrolledUsers: enrolledUsers,
    };

    log.debug(
      `Successfully fetched cohort ${cohortId} with ${modules.length} modules`
    );
    log.debug(
      `Included ${enrolledUsers.length} enrolled users with profile data`
    );

    res.json(result);
  } catch (err) {
    log.error("Error fetching cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create a new cohort
const createCohort = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive,
      isDraft,
      mode,
      examStartTime,
      examEndTime,
      examDurationMinutes,
      accessType,
    } = req.body;

    // Validate required fields
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description", "startDate", "endDate"],
      });
    }

    const examFields = parseExamModeInput({
      mode,
      examStartTime,
      examEndTime,
      examDurationMinutes,
    });
    if (examFields.error) {
      return res.status(400).json(examFields.error);
    }

    // Create the cohort
    const cohort = new Cohort({
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive: isActive !== undefined ? isActive : true,
      isDraft: isDraft !== undefined ? isDraft : true,
      createdBy: req.user.id,
      // "global" or "userGroups"; anything else fails the schema's enum and answers 400.
      // Changing it later goes through PUT /:id/access.
      ...(accessType !== undefined && { accessType }),
      ...examFields.values,
    });

    await cohort.save();

    res.status(201).json(cohort);
  } catch (err) {
    log.error("Error creating cohort:", err);
    // Surface the schema's exam-window invariants as a 400, not a 500.
    if (err.name === "ValidationError" || /exam/i.test(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Duplicate a cohort - creates a new cohort referencing the same modules and questions
const duplicateCohort = async (req, res) => {
  try {
    const originalCohortId = req.params.id;
    log.debug(`Starting cohort duplication for cohort ${originalCohortId}`);

    // Step 1: Fetch the original cohort
    log.debug("Fetching original cohort...");
    const originalCohort = await Cohort.findById(originalCohortId);
    if (!originalCohort) {
      return res.status(404).json({ message: "Original cohort not found" });
    }

    // Step 2: Get module IDs directly from the cohort's modules array
    // (modules are now shared across related cohorts)
    log.debug("Getting module references from cohort...");
    const moduleIds = originalCohort.modules || [];
    log.debug(`Found ${moduleIds.length} modules to reference`);

    // Step 2b: Establish or join clone group
    // If original cohort has cloneGroupId, use it; otherwise create new one
    let cloneGroupId = originalCohort.cloneGroupId;

    if (!cloneGroupId) {
      // Generate new clone group ID using original cohort ID
      cloneGroupId = `clone_${originalCohortId}_${Date.now()}`;
      log.debug(`Creating new clone group: ${cloneGroupId}`);

      // Update original cohort with cloneGroupId
      originalCohort.cloneGroupId = cloneGroupId;
      await originalCohort.save();
      log.debug(`Updated original cohort with cloneGroupId`);
    } else {
      log.debug(`Joining existing clone group: ${cloneGroupId}`);
    }

    // Step 3: Create the new cohort with references to the same modules
    log.debug("Creating new cohort...");

    // Determine initial active state based on dates
    const now = new Date();
    const startDate = new Date(originalCohort.startDate);
    const endDate = new Date(originalCohort.endDate);
    const shouldBeActive = now >= startDate && now <= endDate;

    const duplicatedCohort = new Cohort({
      title: `Copy of ${originalCohort.title}`,
      description: originalCohort.description,
      startDate: originalCohort.startDate,
      endDate: originalCohort.endDate,
      videoResource: originalCohort.videoResource,
      documentationUrl: originalCohort.documentationUrl,
      isActive: shouldBeActive, // Set based on current date and cohort dates
      isDraft: false, // ✅ CHANGED: Set as published so users can see it immediately after a user group is attached
      modules: moduleIds, // Reference the same module IDs
      eligibleUsers: [], // Don't copy eligible users
      cloneGroupId: cloneGroupId, // ✅ CRITICAL: Set clone group ID for cascade system
      createdBy: req.user.id,
    });

    await duplicatedCohort.save();
    log.debug(`Created new cohort with ID: ${duplicatedCohort._id}`);
    log.debug(`- Clone Group ID: ${cloneGroupId}`);
    log.debug(`- Cohort references ${moduleIds.length} existing modules`);
    log.debug(`- Module IDs in cloned cohort:`, duplicatedCohort.modules);
    log.debug(`- Active state: ${shouldBeActive}`);
    log.debug(`- Draft status: false`);

    // DEBUG: Verify the modules were actually saved by re-fetching
    const verifyClone = await Cohort.findById(duplicatedCohort._id).select(
      "modules"
    );
    log.debug(
      `- VERIFY: Re-fetched cloned cohort has ${verifyClone.modules.length} modules:`,
      verifyClone.modules
    );

    // Step 4: Count questions for informational purposes
    const totalQuestions = await Question.countDocuments({
      module: { $in: moduleIds },
    });

    log.debug(`Duplication completed successfully!`);
    log.debug(
      `- Original cohort: ${originalCohort.title} (${originalCohortId})`
    );
    log.debug(
      `- New cohort: ${duplicatedCohort.title} (${duplicatedCohort._id})`
    );
    log.debug(`- Modules referenced: ${moduleIds.length}`);
    log.debug(`- Questions accessible: ${totalQuestions}`);

    // Populate the response
    const populatedCohort = await Cohort.findById(duplicatedCohort._id)
      .populate("createdBy", "name email")
      .populate("modules", "title description order");

    res.status(201).json({
      message:
        "Cohort duplicated successfully - referencing existing modules and questions",
      cohort: populatedCohort,
      stats: {
        modulesReferenced: moduleIds.length,
        questionsAccessible: totalQuestions,
      },
    });
  } catch (err) {
    log.error("Error during cohort duplication:", err);
    res
      .status(500)
      .json({ message: "Failed to duplicate cohort", error: err.message });
  }
};

// Update a cohort
const updateCohort = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive,
      isDraft,
      mode,
      examStartTime,
      examEndTime,
      examDurationMinutes,
    } = req.body;

    // Find the cohort
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    const examFields = parseExamModeInput({
      mode,
      examStartTime,
      examEndTime,
      examDurationMinutes,
    });
    if (examFields.error) {
      return res.status(400).json(examFields.error);
    }
    Object.assign(cohort, examFields.values);

    // Update the fields
    if (title) cohort.title = title;
    if (description) cohort.description = description;
    if (startDate) cohort.startDate = startDate;
    if (endDate) cohort.endDate = endDate;
    if (videoResource !== undefined) cohort.videoResource = videoResource;
    if (documentationUrl !== undefined)
      cohort.documentationUrl = documentationUrl;

    // Handle isDraft changes - when publishing a draft, automatically set correct active state
    if (isDraft !== undefined) {
      const wasOriginallyDraft = cohort.isDraft;
      cohort.isDraft = isDraft;

      // If we're publishing a draft (changing from draft=true to draft=false)
      if (wasOriginallyDraft && !isDraft) {
        log.debug(
          "Publishing draft cohort, determining active state based on dates..."
        );

        // Automatically determine active state based on current date and cohort dates
        const now = new Date();
        const start = new Date(cohort.startDate);
        const end = new Date(cohort.endDate);

        // Set active if current date is between start and end dates
        let shouldBeActive = now >= start && now <= end;

        // An exam cohort must be visible to its eligible users the moment it is
        // published, even when the exam itself is still hours away. It only goes
        // inactive once the window has closed, which the sweeper handles.
        if (cohort.mode === EXAM_MODE) {
          shouldBeActive =
            getExamWindow(cohort, now).state !== EXAM_STATE.ENDED;
        }

        cohort.isActive = shouldBeActive;

        log.debug(`Cohort "${cohort.title}" published:`, {
          currentDate: now.toISOString(),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          setAsActive: shouldBeActive,
        });
      }
    }

    // Allow manual override of isActive if explicitly provided
    if (isActive !== undefined) {
      cohort.isActive = isActive;
    }


    await cohort.save();

    res.json(cohort);
  } catch (err) {
    log.error("Error updating cohort:", err);
    if (err.name === "ValidationError" || /exam/i.test(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Check deletion impact for a cohort (before actual deletion)
const getDeletionImpact = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get module IDs for this cohort
    const moduleIds = cohort.modules || [];

    // Find all OTHER cohorts that share ANY of these modules
    const relatedCohorts = await Cohort.find({
      modules: { $in: moduleIds }, // Find cohorts that have any of these modules
      _id: { $ne: cohort._id }, // Exclude the cohort being deleted
    }).select("_id title modules");

    const isLastCohort = relatedCohorts.length === 0;

    // Get module and question counts
    const moduleCount = moduleIds.length;
    const questionCount = await Question.countDocuments({
      module: { $in: moduleIds },
    });

    // Get user progress count
    const userProgressCount = await UserCohort.countDocuments({
      cohort: cohort._id,
    });

    // A cohort cannot be deleted while user groups are attached to it.
    const userGroups = await attachedGroupsOf(cohort);

    const impact = {
      userGroups,
      canDelete: userGroups.length === 0,
      isLastCohort,
      relatedCohorts: relatedCohorts.map((c) => ({
        id: c._id,
        title: c.title,
        sharedModules: c.modules.filter((m) => moduleIds.includes(m.toString()))
          .length,
      })),
      relatedCohortsCount: relatedCohorts.length,
      modulesCount: moduleCount,
      questionsCount: questionCount,
      userProgressCount,
      warning: isLastCohort
        ? `⚠️ This is the LAST cohort using these modules. Deleting it will permanently remove ${moduleCount} modules and ${questionCount} questions.`
        : `✅ ${relatedCohorts.length} other cohort(s) are using these modules. Modules and questions will be preserved.`,
    };

    log.debug(`Deletion impact for cohort "${cohort.title}":`, impact);

    res.json(impact);
  } catch (err) {
    log.error("Error checking deletion impact:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete a cohort
// ✅ UNIFIED CASCADE MODEL: Uses cascade service for proper relational deletion
// - If last cohort in group: Deletes ALL modules, questions, and user data globally
// - If not last: Deletes only cohort-specific user data, preserves shared content
const deleteCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // User groups must be detached first, like detaching a policy before deleting a resource.
    const userGroups = await attachedGroupsOf(cohort);
    if (userGroups.length > 0) {
      return res.status(409).json({
        message: `Detach the ${userGroups.length} user group(s) from this cohort before deleting it`,
        reason: "user_groups_attached",
        userGroups,
      });
    }

    log.debug(`🗑️ Deleting cohort ${cohort._id} (${cohort.title})`);

    {
      // Use cascade service for proper deletion with relational logic
      const { result: deletionStats } = await runWithOptionalTransaction(
        (session) => cascadeService.deleteCohortWithCascade(cohort._id, session),
        { label: "cohort deletion" }
      );

      const deletionSummary = {
        message: deletionStats.isLastCohort
          ? "Last cohort deleted - all shared content removed"
          : "Cohort deleted - shared content preserved for other cohorts",
        ...deletionStats,
      };

      log.debug("✅ Cohort deletion completed:", deletionSummary);

      res.json(deletionSummary);
    }
  } catch (err) {
    log.error("❌ Error deleting cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Auto-enroll in a cohort for eligible users
const enrollInCohort = async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    // Check if the cohort exists and is active
    const cohort = await Cohort.findOne({
      _id: cohortId,
      isDraft: false,
      $or: [{ isActive: true }, { mode: EXAM_MODE }],
    });

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not active" });
    }

    // Enrolment is permitted before the window opens so the very first request
    // at start time cannot lose a race against the clock. It is refused once
    // the exam has ended.
    if (
      await blockedByExamWindow(res, cohort, {
        isPrivileged: false,
        allowBeforeStart: true,
      })
    ) {
      return;
    }

    // Check if the user is eligible
    const isEligible = cohort.isOpenTo(userId);

    if (!isEligible) {
      return res
        .status(403)
        .json({ message: "You are not eligible for this cohort" });
    }

    // ✅ Check if user is already enrolled in ANY related cohort (original or clones)
    const relatedCohorts = await cascadeService.getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);

    const existingEnrollment = await UserCohort.findOne({
      user: userId,
      cohort: { $in: relatedCohortIds },
      status: { $in: ["enrolled", "completed"] },
    }).populate("cohort", "title");

    if (existingEnrollment) {
      return res.status(409).json({
        message: "Already enrolled in a related cohort",
        enrolledInCohort: existingEnrollment.cohort.title,
        enrolledInCohortId: existingEnrollment.cohort._id,
        status: existingEnrollment.status,
        hint: "You can only be enrolled in one cohort from a set of related cohorts (original + clones). Please unenroll from the other cohort first.",
      });
    }

    // Check if the user has already enrolled
    let userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });

    if (userCohort) {
      // If the user has applied but not enrolled, update status to enrolled
      if (userCohort.status === "applied") {
        userCohort.status = "enrolled";
        userCohort.enrolledAt = new Date();
        await userCohort.save();

        return res.json({
          message: "Successfully enrolled in cohort",
          userCohort,
        });
      }

      // If already enrolled or completed, return current status
      return res.json({
        message: `You are already ${userCohort.status} in this cohort`,
        userCohort,
      });
    }

    // Create a new user cohort record with enrolled status
    userCohort = new UserCohort({
      user: userId,
      cohort: cohortId,
      status: "enrolled",
      enrolledAt: new Date(),
    });

    // ✅ SHARED CONTENT MODEL: Use cohort's modules array (works for cloned cohorts)
    const cohortDoc = await Cohort.findById(cohortId);
    const moduleIds = cohortDoc.modules;

    for (const moduleId of moduleIds) {
      // Get questions count for this module
      const questionsCount = await Question.countDocuments({
        module: moduleId,
      });

      userCohort.moduleProgress.push({
        module: moduleId,
        questionsCompleted: 0,
        totalQuestions: questionsCount,
        score: 0,
        completed: false,
      });
    }

    await userCohort.save();

    // Return success response
    res.status(201).json({
      message: "Successfully enrolled in cohort",
      userCohort,
    });
  } catch (err) {
    log.error("Error enrolling in cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getAdminCohorts,
  getMyCohorts,
  getAdminCohort,
  getCohort,
  createCohort,
  duplicateCohort,
  updateCohort,
  getDeletionImpact,
  deleteCohort,
  enrollInCohort,
};
