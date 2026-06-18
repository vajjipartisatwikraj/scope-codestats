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
const connectDB = require("./config/db");

// Optional Redis - only load if redis package is installed
let redisClient = null;
try {
  redisClient = require("./config/redis");
} catch (error) {
  console.log(
    "[Server] ⚠️  Redis module not installed, rate limiter will use in-memory fallback",
  );
  console.log("[Server] 💡 To enable Redis: npm install redis");
}

const cors = require("cors");
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
const platformAPI = require("./services/platformAPIs");
const { runCode } = require("./services/simpleCodeExecutionService");
const healthRoutes = require("./routes/healthRoutes");
const passport = require("passport");
const session = require("express-session");
const googleAuthRoutes = require("./routes/auth/googleAuth");
const { initializeCronJobs } = require("./cron-jobs");
const webPushUtil = require("./utils/webPushUtil");
const cohortsRoutes = require("./routes/cohorts");
const practiceArenaRoutes = require("./routes/practiceArena");
const statsRoutes = require("./routes/stats");
const dailyStatsRoutes = require("./routes/dailyStats");
const profileSyncRoutes = require("./routes/profileSync");
const compilerRoutes = require("./routes/compiler");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: ["https://scope.mlrit.ac.in"], //modified
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
      console.log("[Socket.IO] ❌ Connection rejected: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details from database to get email and other info
    const user = await User.findById(decoded.userId).select(
      "email name userType",
    );

    if (!user) {
      console.log("[Socket.IO] ❌ Connection rejected: User not found");
      return next(new Error("Authentication error: User not found"));
    }

    socket.userId = decoded.userId;
    socket.userEmail = user.email;
    socket.userName = user.name;

    console.log(
      `[Socket.IO] ✅ User authenticated: ${socket.userEmail} (${socket.userId})`,
    );
    next();
  } catch (error) {
    console.log("[Socket.IO] ❌ Authentication failed:", error.message);
    return next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;

  console.log(
    `[Socket.IO] 🔌 User connected: ${userEmail} (Socket ID: ${socket.id})`,
  );

  // Join user-specific room for targeted notifications
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  console.log(`[Socket.IO] 👤 User ${userEmail} joined room: ${userRoom}`);

  // Send connection confirmation
  socket.emit("connection:success", {
    message: "Connected to real-time server",
    userId: userId,
    timestamp: new Date().toISOString(),
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(
      `[Socket.IO] 🔌 User disconnected: ${userEmail} - Reason: ${reason}`,
    );
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`[Socket.IO] ❌ Socket error for ${userEmail}:`, error);
  });

  // Practice Arena: Request timer sync (for reconnections)
  socket.on("pa:timer:requestSync", async (data) => {
    try {
      const { testId } = data;
      console.log(
        `[Socket.IO] 🔄 Timer sync requested for test ${testId} by ${userEmail}`,
      );

      const timerState = await app.locals.paTimerService.getTimerState(testId);

      if (timerState) {
        socket.emit("pa:timer:sync", timerState);
        console.log(`[Socket.IO] ✅ Timer sync sent for test ${testId}`);
      } else {
        socket.emit("pa:timer:error", {
          message: "Test not found or not active",
        });
      }
    } catch (error) {
      console.error("[Socket.IO] ❌ Error handling timer sync request:", error);
      socket.emit("pa:timer:error", { message: "Failed to sync timer" });
    }
  });

  // Log all events for debugging (disabled in production for performance)
  if (process.env.NODE_ENV !== "production") {
    socket.onAny((eventName, ...args) => {
      console.log(
        `[Socket.IO] 📨 Event received from ${userEmail}: ${eventName}`,
        args,
      );
    });
  }
});

console.log("[Socket.IO] ✅ WebSocket server initialized and ready");

// Initialize Practice Arena Timer Service
const PracticeArenaTimerService = require("./services/practiceArenaTimerService");
app.locals.paTimerService = new PracticeArenaTimerService(io);

