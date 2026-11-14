// At the very top of the file - suppress specific experimental warnings
// This must be the first code in the file
process.env.NODE_NO_WARNINGS = "1";
// Patch the default emitWarning function to filter out specific warnings
const originalEmit = process.emitWarning;
process.emitWarning = function (warning, ...args) {
  // Filter out the specific warnings about CommonJS loading ES modules
  if (
    warning &&
    typeof warning === "string" &&
    (warning.includes("CommonJS module") ||
      warning.includes("loading ES Module") ||
      warning.includes("using require"))
  ) {
    return; // Suppress this specific warning
  }
  return originalEmit.call(this, warning, ...args);
};

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("./utils/logger");
const connectDB = require("./config/db");
const validateEnv = require("./config/validateEnv");

// Stop here with a clear message if a required variable is missing.
validateEnv();

// A rejected promise nobody handled used to take the whole process down (Node 15+).
// Log it and keep serving; an exception thrown outside a request leaves the process in an
// unknown state, so that one is logged and the process exits for pm2 to restart it.
process.on("unhandledRejection", (reason) => {
  logger.error("PROCESS", reason instanceof Error ? reason : new Error(String(reason)), {
    note: "unhandled promise rejection",
  });
});
process.on("uncaughtException", (err) => {
  logger.error("PROCESS", err, { note: "uncaught exception, exiting" });
  setTimeout(() => process.exit(1), 100).unref();
});

// Optional Redis - only load if redis package is installed
let redisClient = null;
try {
  redisClient = require("./config/redis");
} catch (error) {
  logger.warn(
    "SERVER",
    "redis package not installed, rate limiter uses memory (npm install redis to enable)",
  );
}

const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profiles");
const leaderboardRoutes = require("./routes/leaderboard");
const usersRoutes = require("./routes/users");
const coursesRoutes = require("./routes/courses");
const opportunitiesRoutes = require("./routes/opportunities");
const mongoose = require("mongoose");
const adminRoutes = require("./routes/admin");
const notificationsRoutes = require("./routes/notifications");
const cron = require("node-cron");
const Profile = require("./models/Profile");
const User = require("./models/User");
const healthRoutes = require("./routes/healthRoutes");
const passport = require("passport");
const session = require("express-session");
const googleAuthRoutes = require("./routes/auth/googleAuth");
const { initializeCronJobs } = require("./cron-jobs");
const webPushUtil = require("./utils/webPushUtil");
const cohortsRoutes = require("./routes/cohorts");
const practiceArenaRoutes = require("./routes/practiceArena");
const compilerRoutes = require("./routes/compiler");
const contactRoutes = require("./routes/contact");
const jwt = require("jsonwebtoken");
const accessList = require("./services/accessListService");

const app = express();
const server = http.createServer(app);

// ============================================
// ENVIRONMENT-AWARE CONFIGURATION WITH FALLBACK
// ============================================
const isDev = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";
const appPort = process.env.PORT || 5000;

// Get frontend URL with fallback mechanism
const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  return isProduction ? "https://scope.mlrit.ac.in" : "http://localhost:5173";
};

const frontendUrl = getFrontendUrl();

// CORS Origins: Support multiple origins for different environments
const corsOrigins = () => {
  if (isProduction) {
    return [
      "https://scope.mlrit.ac.in",
      "scope.mlrit.ac.in",
    ];
  } else {
    // Development: Allow multiple localhost variants and any localhost
    return [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ];
  }
};

logger.debug("SERVER", `frontend ${frontendUrl}`, { cors: corsOrigins().length });

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: corsOrigins(),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  // Production-ready settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
  maxHttpBufferSize: 1e6, // 1MB max message size
  allowEIO3: true, // Backward compatibility
});

