#!/bin/bash

# Deploy script for the profile update cron job
# This script sets up the cron job to run at 2:00 AM IST every day

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$DIR/.." && pwd )"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    exit 1
fi

# Install required dependencies
echo "Installing required dependencies..."
cd "$PROJECT_ROOT"
npm install node-cron

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"
echo "Created logs directory at $PROJECT_ROOT/logs"

# Check if crontab is installed
if ! command -v crontab &> /dev/null; then
    echo "Error: crontab is not installed."
    exit 1
fi

# Create a temporary crontab file
TEMP_CRON=$(mktemp)

# Export existing crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# New crontab file" > "$TEMP_CRON"

# Check if cron job already exists
if grep -q "updateUserProfiles.js" "$TEMP_CRON"; then
    echo "Cron job already exists. Updating..."
    sed -i '/updateUserProfiles.js/d' "$TEMP_CRON"
fi

# Add our cron job - runs at 2:00 AM IST (20:30 UTC)
echo "30 20 * * * cd $PROJECT_ROOT && /usr/bin/node $PROJECT_ROOT/scripts/updateUserProfiles.js >> $PROJECT_ROOT/logs/cron-$(date +\%Y-\%m-\%d).log 2>&1" >> "$TEMP_CRON"

# Install the updated crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# Create a test log entry to confirm setup
echo "$(date) - Cron job setup complete" >> "$PROJECT_ROOT/logs/setup.log"

echo "Cron job successfully installed to run at 2:00 AM IST (20:30 UTC) every day."
echo "Logs will be available in $PROJECT_ROOT/logs/"
echo "You can test the job by running: node $PROJECT_ROOT/scripts/runProfileUpdate.js" 