// Initialize timer service after MongoDB connection
mongoose.connection.once("open", async () => {
  try {
    await app.locals.paTimerService.initialize();
  } catch (error) {
    console.error("[PA Timer] ❌ Failed to initialize timer service:", error);
  }
});

// Initialize syncProgress tracking for profile synchronization
app.locals.syncProgress = {};

// Initialize Web Push
const publicVapidKey = webPushUtil.initWebPush();
console.log("Web Push initialized with public VAPID key");

// Connect Database
connectDB();

// Initialize Redis (only if module is installed)
if (redisClient) {
  (async () => {
    try {
      await redisClient.connect();
      console.log("[Server] ✅ Redis initialization complete");
    } catch (error) {
      console.error(
        "[Server] ⚠️  Redis initialization failed, using fallback mode:",
        error.message,
      );
    }
  })();
} else {
  console.log(
    "[Server] ⚠️  Redis not available, rate limiter will use in-memory storage",
  );
}

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// ✅ CRON JOBS ENABLED - AUTO-START ON SERVER START
// Initialize comprehensive daily maintenance cron jobs
initializeCronJobs(); // ✅ ENABLED - Runs at 12:00 AM and 5:00 AM IST daily
console.log("✅ Daily maintenance cron jobs are ENABLED and running");
console.log("⏰ Scheduled runs:");
console.log("   - 12:00 AM IST: Profile synchronization");
console.log("   - 5:00 AM IST: Daily statistics generation");
console.log(
  "🧪 For manual execution: node backend/scripts/daily-maintenance-cron.js",
);

// Debug route
app.get("/api/debug", (req, res) => {
  res.json({
    message: "Server is running correctly",
    timestamp: new Date().toISOString(),
    routes: [
      "/api/auth",
      "/api/profiles",
      "/api/leaderboard",
      "/api/admin",
      "/api/achievements",
      "/api/users",
      "/api/courses",
      "/api/opportunities",
    ],
  });
});

