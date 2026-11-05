# Deployment Guide: CodeStats

**Technology stack:** AWS EC2, Ubuntu 24.04, Node.js 20, MongoDB, React + Vite, Nginx, PM2, Certbot and GitHub Actions.

## How configuration works

No source file has to be edited to deploy CodeStats. Everything that changes between machines lives in environment variables:

| Part | Where the settings live | When they are read |
|---|---|---|
| Backend (API URL, database, secrets, Google, judges, login mode) | `backend/.env` on the server | When the backend starts. Restart PM2 after a change. |
| Frontend (API address, Google client ID) | `VITE_*` variables in `frontend/.env` | When the frontend is **built**. Rebuild after a change. |
| Web server and SSL | Nginx and Certbot | Set once in this guide. |

Two rules follow from this:

1. **Never edit tracked source files on the server.** The automatic deploy runs `git reset --hard`, which discards local changes to them. `.env` files are not tracked by git, so they survive.
2. **Never put a secret in a `VITE_*` variable.** Vite copies those values into the JavaScript that every visitor downloads.

## Placeholders

Replace these with your own values:

- `<FRONTEND_DOMAIN>`: your domain, for example `example.com`. The site and the API share it (the API is at `/api`).
- `<EC2_PUBLIC_IP>`: the Elastic IP of the instance.
- `<GITHUB_REPOSITORY_URL>`: the URL of your GitHub repository.
- `<RELEASE_BRANCH>`: the branch you deploy from. It must match `RELEASE_BRANCH` in `.github/workflows/deploy.yml`.
- `<GOOGLE_CLIENT_ID>` and `<GOOGLE_CLIENT_SECRET>`: your Google OAuth credentials.
- `<DB_PASSWORD>`: the password you give the MongoDB application user in section 7.

The project lives in `/home/ubuntu/scope-cohorts`. The deploy workflow uses that exact path, so keep the folder name.

---

# Part 1: Prepare the server

## 1. Create an EC2 instance

Go to AWS Console → EC2 → Launch Instance.

- Operating system: Ubuntu Server 24.04 LTS
- Instance type: based on your traffic. Judging and speech tests are handled by separate services, so the API itself is light.
- Authentication: create or select an SSH key pair
- Storage: enough EBS storage for the application files, MongoDB data and backups

### Security group

Allow these inbound ports:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | SSH | Connect to the instance and let GitHub Actions deploy |
| 80 | HTTP | Website traffic and the certificate check |
| 443 | HTTPS | Secure website traffic |

Do not open port 5000 (the backend), 27017 (MongoDB) or 6379 (Redis). Nginx reaches the backend on the same machine, and the databases only listen locally.

**About port 22:** the automatic deploy (section 13) connects over SSH from GitHub's servers, whose addresses change. If you limit port 22 to your own IP, the automatic deploy cannot connect. Choose one:

- Allow port 22 from anywhere, but only with key authentication (the Ubuntu default), or
- Keep it limited to your IP and deploy by hand as described in section 13, option B.

**Why?** Security groups are the firewall of the instance. Opening only what is needed keeps the attack surface small.

## 2. Point the domain at the server

Open your domain's DNS panel and create an A record:

| Type | Name | Value |
|---|---|---|
| A | your domain (or subdomain) | the EC2 Elastic IP |

Use an Elastic IP rather than the temporary public IP, so the domain still points to the server after the instance stops and starts.

Wait until DNS has propagated before generating the SSL certificate (section 16). You can check with `nslookup <FRONTEND_DOMAIN>`.

## 3. Connect with SSH

AWS gives you a `.pem` private key when you create the instance. In the folder that holds it:

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

**Why?** SSH refuses a private key that other users can read, and `chmod 400` makes it read-only for you.

## 4. Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

## 5. Install Node.js

Install NVM (Node Version Manager), load it, and install Node.js 20. The GitHub Actions build also uses Node 20.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc

nvm install 20
nvm alias default 20

