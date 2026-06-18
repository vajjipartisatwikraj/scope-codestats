const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
// Import all required models
const User = require("./models/User");
const Profile = require("./models/Profile");
const Notification = require("./models/Notification");
const Achievement = require("./models/Achievement");
const RankHistory = require("./models/RankHistory");
const Submission = require("./models/Submission");
const PASubmission = require("./models/PASubmission");
const UserCohort = require("./models/UserCohort");
const Note = require("./models/Note");
const QuestionReport = require("./models/QuestionReport");
const PATest = require("./models/PATest");
const Question = require("./models/Question");

/**
 * SAFE DELETION SCRIPT FOR GRADUATION YEAR 2025 REGULAR USERS
 * This script will delete all REGULAR users (userType: 'user') with graduatingYear: 2025
 * ADMIN users with graduation year 2025 will be PROTECTED and NOT deleted
 * All related documents will be automatically deleted via cascade deletion
 */

async function deleteGraduationYear2025Users() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully\n");

    // Find all REGULAR users (not admins) with graduation year 2025
    console.log(
      '🔍 Finding regular users (userType: "user") with graduation year 2025...'
    );
    const usersToDelete = await User.find({
      graduatingYear: 2025,
      userType: "user", // Only delete regular users, not admins
    });

    if (usersToDelete.length === 0) {
      console.log("⭕ No regular users found with graduation year 2025");
      return;
    }

    // Check if there are any admin users with graduation year 2025 (just for info)
    const adminUsers2025 = await User.find({
      graduatingYear: 2025,
      userType: "admin",
    });

    if (adminUsers2025.length > 0) {
      console.log(
        `⚠️  Note: Found ${adminUsers2025.length} admin users with graduation year 2025 - these will NOT be deleted:`
      );
      adminUsers2025.forEach((admin, index) => {
        console.log(
          `   � ${index + 1}. ${admin.name} (${
            admin.email
          }) - ADMIN - PROTECTED`
        );
      });
      console.log("");
    }

    console.log(
      `�📊 Found ${usersToDelete.length} regular users with graduation year 2025 to delete:`
    );
    usersToDelete.forEach((user, index) => {
      console.log(
        `   ${index + 1}. ${user.name} (${user.email}) - ${user.department} - ${
          user.userType
        }`
      );
    });
    console.log("");

    // Count total related documents before deletion
    console.log("📊 Counting related documents...");
    let totalRelatedDocs = 0;

    for (const user of usersToDelete) {
      const userId = user._id;

      const [
        profileCount,
        notificationCount,
        achievementCount,
        rankHistoryCount,
        submissionCount,
        paSubmissionCount,
        userCohortCount,
        noteCount,
        questionReportCount,
        paTestCount,
        questionCount,
      ] = await Promise.all([
        Profile.countDocuments({ userId: userId }),
        Notification.countDocuments({ userId: userId }),
        Achievement.countDocuments({ user: userId }),
        RankHistory.countDocuments({ userId: userId }),
        Submission.countDocuments({ user: userId }),
        PASubmission.countDocuments({ user: userId }),
        UserCohort.countDocuments({ user: userId }),
        Note.countDocuments({ user: userId }),
        QuestionReport.countDocuments({ user: userId }),
        PATest.countDocuments({ user: userId }),
        Question.countDocuments({ createdBy: userId }),
      ]);

      const userTotal =
        profileCount +
        notificationCount +
        achievementCount +
        rankHistoryCount +
        submissionCount +
        paSubmissionCount +
        userCohortCount +
        noteCount +
        questionReportCount +
        paTestCount +
        questionCount;

      totalRelatedDocs += userTotal;

      console.log(`   👤 ${user.name}: ${userTotal} related documents`);
    }

    console.log(`\n🔢 Total users to delete: ${usersToDelete.length}`);
    console.log(`🔢 Total related documents to delete: ${totalRelatedDocs}`);
    console.log(
      `🔢 Grand total documents to delete: ${
        usersToDelete.length + totalRelatedDocs
      }\n`
    );

    // Confirmation prompt (commented out for automated execution)
    // console.log('⚠️  WARNING: This action cannot be undone!');
    // console.log('Press Ctrl+C to cancel or wait 10 seconds to continue...');
    // await new Promise(resolve => setTimeout(resolve, 10000));

    // Delete users (cascade deletion will handle related documents)
    console.log("🗑️ Starting deletion process...\n");

    let deletedCount = 0;
    let totalDeletedRelated = 0;

    for (const user of usersToDelete) {
      try {
        console.log(`🗑️ Deleting user: ${user.name} (${user.email})`);

        // Use safeDelete method for detailed logging
        const result = await User.safeDelete(user._id);

        if (result.success) {
          deletedCount++;
          totalDeletedRelated += result.deletedCounts.total;
          console.log(
            `✅ Successfully deleted ${user.name} and ${result.deletedCounts.total} related documents\n`
          );
        }
      } catch (error) {
        console.error(`❌ Error deleting user ${user.name}:`, error.message);
      }
    }

    // Final summary
    console.log("🎉 DELETION COMPLETED!");
    console.log("========================");
    console.log(`✅ Users deleted: ${deletedCount}/${usersToDelete.length}`);
    console.log(`✅ Related documents deleted: ${totalDeletedRelated}`);
    console.log(
      `✅ Total documents deleted: ${deletedCount + totalDeletedRelated}`
    );

    if (deletedCount < usersToDelete.length) {
      console.log(
        `⚠️  Warning: ${
          usersToDelete.length - deletedCount
        } users failed to delete`
      );
    }
  } catch (error) {
    console.error("❌ Error in deletion process:", error);
  } finally {
    console.log("\n🔌 Disconnecting from MongoDB...");
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

// Execute the deletion
console.log("🧹 GRADUATION YEAR 2025 REGULAR USER DELETION SCRIPT");
console.log("==================================================");
console.log("⚠️  ADMIN USERS ARE PROTECTED AND WILL NOT BE DELETED");
console.log("==================================================\n");

deleteGraduationYear2025Users()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