// Web Push public key endpoint
app.get("/api/push/vapidPublicKey", (req, res) => {
  try {
    res.json({ publicKey: webPushUtil.getVapidPublicKey() });
  } catch (error) {
    console.error("Error getting VAPID public key:", error);
    res.status(500).json({ message: "Error retrieving VAPID public key" });
  }
});

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/achievements", require("./routes/achievements"));
app.use("/api/courses", coursesRoutes);
app.use("/api/opportunities", opportunitiesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/cohorts", cohortsRoutes);
app.use("/api/practice-arena", practiceArenaRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/dailyStats", dailyStatsRoutes);
app.use("/api/profile-sync", profileSyncRoutes);
app.use("/api/compiler", compilerRoutes);
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/search", require("./routes/search"));
app.use("/api/user-stats", require("./routes/UserStatisticsGenerator"));

// Test route for CodeChef profile scraping
app.get("/api/test/codechef/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Username is required" });
    }

    console.log(`TEST: Fetching CodeChef profile for ${username}`);
    const profileData = await platformAPI.getCodeChefProfile(username);

    res.json({
      success: true,
      message: "CodeChef profile data retrieved",
      data: profileData,
    });
  } catch (err) {
    console.error("CodeChef test error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching CodeChef profile",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Test route for LeetCode API
app.get("/api/test/leetcode/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Username is required" });
    }

    console.log(`TEST: Fetching LeetCode profile for ${username}`);
    const profileData = await platformAPI.getLeetCodeProfile(username);

    res.json({
      success: true,
      message: "LeetCode profile data retrieved",
      data: profileData,
    });
  } catch (err) {
    console.error("LeetCode test error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching LeetCode profile",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Direct endpoint for profile verification (temporary solution)
app.post("/api/profiles/verify/:platform", async (req, res) => {
  try {
    const { platform } = req.params;
    const { username } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "No authorization token provided" });
    }

    if (!username || username.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (
      !["codechef", "codeforces", "leetcode", "hackerrank", "github"].includes(
        platform,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid platform",
      });
    }

    try {
      // Try to fetch the profile data to verify it exists
      let profileData;

      // Use a timeout promise to avoid hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Verification timed out")), 15000),
      );

      // Get platform data with timeout
      try {
        // For demo/testing purposes, handle "xyz" as a special valid username
        // This allows testing without real accounts
        if (username === "xyz") {
          // Return mock data for testing
          profileData = {
            username: "xyz",
            problemsSolved: 100,
            rating: 1500,
            rank:
              platform === "leetcode"
                ? "Candidate Master"
                : platform === "codeforces"
                  ? "Expert"
                  : platform === "codechef"
                    ? "4 Star"
                    : platform === "hackerrank"
                      ? "Gold"
                      : "Demo User",
            score: 850,
          };
        } else {
          // Handle real verification with the appropriate method
          switch (platform) {
            case "leetcode":
              profileData = await Promise.race([
                platformAPI.getLeetCodeProfile(username),
                timeoutPromise,
              ]);
              break;
            case "codeforces":
              profileData = await Promise.race([
                platformAPI.getCodeforcesProfile(username),
                timeoutPromise,
              ]);
              break;
            case "codechef":
              profileData = await Promise.race([
                platformAPI.getCodeChefProfile(username),
                timeoutPromise,
              ]);
              break;
            case "hackerrank":
              profileData = await Promise.race([
                platformAPI.getHackerRankProfile(username),
                timeoutPromise,
              ]);
              break;
            case "github":
              profileData = await Promise.race([
                platformAPI.getGitHubProfile(username),
                timeoutPromise,
              ]);
              break;
            default:
              throw new Error("Unsupported platform");
          }
        }
      } catch (fetchError) {
        console.error(
          `Error fetching ${platform} profile for ${username}:`,
          fetchError,
        );
        throw new Error(
          `Could not verify ${platform} profile: ${fetchError.message}`,
        );
      }

      if (!profileData) {
        throw new Error(`Could not find ${platform} profile for "${username}"`);
      }

      return res.json({
        success: true,
        message: `${platform} profile verified successfully`,
        profile: {
          platform,
          username,
          verified: true,
          details: profileData,
        },
      });
    } catch (error) {
      console.error(
        `Profile verification error for ${platform}/${username}:`,
        error,
      );
      return res.status(400).json({
        success: false,
        message: error.message || `Could not verify ${platform} profile`,
        error: error.message,
      });
    }
  } catch (err) {
    console.error("Profile verification error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Test route for Google Auth
app.get("/api/test/google-auth", (req, res) => {
  res.json({
    success: true,
    message: "Google OAuth test route is working",
    googleAuthRoute: "/api/auth/google",
    googleCallbackRoute: "/api/auth/google/callback",
    clientID: process.env.GOOGLE_CLIENT_ID
      ? `Configured (starts with ${process.env.GOOGLE_CLIENT_ID.substring(
          0,
          10,
        )}...)`
      : "Not configured",
  });
});

// Test route for Google profile image
app.get("/api/test/google-profile-image", (req, res) => {
  // Check if there's a user in the session
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Return the user's profile picture URL
  return res.json({
    name: req.user.name,
    profilePicture: req.user.profilePicture || "",
    hasProfilePicture: !!req.user.profilePicture,
    googleId: req.user.googleId || null,
  });
});

// Test route for code execution
app.post("/api/test/execute-code", async (req, res) => {
  try {
    const { language, code, input } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required",
        required: ["language", "code"],
      });
    }

    console.log(`TEST: Executing ${language} code`);
    const result = await runCode(language, code, input || "");

    res.json({
      success: result.success,
      message: "Code execution completed",
      result: result.result,
    });
  } catch (err) {
    console.error("Code execution test error:", err);
    res.status(500).json({
      success: false,
      message: "Error executing code",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Note: MongoDB connection is handled by connectDB() call above (line 218)
// The config/db.js module handles connection, error handling, and reconnection logic

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!", error: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready at ws://localhost:${PORT}`);
});