node -v
npm -v
```

`node -v` should print a `v20.x` version.

**Why?** NVM keeps Node.js in your home folder, and the deploy workflow loads it from there (`~/.nvm`) before it runs `npm` and `pm2`.

## 6. Clone the repository

```bash
cd /home/ubuntu
git clone -b <RELEASE_BRANCH> <GITHUB_REPOSITORY_URL> scope-cohorts
cd scope-cohorts
ls -la
```

Expected structure:

```text
scope-cohorts/
├── .github/workflows/deploy.yml
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.mjs
├── backend/
│   ├── config/
│   ├── routes/
│   ├── models/
│   ├── server.js
│   └── package.json
└── DEPLOYEMENT.md
```

**Private repository?** The server needs read access to pull updates. On the server create a key with `ssh-keygen -t ed25519 -C "codestats-server"`, add the contents of `~/.ssh/id_ed25519.pub` to the repository under Settings → Deploy keys (read-only), and clone with the SSH URL (`git@github.com:...`).

## 7. Install and configure MongoDB

MongoDB Community Edition runs on the same instance. No separate database service and no public database connection are needed.

### 7.1 Install

```bash
sudo apt-get install -y gnupg curl

curl -fsSL https://pgp.mongodb.com/server-8.0.asc | \
sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

The status should show `Active: active (running)`. `enable` makes MongoDB start again whenever the instance reboots.

### 7.2 Create the administrator

```bash
mongosh
```

```javascript
use admin

db.createUser({
    user: "admin",
    pwd: passwordPrompt(),
    roles: [ { role: "root", db: "admin" } ]
})

exit
```

### 7.3 Turn on authentication and keep MongoDB local

```bash
sudo nano /etc/mongod.conf
```

Make sure these two sections read as follows (add `security:` if it is commented out):

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

**Why?** Authentication stops unauthorised access, and binding to `127.0.0.1` means only programs on this instance can connect.

### 7.4 Create the application database and user

```bash
mongosh -u admin -p --authenticationDatabase admin
```

```javascript
use codestats

db.createUser({
    user: "codestats_user",
    pwd: passwordPrompt(),
    roles: [ { role: "readWrite", db: "codestats" } ]
})

exit
```

The application uses this user, never the administrator. Keep the password: it goes into `MONGODB_URI` in section 9.

## 8. Install Redis (recommended)

Redis keeps rate-limit counters. Without it the backend falls back to memory, which resets whenever the backend restarts.

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
redis-cli ping
```

It should answer `PONG`. Redis listens on `127.0.0.1` by default; leave it that way. If you skip this step, leave `REDIS_URL` out of `.env`.

---

# Part 2: Configure the application

## 9. Backend environment (`backend/.env`)

```bash
cd /home/ubuntu/scope-cohorts/backend
nano .env
```

Production values:

```env
# Server
NODE_ENV=production
PORT=5000
API_BASE_URL=https://<FRONTEND_DOMAIN>/api
FRONTEND_URL=https://<FRONTEND_DOMAIN>

# Database and cache
MONGODB_URI=mongodb://codestats_user:<DB_PASSWORD>@127.0.0.1:27017/codestats?authSource=codestats
REDIS_URL=redis://127.0.0.1:6379

# Authentication
JWT_SECRET=<random value of at least 32 characters>
SESSION_SECRET=<a different random value of at least 32 characters>
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>

# Who can sign in (see section 18)
LOGIN_MODE=domain
ALLOWED_EMAIL_DOMAINS=mlrit.ac.in,mlrinstitutions.ac.in

# Code execution (Judge0)
JUDGE0_HOST=<url>
JUDGE0_AUTH_HEADER=<header name>
JUDGE0_AUTH_TOKEN=<token>

# SQL judge and speech judge (separate services)
SQLJUDGE_BASE_URL=<url>
SQLJUDGE_ADMIN_TOKEN=<token>
SPEECHJUDGE_BASE_URL=<url>
SPEECHJUDGE_API_KEY=<key>

