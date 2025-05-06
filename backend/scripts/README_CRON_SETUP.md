# User Profile Update Cron Job

This directory contains scripts to automatically update user coding platform profiles on a daily basis.

## Overview

The cron job is designed to run at 2:00 AM IST (Indian Standard Time) every day. It updates all users' coding platform profiles (LeetCode, Codeforces, CodeChef, GeeksforGeeks, HackerRank, and GitHub) and logs comprehensive statistics about the update process.

## Features

- Automatically updates user coding platform profiles daily
- Calculates total scores and updates problem counts for each user
- Processes users in parallel batches for improved efficiency
- Maintains comprehensive logs with detailed statistics
- Handles errors gracefully without stopping the entire process
- Works on both Linux/Unix and Windows servers

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- MongoDB (running and configured in `.env`)
- On Linux/Unix: crontab
- On Windows: Windows Task Scheduler

### Installation

#### Option 1: Using npm scripts (recommended)

1. From the project root, run one of the following commands:

   **For Linux/Unix systems:**
   ```bash
   npm run setup-cron
   ```

   **For Windows systems:**
   ```bash
   npm run setup-cron-win
   ```

2. The script will:
   - Install required dependencies
   - Create necessary directories
   - Set up the cron job or scheduled task
   - Log the setup completion

#### Option 2: Manual Setup

**Linux/Unix:**

1. Make the script executable:
   ```bash
   chmod +x scripts/deploy-cron-job.sh
   ```

2. Run the deployment script:
   ```bash
   ./scripts/deploy-cron-job.sh
   ```

**Windows:**

1. Run the batch file as Administrator:
   ```
   scripts\deploy-cron-job.bat
   ```

### Manual Testing

To test the profile update process without waiting for the scheduled time:

```bash
npm run update-profiles
```

This will run the profile update process immediately and log the results.

## Logs

All logs are stored in the `logs` directory:

- Daily cron job logs: `cron-YYYY-MM-DD.log`
- Profile update logs: `profile-update-YYYY-MM-DD.log`
- Setup confirmation: `setup.log`

## Statistics

After each run, the following statistics are logged:

- Total users processed
- Number of users updated
- Number of users that failed to update
- Total coding profiles attempted
- Number of profiles successfully updated 
- Number of profiles that failed to update
- Average time taken per profile
- Total execution time for the entire process

## Troubleshooting

If you encounter any issues:

1. Check the log files in the `logs` directory
2. Verify that MongoDB is running and accessible
3. Ensure that Node.js and npm are properly installed
4. Confirm that the `.env` file is properly configured
5. Check if your system's clock is correctly set to avoid timing issues

## Customization

To change the scheduled time:

- Edit `deploy-cron-job.sh` or `deploy-cron-job.bat` and modify the cron schedule
- For `updateUserProfiles.js`, modify the cron schedule in the `cron.schedule()` call

To change batch size or other parameters:

- Edit `updateUserProfiles.js` and adjust the `BATCH_SIZE` constant 