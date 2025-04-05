# CodeStats Profile Synchronization System

This documentation explains the profile synchronization system, how it works, and how to verify that it's functioning correctly.

## Overview

The CodeStats platform has two separate profile synchronization systems:

1. **Main Profile Sync (12:00 AM IST / 18:30 UTC)** - This is the primary full sync that updates all users' profiles across all platforms. It's implemented in `scripts/updateUserProfiles.js` and registered via `ensure-cron-jobs.js`.

2. **Server-side Sync (5:25 PM IST / 11:55 AM UTC)** - This is a secondary sync implemented directly in `server.js` that provides additional redundancy.

## How to Test the Profile Sync

### Method 1: Run the Test Script

To manually trigger and test the profile sync:

```bash
cd codestats/backend
node run-profiles-sync-test.js
```

This script will:
- Immediately trigger the profile synchronization process
- Show real-time progress information
- Display summary statistics when complete

### Method 2: Trigger via Admin Dashboard

The admin dashboard has a "Sync All Profiles" button that calls the same function and shows real-time progress.

### Method 3: Wait for Scheduled Run

The profile sync will automatically run at:
- 12:00 AM IST (18:30 UTC) - Main full profile sync
- 5:25 PM IST (11:55 AM UTC) - Server-side sync

## Verifying the Scheduled Tasks Work

### Check the Log Files

After the scheduled time has passed, check the log files:

```bash
cd codestats/backend/logs
cat cron-YYYY-MM-DD.log        # For cron job logs
cat profile-update-YYYY-MM-DD.log  # For profile update logs
```

Look for entries like "Running scheduled profile update at 12:00 AM IST" to confirm the job ran.

### Check MongoDB for Updated Profiles

You can query MongoDB to see when profiles were last updated:

```javascript
// Using MongoDB shell
db.profiles.find({}, {platform: 1, username: 1, lastUpdated: 1}).sort({lastUpdated: -1}).limit(10)
```

### Server Logs

The server console should also show log messages when the cron jobs are registered and executed.

## Troubleshooting

If the cron job doesn't run at the expected time:

1. **Check Server Timezone**
   
   The cron schedule uses UTC timezone. Make sure your server's time is correctly set:
   
   ```bash
   date       # Show current server time
   ```

2. **Check Server Uptime**
   
   The server must be running at the scheduled time for the cron jobs to execute:
   
   ```bash
   uptime     # Check how long the server has been running
   ```

3. **Manually Trigger Sync**
   
   If automatic sync isn't working, try running the sync manually:
   
   ```bash
   node run-profiles-sync-test.js
   ```

4. **Check for Errors**
   
   Look for error messages in:
   
   ```bash
   cat logs/cron-YYYY-MM-DD.log
   cat logs/profile-update-YYYY-MM-DD.log
   ```

## How the Profile Sync Works

### 1. Main Profile Sync (12:00 AM IST)

This sync:
- Updates ALL users' profiles across ALL platforms
- Processes users in batches to avoid memory issues
- Uses advanced rate limiting to prevent API blocks
- Stores detailed data about each platform
- Calculates total score across all platforms
- Handles errors gracefully with detailed logging

### 2. Server-side Sync (5:25 PM IST)

This sync:
- Works directly with Profile documents (not through User objects)
- Provides additional redundancy
- Is implemented directly in the server.js file
- Serves as a backup in case the main sync fails

## Differences Between the Two Syncs

| Feature | Main Sync (12:00 AM) | Server-side Sync (5:25 PM) |
|---------|--------------------|-----------------------|
| Implementation | scripts/updateUserProfiles.js | Directly in server.js |
| User approach | Processes all User objects | Processes Profile documents |
| Batching | 5 users per batch | 10 profiles per batch |
| Rate limiting | Sophisticated with backoff | Simple fixed delays |
| Error handling | Extensive with retries | Basic with logging |
| Logging | Dedicated log files | Server console |

## Notes for Developers

- Both syncs can run on the same day without conflicts
- Do not disable either sync without discussing with the team
- The admin dashboard shows the status of the last profile sync
- Rate limiting is crucial to avoid API blocks from coding platforms 