# Integrations
GITHUB_ACCESS_TOKEN=<token>
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=<sender address>
MAIL_PASS=<app password>
MAIL_TO=<where contact messages go>
```

Generate each secret on the server with:

```bash
openssl rand -hex 32
```

Protect the file:

```bash
chmod 600 .env
```

### What each group is for

| Variables | Needed for | If missing |
|---|---|---|
| `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Everything | The backend refuses to start and says which one is missing. |
| `API_BASE_URL` | The Google sign-in callback (`API_BASE_URL/auth/google/callback`) | Google sign-in fails. |
| `LOGIN_MODE`, `ALLOWED_EMAIL_DOMAINS` | Who can sign in | Defaults to `domain` with the MLRIT domains. A typo in `LOGIN_MODE` stops the backend at start-up. |
| `JUDGE0_*` | Running and judging code | Running code reports that the engine is not configured. |
| `SQLJUDGE_*` | SQL questions | SQL questions cannot be graded. |
| `SPEECHJUDGE_*` | Communication tests | Communication tests cannot be scored. |
| `GITHUB_ACCESS_TOKEN` | Fetching GitHub profile data | GitHub stats are rate-limited or fail. |
| `MAIL_*` | The contact form | Contact messages are not delivered. |
| `REDIS_URL` | Rate limiting | Falls back to memory. |

### Optional settings

These have sensible defaults. Add them only when you need to change one:

| Variable | Default | Purpose |
|---|---|---|
| `TRUST_PROXY` | `1` | Number of proxies in front of the app (Nginx is one). Set `0` only if the backend is reached directly. |
| `BODY_LIMIT` | `10mb` | Largest JSON request body. Keep Nginx's `client_max_body_size` at or above it. |
| `LOG_LEVEL` | `info` | `error`, `warn`, `info` or `debug`. |
| `LOG_FORMAT` | `pretty` | `json` for log shippers. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | generated into `backend/config/vapid-keys.json` | Push notification keys. To keep existing subscribers, copy the keys from your current server instead of generating new ones. |
| `SQLJUDGE_GRADE_TIMEOUT_MS`, `SQLJUDGE_READ_TIMEOUT_MS`, `SPEECHJUDGE_SUBMIT_TIMEOUT_MS`, `SPEECHJUDGE_READ_TIMEOUT_MS` | `240000`, `30000`, `120000`, `20000` | How long to wait for the judge services. |
| `BANK_LIBRARY_S3_BUCKET`, `BANK_LIBRARY_S3_REGION` | empty (library off), `ap-south-1` | The S3 bucket that holds the bank library (banks of questions) and its region. Leave the bucket empty to switch the library off. The server needs `s3:ListBucket` on the bucket and `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` on its objects. |
| `BANK_LIBRARY_S3_ACCESS_KEY_ID`, `BANK_LIBRARY_S3_SECRET_ACCESS_KEY` | empty | Only for a computer that is not on AWS. On EC2, leave both empty and attach an IAM role to the instance. |
| `BANK_LIBRARY_S3_PREFIX` | empty | A folder inside the bucket, for example `prod/`, when the bucket is shared. |
| `BANK_LIBRARY_IMPORT_CHUNK`, `BANK_LIBRARY_FETCH_CONCURRENCY`, `BANK_LIBRARY_IMPORT_JOBS`, `BANK_LIBRARY_IMPORT_MAX_QUESTIONS` | `50`, `10`, `2`, `5000` | Questions written to the database at once (1 to 100), questions read from S3 at once, imports that run at the same time, and the most questions one import may bring in. |

### Notes

- If the database password contains special characters, URL-encode it inside `MONGODB_URI`.
- Set `PORT=5000`. If it is missing the backend listens on port 3000 and Nginx answers 502.
- The backend must run with `NODE_ENV=production` behind HTTPS. In production the session cookie is marked secure, so browsers send it only over HTTPS.
- The file is read once at start-up. After any change run `pm2 restart codestats-api`.
- Keep `.env` out of git. It is already ignored; do not force-add it.

## 10. Google OAuth

Open https://console.cloud.google.com/ and go to APIs & Services → Credentials → your OAuth 2.0 Client ID.

**Authorized JavaScript origins:**

```text
https://<FRONTEND_DOMAIN>
```

**Authorized redirect URIs:**

```text
https://<FRONTEND_DOMAIN>/api/auth/google/callback
```

The redirect URI must match `API_BASE_URL` plus `/auth/google/callback` exactly. A mismatch gives `redirect_uri_mismatch`.

### Who Google lets in

Separately from the app's own check, the OAuth consent screen decides which Google accounts can reach the sign-in at all. In Google Cloud Console open **Google Auth Platform → Audience**:

- **Internal** lets in only accounts of your Google Workspace organisation (for example `@mlrit.ac.in`).
- **External** lets in any Google account. Choose **Make external** and move the publishing status from Testing to **In production**.

