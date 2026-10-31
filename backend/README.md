# CodeStats Backend

This is the backend server for the CodeStats application, which tracks and displays users' coding profiles across multiple platforms.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/cp-tracker
   JWT_SECRET=your_jwt_secret_here
   ```

3. Start the server:
   ```
   npm start
   ```

For development with hot reload:
```
npm run dev
```

## Who can sign in (`LOGIN_MODE`)

Sign-in is Google only. Two modes decide which Google accounts are let in, chosen in the backend `.env`:

```
# domain (default): only college addresses can create an account. Existing accounts are not checked again.
# allowlist: only addresses on the access list (any domain) can sign in, new and existing accounts alike.
LOGIN_MODE=domain

# The college domains, used by both modes (comma separated, no "@"). Default shown.
ALLOWED_EMAIL_DOMAINS=mlrit.ac.in,mlrinstitutions.ac.in
```

- Leaving `LOGIN_MODE` out means `domain`, exactly how the app worked before. A typo stops the server at start-up.
- In `allowlist` mode admins manage the list in the app under **Access control list** (admins only): type or paste
  addresses, or upload a CSV with the columns `email, role, note` (role is `student` or `teacher`, both optional).
  An address with the role `teacher` becomes a teacher on its first sign-in.
- Taking an address off the list blocks that person on their next request, even with a token that has not expired.
  Admins are never blocked, so keep at least one admin account.
- Before switching a running site to `allowlist`, open the page and press **Add existing accounts**, so nobody who
  already has an account is locked out.
- People whose address is not a college address type their own roll number, department, graduating year and
  college when they set up their profile.
- Changing `.env` needs a restart (`pm2 restart all`). Allowed changes on the list apply within 15 seconds on every
  server process.

## Manually Syncing User Profiles

The application includes scripts to manually trigger synchronization of all user coding profiles across platforms. These scripts connect to the database, fetch all profiles, update them with fresh data from coding platforms, and save the results.

### Unix/Linux/macOS

1. Make the scripts executable:
   ```
   chmod +x ./scripts/sync-profiles.sh
   chmod +x ./scripts/sync-profiles.js
   ```

2. Run the sync script:
   ```
   ./scripts/sync-profiles.sh
   ```

Optional parameters:
- `--batch-size=N`: Number of profiles to process in parallel (default: 10)
- `--timeout=MS`: Timeout in milliseconds for each batch (default: 120000)
- `--platform=NAME`: Only sync specific platform (leetcode, github, codechef, etc.)
- `--bypass-validation`: Bypass mongoose validation constraints (use for users with incomplete profiles)

Example:
```
./scripts/sync-profiles.sh --batch-size=20 --platform=leetcode --bypass-validation
```

### Windows

Run the batch script from the command prompt:
```
scripts\sync-profiles.bat
```

Optional parameters are the same as for the Unix script:
```
scripts\sync-profiles.bat --batch-size=20 --platform=leetcode --bypass-validation
```

### Direct Node.js Execution

You can also run the JavaScript file directly with Node.js:
```
node scripts/sync-profiles.js --batch-size=15 --timeout=180000 --platform=codeforces --bypass-validation
```

### Handling Incomplete User Profiles

If you have users with incomplete profile data (missing required fields like `graduatingYear`, `department`, etc.), use the `--bypass-validation` flag. This will:

1. Skip mongoose model validation checks
2. Use direct MongoDB updates instead of model validation 
3. Allow updates even for users with incomplete profile data

This is especially useful when:
- You have many users with incomplete profiles
- You want to update platform data without requiring all user fields
- You're getting errors about missing required fields

Example to update all users regardless of profile completeness:
```
./scripts/sync-profiles.sh --bypass-validation
```

## API Routes

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `GET /api/auth/user`: Get current user information
- `GET /api/profiles/me`: Get current user's profile
- `POST /api/profiles/:platform`: Update a specific platform profile
- `GET /api/profiles/sync-info`: Get information about automated sync operations
- `GET /api/leaderboard`: Get leaderboard data

## Automated Profile Synchronization

The server automatically syncs all user profiles daily at 5:25 PM IST (11:55 AM UTC) using a cron job. This ensures that profile data stays current even for users who don't regularly log in.

The manual sync scripts update the same automated sync schedule, ensuring that unnecessary automatic syncs don't occur immediately after manual ones. 