// Attach io to app so routes can access it
app.set("io", io);

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn("SOCKET", "connection rejected: no token");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details from database to get email and other info
    const user = await User.findById(decoded.userId).select(
      "email name userType",
    );

    if (!user) {
      logger.warn("SOCKET", "connection rejected: user not found");
      return next(new Error("Authentication error: User not found"));
    }

    // Same rule as the HTTP routes: LOGIN_MODE=allowlist keeps out addresses that are not listed
    if (!(await accessList.canAccess(user))) {
      logger.warn("SOCKET", "connection rejected: email is not on the access list");
      return next(new Error("Authentication error: No access"));
    }

    socket.userId = decoded.userId;
    socket.userEmail = user.email;
    socket.userName = user.name;

    next();
  } catch (error) {
    logger.warn("SOCKET", "authentication failed", { reason: error.message });
    return next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;

  logger.debug("SOCKET", `connected ${userEmail}`, { socket: socket.id });

  // Join user-specific room for targeted notifications
  const userRoom = `user:${userId}`;
  socket.join(userRoom);

  // Send connection confirmation
  socket.emit("connection:success", {
    message: "Connected to real-time server",
    userId: userId,
    timestamp: new Date().toISOString(),
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    logger.debug("SOCKET", `disconnected ${userEmail}`, { reason });
  });

  // Handle errors
  socket.on("error", (error) => {
    logger.error("SOCKET", error, { user: userEmail });
  });

  // Practice Arena: Request timer sync (for reconnections)
  socket.on("pa:timer:requestSync", async (data) => {
    try {
      const { testId } = data;
      logger.debug("SOCKET", `timer sync requested by ${userEmail}`, { test: testId });

      const timerState = await app.locals.paTimerService.getTimerState(testId);

      if (timerState) {
        socket.emit("pa:timer:sync", timerState);
      } else {
        socket.emit("pa:timer:error", {
          message: "Test not found or not active",
        });
      }
    } catch (error) {
      logger.error("SOCKET", error, { event: "pa:timer:requestSync", user: userEmail });
      socket.emit("pa:timer:error", { message: "Failed to sync timer" });
    }
  });

  // Event names only (never the payload), and only when LOG_LEVEL=debug.
  socket.onAny((eventName) => {
    logger.debug("SOCKET", `event ${eventName}`, { user: userEmail });
  });
});

logger.ready("SOCKET", "websocket server");

// Initialize Practice Arena Timer Service
const PracticeArenaTimerService = require("./services/practiceArenaTimerService");
app.locals.paTimerService = new PracticeArenaTimerService(io);

// Exam lifecycle sweeper: moves exam cohorts to inactive once their window ends
const examLifecycleService = require("./services/examLifecycleService");

// Initialize timer service after MongoDB connection
mongoose.connection.once("open", async () => {
  try {
    await app.locals.paTimerService.initialize();
  } catch (error) {
    logger.error("PA-TIMER", error, { note: "failed to initialize timer service" });
  }

  // Access control does not depend on this; it keeps ended exams out of
  // listings and dashboards without waiting for someone to open the cohort.
  try {
    examLifecycleService.startExamSweeper();
  } catch (error) {
    logger.error("EXAM-SWEEPER", error, { note: "failed to start" });
  }

  // A profile sync that was running when the server stopped can never finish.
  // Close it now so the admin list does not show it as running forever.
  try {
    await require("./services/syncJobService").reconcileStaleRuns(0);
  } catch (error) {
    logger.error("SYNC-JOBS", error, { note: "failed to close interrupted runs" });
  }

  // Speech tests: auto-submits sections that ran out of time, sends submitted
  // sections to SpeechJudge and collects their scores.
  try {
    require("./services/speechTestService").startSpeechTestSweeper();
  } catch (error) {
    logger.error("SPEECH-SWEEPER", error, { note: "failed to start" });
  }

  // Admin Monitoring: start writing the API counters and take today's first database snapshot.
  try {
    await require("./services/monitoring").start();
  } catch (error) {
    logger.error("MONITORING", error, { note: "failed to start" });
  }

  // A bank library import that was running when the server stopped can never finish by itself.
  // Close it as "interrupted" so the cohort page offers Retry instead of showing it as running.
  try {
    await require("./services/bankLibrary/importService").recoverInterrupted();
  } catch (error) {
    logger.error("BANK-LIBRARY", error, { note: "failed to close interrupted imports" });
  }
});

// Initialize Web Push
const publicVapidKey = webPushUtil.initWebPush();
logger.debug("SERVER", "web push initialized");

// Connect Database. Retries in the background with a growing pause, so a short database
// outage at boot does not crash the server. Requests wait for the connection (Mongoose
// buffers them) and the start-up work below runs on the first "open".
connectDB({ maxAttempts: Infinity }).catch((err) => {
  logger.error("DB", err, { note: "database connection gave up" });
});

// Initialize Redis (only if module is installed)
if (redisClient) {
  (async () => {
    try {
      await redisClient.connect();
    } catch (error) {
      logger.warn("REDIS", "initialization failed, using in-memory fallback", {
        reason: error.message,
      });
    }
  })();
}

// Middleware

// The app runs behind one reverse proxy (nginx), so without this req.ip is the proxy's address
// and every visitor looks like the same person. Limits that work per IP (the public profile)
// need the real address. TRUST_PROXY is the number of proxies in front of the app; set it to 0
// when the server is reached directly, otherwise a visitor could fake the header.
const trustedProxies = Number.parseInt(process.env.TRUST_PROXY ?? "1", 10);
app.set("trust proxy", Number.isNaN(trustedProxies) ? 1 : trustedProxies);