Use **External** if people outside the college domain will sign in (`LOGIN_MODE=allowlist`). CodeStats only asks for the basic `profile` and `email` scopes, which need no Google review. The app then decides who may sign in.

## 11. Frontend environment (`frontend/.env`)

The frontend reads these variables when it is built:

```env
VITE_API_URL=https://<FRONTEND_DOMAIN>/api
VITE_GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
VITE_ENCODING_ENCRYPT_KEY=<a random string>

# Brand: which pictures and names this site uses (see "Branding" below)
VITE_PLATFORM=codestats
VITE_INSTITUTION=mlrit
VITE_PLATFORM_NAME=CodeStats
VITE_INSTITUTION_NAME=MLRIT

# Optional: your own logo.dev token for company logos
# VITE_LOGO_DEV_TOKEN=<token>
```

- `VITE_API_URL` includes `/api`. The real-time connection (Socket.IO) is derived from it by removing `/api`, so it needs no separate setting.
- `VITE_ENCODING_ENCRYPT_KEY` encrypts code that is copied inside the code editor, so it can be pasted back only into CodeStats. Without it the editor logs an error and cannot copy. Keep it the same between builds, otherwise code copied before a new build can no longer be pasted.
- `VITE_PLATFORM` and `VITE_INSTITUTION` choose the pictures (logo, favicon, icons, footer logo). Each is the name of a folder in `frontend/src/brand/platforms/` or `frontend/src/brand/institutions/`. `VITE_PLATFORM_NAME` and `VITE_INSTITUTION_NAME` set the names used in all the text. If they are missing, the defaults above apply.
- These values end up inside the published JavaScript. They are configuration, not secrets.

### Branding

The logo, favicon, app icons, footer logo and the names in the text come from `frontend/src/brand/`:

```text
frontend/src/brand/
  platforms/codestats/       logo.png  favicon.ico  icon-192.png  icon-512.png  marketing/  brand.json  index.js
  institutions/mlrit/        logo.png  club-logo-dark.png  club-logo-light.png  testimonials.js  brand.json  index.js
  shared/                    pictures that belong to no brand (not-found art)
```

The institution folder also holds the logos of its club (SCOPE Club), the contact email and address, and the landing page testimonials. To run the site for another platform or institution, copy a folder, replace its files, edit its `brand.json`, set the variables above and build again. The build stops with a message that names anything missing. A new brand needs no code change.

Where the file comes from depends on how you deploy (section 13):

- **Automatic deploy:** the whole file is stored as the GitHub secret `FRONTEND_ENV`, and the workflow writes it to `frontend/.env` before building.
- **Manual deploy:** create `frontend/.env` on the server.

The Vite config (`vite.config.mjs`) needs no changes. Its dev-server proxy is used only by `npm start` on your own machine and is ignored by a production build. A small plugin in it (`vite-brand-plugin.mjs`) applies the brand: it fills the page title and description, and writes `favicon.ico`, `icon-192.png`, `icon-512.png` and `manifest.json` into the site root from the chosen platform folder.

---

# Part 3: Run the backend and publish the frontend

## 12. Install dependencies and start the backend

```bash
cd /home/ubuntu/scope-cohorts/backend
npm install
```

(Use `npm ci` instead if you want exactly the versions in `package-lock.json`.)

Check the code for syntax errors before starting it under PM2 (the deploy workflow runs the same check):

```bash
node --check server.js
```

Install PM2 and start the backend:

```bash
npm install -g pm2

pm2 start npm --name codestats-api -- start
pm2 status
pm2 logs codestats-api
```

The log should show the login mode (`login mode: domain`) and no `missing environment variables` or database error. Press `Ctrl+C` to leave the logs.

Useful commands:

```bash
pm2 restart codestats-api   # after changing .env
pm2 stop codestats-api
pm2 logs codestats-api --lines 100
```

**Why?** PM2 keeps the backend running in the background and restarts it if it crashes.

### Start the backend after a reboot

```bash
pm2 startup
```

PM2 prints a command beginning with `sudo env PATH=...`. Copy it and run it exactly as shown. Then:

```bash
pm2 save
```

## 13. Publish the frontend

The frontend is built into static files in `frontend/dist` and served by Nginx from `/var/www/codestats`.

First create that folder once:

