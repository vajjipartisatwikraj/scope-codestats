/**
 * The bank library API (mounted at /api/bank-library): banks of questions kept in an S3 bucket,
 * organised as bank > topic > question, and the imports that copy them into cohorts.
 *
 *   Reading and importing   admins and teachers (a teacher sees published banks only)
 *   Writing                 admins
 *
 * The routes only check who is asking and hand over to services/bankLibrary/. See that folder's
 * files for what each call does.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth"); // admin or teacher
const adminOnly = require("../middleware/adminOnly");
const logger = require("../utils/logger");
const { isConfigured } = require("../config/bankLibrary");
const { isAdmin } = require("../utils/userHelpers");
const { BankLibraryError } = require("../services/bankLibrary/common");
const catalog = require("../services/bankLibrary/catalogService");
const imports = require("../services/bankLibrary/importService");
const store = require("../services/bankLibrary/s3Store");

const router = express.Router();

const staff = [auth, adminAuth];
const admin = [auth, adminOnly];

/**
 * Wraps a handler: answers with what it returns (status 200, or `status`), and turns the library's
 * own errors into their status and message. The library answers 503 until a bucket is configured.
 */
const handle =
  (work, { status = 200, needsBucket = true } = {}) =>
  async (req, res) => {
    try {
      if (needsBucket && !isConfigured()) {
        throw new BankLibraryError("The bank library is not set up yet. Ask an administrator to configure its S3 bucket.", 503, "BANK_LIBRARY_NOT_CONFIGURED");
      }
      const result = await work(req);
      res.status(status).json(result);
    } catch (error) {
      if (error instanceof BankLibraryError) {
        res.locals.logMessage = error.message;
        if (error.status >= 500) logger.captureError(res, error.cause || error);
        return res.status(error.status).json(error.toResponse());
      }
      logger.captureError(res, error);
      return res.status(500).json({ message: "Server error" });
    }
  };

// ---- Status ----------------------------------------------------------------------------------------

router.get(
  "/status",
  staff,
  handle(
    async (req) => {
      const configured = isConfigured();
      const body = { configured, canManage: isAdmin(req.user) };
      if (configured && body.canManage) Object.assign(body, await store.checkReachable());
      return body;
    },
    { needsBucket: false }
  )
);

// ---- Reading -------------------------------------------------------------------------------------------

router.get("/banks", staff, handle((req) => catalog.listBanks({ user: req.user, search: req.query.search, status: req.query.status })));
router.get("/search", staff, handle((req) => catalog.search(req.query.q, req.user)));
router.get("/banks/:bankId", staff, handle((req) => catalog.getBank(req.params.bankId, req.user)));
router.get("/banks/:bankId/topics/:topicId", staff, handle((req) => catalog.getTopic(req.params.bankId, req.params.topicId, req.user)));
router.get(
  "/banks/:bankId/topics/:topicId/questions",
  staff,
  handle((req) => catalog.listQuestions(req.params.bankId, req.params.topicId, { user: req.user, search: req.query.search, difficulty: req.query.difficulty, type: req.query.type }))
);
router.get(
  "/banks/:bankId/topics/:topicId/questions/:questionId",
  staff,
  handle((req) => catalog.getQuestion(req.params.bankId, req.params.topicId, req.params.questionId, req.user))
);

// ---- Writing (admins) -------------------------------------------------------------------------------------

router.post("/banks", admin, handle((req) => catalog.createBank(req.body, req.user), { status: 201 }));
router.put("/banks/:bankId", admin, handle((req) => catalog.updateBank(req.params.bankId, req.body, req.user)));
router.delete("/banks/:bankId", admin, handle((req) => catalog.deleteBank(req.params.bankId)));

router.post("/banks/:bankId/topics", admin, handle((req) => catalog.createTopic(req.params.bankId, req.body, req.user), { status: 201 }));
router.put("/banks/:bankId/topics/:topicId", admin, handle((req) => catalog.updateTopic(req.params.bankId, req.params.topicId, req.body, req.user)));
router.delete("/banks/:bankId/topics/:topicId", admin, handle((req) => catalog.deleteTopic(req.params.bankId, req.params.topicId)));

router.post("/banks/:bankId/topics/:topicId/questions", admin, handle((req) => catalog.createQuestion(req.params.bankId, req.params.topicId, req.body, req.user), { status: 201 }));
router.post("/banks/:bankId/topics/:topicId/questions/bulk", admin, handle((req) => catalog.bulkCreateQuestions(req.params.bankId, req.params.topicId, req.body, req.user), { status: 201 }));
router.put("/banks/:bankId/topics/:topicId/questions/:questionId", admin, handle((req) => catalog.updateQuestion(req.params.bankId, req.params.topicId, req.params.questionId, req.body, req.user)));
router.delete("/banks/:bankId/topics/:topicId/questions/:questionId", admin, handle((req) => catalog.deleteQuestion(req.params.bankId, req.params.topicId, req.params.questionId)));

router.post("/reindex", admin, handle(() => catalog.reindex()));

// ---- Imports into cohorts (admins and teachers, as for the cohort's own content routes) ------------------------

router.post(
  "/imports",
  staff,
  handle(
    (req) => {
      const { cohortId, bankId, topicIds, questionIds, moduleId } = req.body || {};
      return imports.startImport({ user: req.user, cohortId, bankId, topicIds, questionIds, moduleId });
    },
    { status: 202 }
  )
);
router.get("/imports", staff, handle((req) => imports.listJobs(req.query.cohortId, Math.min(10, Math.max(1, Number.parseInt(req.query.limit, 10) || 5)))));
router.get("/imports/:jobId", staff, handle((req) => imports.getJob(req.params.jobId)));
router.post("/imports/:jobId/cancel", staff, handle((req) => imports.cancelJob(req.params.jobId)));
router.post("/imports/:jobId/retry", staff, handle((req) => imports.retryJob(req.params.jobId), { status: 202 }));

module.exports = router;
