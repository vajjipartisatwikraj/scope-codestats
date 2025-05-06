# Nightly Profile Synchronization at 12:00 AM IST (Midnight)

This document explains how the nightly profile synchronization works, how to configure it, and how to monitor its performance.

## Overview

The system automatically syncs all user profiles across 6 competitive programming platforms every day at 12:00 AM Indian Standard Time (IST), which is 18:30 UTC of the previous day.

The synchronization:
- Updates all user profiles across LeetCode, Codeforces, CodeChef, GeeksforGeeks, HackerRank, and GitHub
- Works efficiently with large user bases (up to 500+ users)
- Implements intelligent rate limiting to avoid IP blocking
- Provides detailed logging and statistics for monitoring
- Features retry mechanisms for handling temporary errors

## Configuration

### Environment Variables

The following environment variables should be configured in your `.env` file:

```
# API base URL (default: http://localhost:5000/api)
API_BASE_URL=http://your-api-base-url.com/api

# API key for cron job access
CRON_API_KEY=your-secure-api-key

# GitHub Access Token (for GitHub API calls)
GITHUB_ACCESS_TOKEN=your-github-access-token

# MongoDB Connection String
MONGODB_URI=mongodb://username:password@hostname:port/database
```

### Cron Schedule

The default schedule is set to run at 12:00 AM IST (18:30 UTC of previous day). You can modify this schedule in `updateUserProfiles.js`:

```javascript
// Schedule cron job for 12:00 AM IST (UTC+5:30)
// This is 18:30 UTC of the previous day
cron.schedule('30 18 * * *', () => {
  console.log('Running scheduled profile update at 12:00 AM IST (midnight)');
  updateAllUserProfiles();
});
```

The cron schedule format is: `minute hour day month day-of-week`

Examples:
- `30 18 * * *` = Every day at 18:30 UTC (12:00 AM IST - midnight)
- `0 0 * * *` = Every day at midnight UTC
- `0 */4 * * *` = Every 4 hours

### Batch Size Configuration

You can adjust the batch size for processing users in `updateUserProfiles.js`:

```javascript
// Process users in batches to avoid memory issues
const BATCH_SIZE = 20; // Number of users processed concurrently
```

Larger batch sizes increase throughput but also increase system load.

## Running Manually

If you need to run the profile sync manually outside the scheduled time:

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Run the manual update script:
   ```
   node scripts/runProfileUpdate.js
   ```

This will execute the same process that runs at 12:00 AM IST, and generate logs in the `logs` directory.

## Monitoring

### Log Files

All logs are stored in the `backend/logs` directory:

- `profile-update-YYYY-MM-DD.log`: Detailed logs for each profile update
- `cron-YYYY-MM-DD.log`: Cron job execution logs

### Statistics

After each run, detailed statistics are logged including:

- Total users processed
- Successful/failed user updates
- Total profiles attempted
- Successful/failed profile updates
- Per-platform success rates
- Average processing time per profile
- Total execution time

Example statistics output:
```
--- FINAL STATISTICS ---
Total users processed: 500
Users updated: 487
Users failed: 13
Total profiles attempted: 2856
Profiles updated: 2734
Profiles failed: 122
Average time per profile: 1250ms
Total execution time: 3600.45 seconds

--- PLATFORM STATISTICS ---
leetcode: 483/500 successful (96.60% success rate)
codeforces: 467/480 successful (97.29% success rate)
codechef: 430/456 successful (94.30% success rate)
geeksforgeeks: 442/453 successful (97.57% success rate)
hackerrank: 470/487 successful (96.51% success rate)
github: 442/480 successful (92.08% success rate)
```

## Troubleshooting

If you encounter issues with the nightly sync:

1. **Check log files** in the `logs` directory for specific error messages

2. **Verify rate limits** - If you see many timeouts for a particular platform, you may be hitting rate limits. Adjust the rate limiting settings in `updateUserProfiles.js`:
   ```javascript
   const rateLimitingTracker = {
     delays: {
       github: 1000,       // Delay in milliseconds between requests
       leetcode: 500,
       // ...
     }
   };
   ```

3. **Check MongoDB connection** - Ensure your MongoDB connection string is correct and your database is accessible.

4. **Verify GitHub API access** - Make sure your GitHub Access Token has the required permissions and hasn't expired.

5. **Server resources** - If the process is running slowly, check if your server has sufficient memory and CPU resources.

## Security Considerations

- The `CRON_API_KEY` should be kept secure and regularly rotated.
- The GitHub Access Token should have minimal required permissions.
- All API calls should be made over HTTPS in production environments.
- Production deployments should use environment variables for all sensitive configuration.

## Future Enhancements

Potential future improvements:
- Distributed processing for very large user bases
- Webhook notifications on job completion
- Email alerts for failed synchronizations
- Dashboard for monitoring sync status
- Priority queue for important users 