```bash
sudo mkdir -p /var/www/codestats
```

### Option A: automatic deploy with GitHub Actions (recommended)

Every push to `<RELEASE_BRANCH>` runs `.github/workflows/deploy.yml`. It:

1. Writes `frontend/.env` from the `FRONTEND_ENV` secret and builds the frontend on GitHub's servers.
2. Uploads the built files to the server.
3. On the server: fetches the branch, runs `git reset --hard`, replaces the contents of `/var/www/codestats`, runs `npm install` in `backend`, checks `server.js` for syntax errors, restarts PM2, tests the Nginx configuration and restarts Nginx.

Set it up once:

1. On your own computer create a dedicated key pair:

   ```bash
   ssh-keygen -t ed25519 -f codestats-deploy -C "github-actions"
   ```

2. On the server, append the public key to the authorised keys:

   ```bash
   echo "<contents of codestats-deploy.pub>" >> ~/.ssh/authorized_keys
   ```

3. In GitHub open Settings → Secrets and variables → Actions and add:

   | Secret | Value |
   |---|---|
   | `FRONTEND_ENV` | The full contents of the frontend `.env` from section 11 |
   | `EC2_HOST` | `<EC2_PUBLIC_IP>` |
   | `EC2_USER` | `ubuntu` |
   | `EC2_SSH_KEY` | The contents of the private key file `codestats-deploy` |

4. Make sure `RELEASE_BRANCH` in `.github/workflows/deploy.yml` and the `on.push.branches` entry name your release branch.

The first run requires everything else in this guide to be in place (the backend already running under PM2, Nginx installed), because the workflow ends with `pm2 restart all` and `nginx -t`.

### Option B: manual deploy

Use this for the very first deployment, or when port 22 is not open to GitHub. If the build runs out of memory on a small instance, build on your own computer and copy `dist` to the server instead.

```bash
cd /home/ubuntu/scope-cohorts
git pull

cd frontend
nano .env               # section 11
npm ci
npm run build

sudo rm -rf /var/www/codestats/*
sudo cp -R dist/. /var/www/codestats/
sudo chown -R www-data:www-data /var/www/codestats
sudo chmod -R 755 /var/www/codestats
```

If the build fails, read the actual error and fix it. Do not delete `package.json` or `node_modules` to get past it.

---

# Part 4: Web server and HTTPS

## 14. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl status nginx
```

**Why?** Nginx serves the React files, forwards API and real-time traffic to the Node.js backend, and terminates HTTPS.

## 15. Configure the site

```bash
sudo nano /etc/nginx/sites-available/codestats
```

Start with the HTTP version. Certbot (section 16) adds HTTPS to it.

```nginx
server {
    listen 80;
    server_name <FRONTEND_DOMAIN>;

    root /var/www/codestats;
    index index.html;

    # Speech recordings are uploaded in the request body (up to 8 MB). Nginx's
    # default of 1 MB would reject them. Keep this at or above BODY_LIMIT.
    client_max_body_size 10m;

    # The React app. Unknown paths return index.html so React Router can handle them.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # The API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Code, SQL and speech judging can take minutes (the SQL judge waits up to
        # 240 seconds). The default of 60 seconds would cut them off.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Real-time notifications and exam timers (Socket.IO over WebSocket)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 120s;
    }
}
```

**Why these parts?**

- `/` serves the frontend and falls back to `index.html`, so refreshing on a page such as `/dashboard` works.
- `/api/` goes to the backend on port 5000. Because the site and the API share one domain, the browser treats them as the same origin and no CORS settings are involved.
- `/socket.io/` needs the `Upgrade` headers. Without this block, notifications and live timers cannot connect.
- The body size and timeouts match what the application actually does.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/codestats /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
```

If the `ln` command says the link already exists, skip it. If `nginx -t` fails, fix the file before restarting.