// Responses over 1 KB are gzip-compressed (JSON shrinks 70 to 90 %). The meter
// goes first so the request log can show the size that is really sent.
app.use(logger.responseMeter());
// Security headers. The API serves JSON and a few images that the app on another origin
// loads, so resources must stay readable cross-origin (CORS still decides who may call).
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(
  cors({
    origin: corsOrigins(),
    credentials: true,
  }),
);
// Bodies are parsed before auth, so the limit stays modest (it was 50 MB).
const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

// Global rate limiter - DISABLED
// Removed to prevent blocking legitimate users who don't have institute email
// Specific rate limiting is applied per endpoint (run code, submit code, public profile)
// No global rate limiting to allow login attempts for users without correct institute email

// Set up session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Counts every request for the admin Monitoring page. In memory only; written to the database
// in one batch a minute (services/monitoring).
app.use(require("./middleware/requestMetrics")());

// One log block per request (method, route, status, time, size, waits, main error).
// Replaces the old middleware that printed every request body.
app.use(logger.requestLogger());

// Scheduled jobs (see cron-jobs.js): the nightly profile sync at 12:00 AM IST.
initializeCronJobs();

// Web Push public key endpoint
app.get("/api/push/vapidPublicKey", (req, res) => {
  try {
    res.json({ publicKey: webPushUtil.getVapidPublicKey() });
  } catch (error) {
    logger.captureError(res, error);
    res.status(500).json({ message: "Error retrieving VAPID public key" });
  }
});

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", require("./routes/dailyCrons")); // nightly profile sync (admin controls)
app.use("/api/admin", require("./routes/adminCatalog")); // courses and opportunities (admin management)
app.use("/api/achievements", require("./routes/achievements"));
app.use("/api/resumes", require("./routes/resumes"));
app.use("/api/courses", coursesRoutes);
app.use("/api/opportunities", opportunitiesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/cohorts", cohortsRoutes);
app.use("/api/user-groups", require("./routes/userGroups")); // named roll number lists attached to cohorts
app.use("/api/mentorships", require("./routes/mentorships")); // admin: mentorships, their teachers and rosters
app.use("/api/my-mentorships", require("./routes/myMentorships")); // teacher: their mentorships and students
app.use("/api/teacher-requests", require("./routes/teacherRequests")); // teacher access requests (admin approves)
app.use("/api/platform-progress", require("./routes/platformProgress")); // dashboard Progress tab (platform history, GitHub timeline)
app.use("/api/admin/access-list", require("./routes/accessList")); // admin: who may sign in (LOGIN_MODE=allowlist)
app.use("/api/admin/suspend-accounts", require("./routes/accountSuspension")); // admin: remove a student's coding profiles and history
app.use("/api/admin/rankings", require("./routes/rankings")); // admin: score and rank calculation
app.use("/api/admin/analytics", require("./routes/adminAnalytics")); // admin: student performance over the platforms
app.use("/api/admin/monitoring", require("./routes/monitoring")); // admin: API traffic and database size
app.use("/api/speech-tests", require("./routes/speechTests"));
app.use("/api/practice-arena", practiceArenaRoutes);
app.use("/api/compiler", compilerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/dashboard", require("./routes/heatmap")); // activity heatmap
app.use("/api/search", require("./routes/search"));
app.use("/api/bank-library", require("./routes/bankLibrary")); // banks of questions in S3, and importing them into cohorts

// NOTE: the CodeChef/LeetCode test routes and /api/profiles/verify were removed.
// Platform fetching now lives in services/platformScraper and is only reachable
// through the authenticated, rate-limited routes in routes/profiles.js.

// Error handling middleware. errorCapture hands the error to the request log
// (printed once, with its request); the handler below only answers the client.
app.use(logger.errorCapture);
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // Body parser errors carry their own status (413 too large, 400 bad JSON).
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({
    message: status === 500 ? "Something broke!" : err.message,
    // The detail is only for development; in production it stays in the server log.
    ...(isProduction || status !== 500 ? {} : { error: err.message }),
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.ready(
    "SERVER",
    `port ${PORT} | ${isDev ? "development" : "production"}`,
  );
});

// Stop cleanly on SIGINT/SIGTERM (pm2 restart, docker stop, Ctrl+C): stop accepting
// connections, close sockets and the database, then exit. A timer forces the exit if
// something hangs, so a restart is never stuck.
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("SERVER", `${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    logger.warn("SERVER", "shutdown timed out, forcing exit");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  // io.close() also closes the HTTP server it is attached to.
  io.close(async () => {
    try {
      // Write the request counters that are still in memory before the database closes
      await require("./services/monitoring").stop();
    } catch (error) {
      logger.error("MONITORING", error, { note: "writing the last counters" });
    }
    try {
      await mongoose.connection.close();
    } catch (error) {
      logger.error("SERVER", error, { note: "closing the database" });
    }
    process.exit(0);
  });
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