## 16. Add HTTPS

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d <FRONTEND_DOMAIN>
```

Choose the option that redirects HTTP to HTTPS. Then check that renewal works:

```bash
sudo certbot renew --dry-run
```

Generate the certificate only after DNS points to the instance and the HTTP site above answers. Certbot rewrites the file so that it contains:

- a port 80 block that redirects to HTTPS, and
- a port 443 block (`listen 443 ssl`, with the `ssl_certificate` lines) that keeps the same `root`, `client_max_body_size` and three `location` blocks.

Open the file once and confirm all three locations are still inside the 443 block:

```bash
sudo nano /etc/nginx/sites-available/codestats
```

If you edit it, test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

# Part 5: Go live

## 17. Create the first admin

Admin rights are not given by signing in. After the site loads, sign in once with Google (with `LOGIN_MODE=domain` this needs an address on `ALLOWED_EMAIL_DOMAINS`, such as a college address), then promote that account on the server:

```bash
mongosh -u codestats_user -p --authenticationDatabase codestats codestats
```

```javascript
db.users.updateOne(
  { email: "you@mlrit.ac.in" },
  { $set: { userType: "admin" } }
)

exit
```

Sign out and back in. You now see the admin screens, including **Manage users** and **Teacher requests**.

## 18. Choose who can sign in

`LOGIN_MODE` in `backend/.env` decides this:

| Mode | Who can sign in |
|---|---|
| `domain` (default) | Only addresses on `ALLOWED_EMAIL_DOMAINS` can create an account. Existing accounts are not checked again. |
| `allowlist` | Only addresses on the **Access control list** (any domain), new and existing accounts alike. Admins are always let in. |

To switch a running site to `allowlist` without locking anyone out:

1. Keep `LOGIN_MODE=domain` and complete section 17, so an admin exists.
2. Set the Google audience to External and publish it (section 10).
3. Signed in as an admin, open `https://<FRONTEND_DOMAIN>/admin/access-list` and press **Add existing accounts**. Then add the other addresses (type them, paste them, or upload a CSV with the columns `email, role, note`).
4. Set `LOGIN_MODE=allowlist` in `backend/.env` and run `pm2 restart codestats-api`.
5. Test with a listed address and an unlisted one.

To go back, set `LOGIN_MODE=domain` and restart. Taking an address off the list blocks that person on their next request, even if they are signed in.

## 19. Verify the deployment

Check each service:

```bash
sudo systemctl status mongod
sudo systemctl status nginx
redis-cli ping
pm2 status
pm2 logs codestats-api --lines 50
```

Check that MongoDB and Redis listen only locally:

```bash
sudo ss -lntp | grep -E '27017|6379'
```

Each should show `127.0.0.1`, never `0.0.0.0`. The backend on port 5000 is not bound to one address, so it stays private only because the security group does not open that port (section 1).

Check the API through Nginx and the certificate:

```bash
curl -s https://<FRONTEND_DOMAIN>/api/health
```

It should answer with `"status":"success"`. Then open `https://<FRONTEND_DOMAIN>` and confirm:

- The landing page loads and refreshing a deep link (for example `/login`) does not give a 404.
- Google sign-in completes and returns to the dashboard.
- The browser console has no failed `/api` or `/socket.io` requests, and notifications connect.
- A code run in CodePad or a cohort returns a result (this tests Judge0).
- The backend log has no database or configuration errors.

## 20. Update the application

**Automatic:** push to `<RELEASE_BRANCH>`. The workflow in section 13 builds, uploads and restarts everything. Watch it under the Actions tab in GitHub.

**Environment change only** (a secret, `LOGIN_MODE`, a judge URL):

```bash
nano /home/ubuntu/scope-cohorts/backend/.env
pm2 restart codestats-api
```

**Frontend setting change** (`VITE_*`): update the `FRONTEND_ENV` secret and run the workflow again (Actions → Deploy → Run workflow), or rebuild by hand (section 13, option B).

## 21. Back up MongoDB

Because MongoDB is self-hosted, backups are your responsibility.

Create a file with the connection string so the password never appears in your shell history or process list:

```bash
mkdir -p /home/ubuntu/mongodb-backups
nano /home/ubuntu/.mongodump.conf
```

```yaml
uri: mongodb://codestats_user:<DB_PASSWORD>@127.0.0.1:27017/codestats?authSource=codestats
```

```bash
chmod 600 /home/ubuntu/.mongodump.conf
```

Take a compressed backup:

```bash
mongodump --config=/home/ubuntu/.mongodump.conf \
  --gzip --archive=/home/ubuntu/mongodb-backups/codestats-$(date +%F).gz
```

Schedule it every night and keep 14 days:

```bash
crontab -e
```

```cron
30 2 * * * mongodump --config=/home/ubuntu/.mongodump.conf --gzip --archive=/home/ubuntu/mongodb-backups/codestats-$(date +\%F).gz && find /home/ubuntu/mongodb-backups -name 'codestats-*.gz' -mtime +14 -delete
```

Copy the backups to storage outside the instance (for example an Amazon S3 bucket), so a failed disk does not take the backups with it. To restore:

```bash
mongorestore --config=/home/ubuntu/.mongodump.conf --gzip \
  --archive=/home/ubuntu/mongodb-backups/codestats-<date>.gz --drop
```

## 22. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Backend will not start | `pm2 logs codestats-api`. A `missing environment variables` line names what to add to `backend/.env`. A `LOGIN_MODE must be one of` line means a typo in that value. |
| 502 Bad Gateway | The backend is not running or not on port 5000. Check `pm2 status`, and that `PORT=5000` is set in `.env` (without it the backend uses port 3000). |
| `redirect_uri_mismatch` from Google | The redirect URI in Google Cloud Console differs from `API_BASE_URL` + `/auth/google/callback`. Make them identical. |
| Google says the app is only for the organisation | The consent screen audience is still Internal (section 10). |
| Login says the email is not on the access list | `LOGIN_MODE=allowlist` and the address is not listed. Add it on the Access control list page. |
| Notifications and live timers never connect | The `/socket.io/` block is missing from Nginx (section 15). |
| Recording upload fails with 413 | `client_max_body_size` is missing or too small in Nginx. |
| Code or SQL runs end in 504 | `proxy_read_timeout` is too low, or the judge service is unreachable. Check `JUDGE0_*` / `SQLJUDGE_*`. |
| The site calls the wrong API or `localhost` | `VITE_API_URL` was missing when the frontend was built. Fix `FRONTEND_ENV` and redeploy. |
| Blank page or 404 after refreshing a page | The `try_files ... /index.html` line is missing from the `/` location. |
| Changes made on the server disappear | You edited a tracked file. The deploy resets them. Make the change in the repository, or use an environment variable. |

---

# Final deployment architecture

| Component | Technology | Configuration |
|---|---|---|
| Cloud server | AWS EC2 | Ubuntu 24.04 |
| Frontend | React + Vite | Static files in `/var/www/codestats`, built with `VITE_*` variables |
| Backend | Node.js + Express + Socket.IO | Port 5000, configured by `backend/.env` |
| Database | MongoDB Community | `127.0.0.1:27017`, authentication on |
| Cache | Redis (optional) | `127.0.0.1:6379` |
| Web server | Nginx | Ports 80 and 443 |
| Process manager | PM2 | `codestats-api` |
| SSL | Certbot | Let's Encrypt, automatic renewal |
| Deployment | GitHub Actions | `.github/workflows/deploy.yml` |
| Domain | DNS A record | `<FRONTEND_DOMAIN>` to the Elastic IP |
| Backups | mongodump + cron | Nightly, copied off the instance |

**Request flow:**

```text
                      USER
                       |
                       v
              <FRONTEND_DOMAIN>
                       |
                       v
                  AWS EC2 SERVER
                       |
                       v
                     NGINX
                       |
        +--------------+----------------+
        |              |                |
        v              v                v
   FRONTEND         /api/         /socket.io/
  React + Vite        |                |
 /var/www/codestats   +-------+--------+
                              |
                              v
                        NODE.JS API (PM2)
                          port 5000
                              |
                     +--------+--------+
                     |                 |
                     v                 v
                  MONGODB            REDIS
                127.0.0.1:27017   127.0.0.1:6379
```

**Security checklist:**

1. Never expose ports 27017, 6379 or 5000 publicly.
2. Keep MongoDB authentication on, and use a separate database user for the application.
3. Keep `.env` files out of GitHub, and set `chmod 600` on the server.
4. Use long random values (32 characters or more) for `JWT_SECRET` and `SESSION_SECRET`, different from each other and different between development and production.
5. Rotate any credential that has been exposed. Rotating `JWT_SECRET` or `SESSION_SECRET` signs everyone out.
6. Keep nightly database backups and copy them off the instance.
7. Use an Elastic IP so DNS stays stable.
8. Do not put secrets in `VITE_*` variables: they are public.
