#!/usr/bin/env bash
# =============================================================================
# CodeStats one-file deployment for Ubuntu 24.04 (AWS EC2)
#
# Follows DEPLOYEMENT.md step by step and prints the status of every step:
#   OS updates, base packages, Node.js, MongoDB (+ users + auth), Redis,
#   clone the repository, backend .env, backend dependencies and a database
#   connection test, frontend .env and build, Nginx, HTTPS (Certbot),
#   PM2, a nightly database backup and a final health report.
#
# HOW TO RUN (as the "ubuntu" user, not root):
#   scp -i your-key.pem deploy/codestats-deploy.sh ubuntu@<SERVER_IP>:~/
#   ssh -i your-key.pem ubuntu@<SERVER_IP>
#   chmod +x codestats-deploy.sh
#   ./codestats-deploy.sh
#
# It asks for two secrets (they are never stored in this file):
#   - the password to give the MongoDB user "codestats_user"
#   - the Google OAuth client secret
# To avoid the questions:  DB_PASSWORD='...' GOOGLE_CLIENT_SECRET='...' ./codestats-deploy.sh
#
# The script can be run again safely. Finished work is detected and skipped,
# existing .env files and the HTTPS setup are kept, and secrets are not
# regenerated.
#
# OPTIONS
#   --pause         ask before every step (Enter = run, s = skip, q = quit)
#   --verbose, -v   show the full command output instead of only the status
#   --from N        start at step N (use after fixing a failed step)
#   --only N        run just step N
#   --list          list the steps and exit
#   --yes, -y       do not ask for confirmation
# COMMANDS
#   status                       run only the final health report
#   create-admin EMAIL [NAME]    create or promote the first admin account
#   help                         show this text
# =============================================================================

set -Eeuo pipefail

# -----------------------------------------------------------------------------
# Settings. Change these, or override any of them from the command line, e.g.
#   DOMAIN=example.com ./codestats-deploy.sh
# -----------------------------------------------------------------------------
SERVER_IP="${SERVER_IP:-18.60.93.102}"
DOMAIN="${DOMAIN:-satwikraj.tech}"
REPO_URL="${REPO_URL:-https://github.com/vajjipartisatwikraj/scope-codestats.git}"
RELEASE_BRANCH="${RELEASE_BRANCH:-version-4.0.0}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-216142909688-8en3rcpij9aak9tccckram3jf6b2r8ti.apps.googleusercontent.com}"

# Brand of the frontend (see frontend/src/brand). The first two are folder names in
# src/brand/platforms and src/brand/institutions and choose the pictures; the names are used in
# all the text of the app.
BRAND_PLATFORM="${BRAND_PLATFORM:-codestats}"
BRAND_INSTITUTION="${BRAND_INSTITUTION:-mlrit}"
BRAND_PLATFORM_NAME="${BRAND_PLATFORM_NAME:-CodeStats}"
BRAND_INSTITUTION_NAME="${BRAND_INSTITUTION_NAME:-MLRIT}"

# Who can sign in (see DEPLOYEMENT.md, section 18): "domain" or "allowlist"
LOGIN_MODE="${LOGIN_MODE:-domain}"
ALLOWED_EMAIL_DOMAINS="${ALLOWED_EMAIL_DOMAINS:-mlrit.ac.in,mlrinstitutions.ac.in}"

# Let's Encrypt sends expiry warnings here. Leave empty to register without an email.
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

# Optional integrations. Empty ones are written as commented lines in backend/.env
# so you can fill them in later (then run: pm2 restart codestats-api).
JUDGE0_HOST="${JUDGE0_HOST:-}"
JUDGE0_AUTH_HEADER="${JUDGE0_AUTH_HEADER:-}"
JUDGE0_AUTH_TOKEN="${JUDGE0_AUTH_TOKEN:-}"
SQLJUDGE_BASE_URL="${SQLJUDGE_BASE_URL:-}"
SQLJUDGE_ADMIN_TOKEN="${SQLJUDGE_ADMIN_TOKEN:-}"
SPEECHJUDGE_BASE_URL="${SPEECHJUDGE_BASE_URL:-}"
SPEECHJUDGE_API_KEY="${SPEECHJUDGE_API_KEY:-}"
GITHUB_ACCESS_TOKEN="${GITHUB_ACCESS_TOKEN:-}"
MAIL_HOST="${MAIL_HOST:-smtp.gmail.com}"
MAIL_PORT="${MAIL_PORT:-465}"
MAIL_USER="${MAIL_USER:-}"
MAIL_PASS="${MAIL_PASS:-}"
MAIL_TO="${MAIL_TO:-}"

# Things you normally leave alone. The deploy workflow expects PROJECT_DIR and WEB_ROOT.
PROJECT_DIR="${PROJECT_DIR:-$HOME/scope-cohorts}"
WEB_ROOT="${WEB_ROOT:-/var/www/codestats}"
PM2_NAME="${PM2_NAME:-codestats-api}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
NODE_MAJOR="${NODE_MAJOR:-20}"
NVM_VERSION="${NVM_VERSION:-v0.39.1}"
MONGO_PORT="${MONGO_PORT:-27017}"       # only change this if MongoDB listens on another port
MONGO_DB="codestats"
MONGO_APP_USER="codestats_user"
SKIP_BACKUP="${SKIP_BACKUP:-0}"       # 1 = do not set up the nightly backup
FORCE_ENV="${FORCE_ENV:-0}"           # 1 = rewrite existing .env files (a backup is kept)
FORCE_NGINX="${FORCE_NGINX:-0}"       # 1 = rewrite an existing Nginx site (removes HTTPS until Certbot runs again)
FORCE_CERTBOT="${FORCE_CERTBOT:-0}"   # 1 = ask for a certificate even if DNS does not point here yet

STATE_FILE="${STATE_FILE:-$HOME/.codestats-deploy.state}"
LOG_FILE="${LOG_FILE:-$HOME/codestats-deploy-$(date +%F-%H%M%S).log}"

# Exit codes a step uses to report something other than success or failure
RC_SKIP=10
RC_WARN=11

# -----------------------------------------------------------------------------
# Output helpers
# -----------------------------------------------------------------------------
exec 3>&1

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; RESET=$'\e[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

VERBOSE=0
PAUSE=0
ASSUME_YES=0
STATUS_ONLY=0

# A line shown to the person running the script. In verbose mode stdout already
# reaches the terminal, so it is printed once; otherwise it goes to the terminal
# and, through stdout, into the log.
say() {
  local line
  line=$(printf '      %s' "$*")
  if (( VERBOSE )); then printf '%s\n' "$line"; else printf '%s\n' "$line" >&3; printf '%s\n' "$line"; fi
}
note() { say "${DIM}$*${RESET}"; }
warn() { say "${YELLOW}! $*${RESET}"; }
fail() { say "${RED}ERROR: $*${RESET}"; exit 1; }
die()  { printf '%sERROR: %s%s\n' "$RED" "$*" "$RESET" >&2; exit 1; }
skip_step() { say "$*"; exit "$RC_SKIP"; }
warn_step() { warn "$*"; exit "$RC_WARN"; }
emit() { local l; while IFS= read -r l; do say "$l"; done; }   # pipe command output through the status view

# -----------------------------------------------------------------------------
# Small utilities
# -----------------------------------------------------------------------------
urlencode() {
  # Percent-encodes every byte except A-Z a-z 0-9 . ~ _ -   (a password such as a@b becomes a%40b)
  local LC_ALL=C s=$1 out="" c i
  for ((i = 0; i < ${#s}; i++)); do
    c=${s:i:1}
    case $c in
      [a-zA-Z0-9.~_-]) out+=$c ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

# KEY=value for a .env file; values with spaces, # or quotes are double-quoted
env_line() {
  local key=$1 val=$2
  if [[ $val =~ [[:space:]\#\"\'\$\`\\] ]]; then
    val=${val//\\/\\\\}
    val=${val//\"/\\\"}
    printf '%s="%s"\n' "$key" "$val"
  else
    printf '%s=%s\n' "$key" "$val"
  fi
}

# Writes the line active when a value is set, a commented placeholder when it is not
env_optional() {
  local key=$1 val=$2
  if [[ -n $val ]]; then env_line "$key" "$val"; else printf '# %s=\n' "$key"; fi
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

load_nvm() {
  export NVM_DIR="$HOME/.nvm"
  if [[ -s $NVM_DIR/nvm.sh ]]; then
    set +eu
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use "$NODE_MAJOR" >/dev/null 2>&1
    set -eu
  fi
}

need_node() {
  load_nvm
  has_cmd node || fail "Node.js is not installed yet. Run step 4 first (./$(basename "$0") --only 4)."
}

# apt without questions, waiting for the lock if the instance is still running its first updates
apt_get() {
  sudo env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a \
    apt-get -y -o DPkg::Lock::Timeout=300 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@"
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@" 2>/dev/null || true; }

# /etc/letsencrypt/live is readable by root only
have_cert() { sudo test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; }

# -----------------------------------------------------------------------------
# Saved secrets (chmod 600). Generated once and reused, so running the script
# again never changes a password that is already in use.
# -----------------------------------------------------------------------------
STATE_VARS=(DB_PASSWORD GOOGLE_CLIENT_SECRET MONGO_ADMIN_PASSWORD JWT_SECRET SESSION_SECRET ENCRYPT_KEY)

load_state() {
  if [[ -f $STATE_FILE ]]; then
    # shellcheck disable=SC1090
    . "$STATE_FILE"
  fi
}

save_state() {
  local v
  (
    umask 077
    for v in "${STATE_VARS[@]}"; do printf '%s=%q\n' "$v" "${!v:-}"; done >"$STATE_FILE"
  )
  chmod 600 "$STATE_FILE"
}

ask_secret() {
  local var=$1 prompt=$2 value
  [[ -t 0 ]] || die "$var is not set and there is no terminal to ask for it. Run:  $var='...' $0"
  read -r -s -p "$prompt: " value
  printf '\n'
  [[ -n $value ]] || die "$var cannot be empty."
  printf -v "$var" '%s' "$value"
}

collect_settings() {
  [[ $LOGIN_MODE == domain || $LOGIN_MODE == allowlist ]] || die "LOGIN_MODE must be domain or allowlist (got \"$LOGIN_MODE\")."
  [[ $DOMAIN =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$ ]] || die "DOMAIN \"$DOMAIN\" does not look like a domain name."

  load_state
  # Values from the command line win over saved ones
  [[ -n ${DB_PASSWORD_ENV:-} ]] && DB_PASSWORD=$DB_PASSWORD_ENV
  [[ -n ${GOOGLE_CLIENT_SECRET_ENV:-} ]] && GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET_ENV

  [[ -n ${DB_PASSWORD:-} ]] || ask_secret DB_PASSWORD "Password for the MongoDB user ${MONGO_APP_USER}"
  [[ -n ${GOOGLE_CLIENT_SECRET:-} ]] || ask_secret GOOGLE_CLIENT_SECRET "Google OAuth client secret"

  : "${MONGO_ADMIN_PASSWORD:=$(openssl rand -hex 24)}"
  : "${JWT_SECRET:=$(openssl rand -hex 32)}"
  : "${SESSION_SECRET:=$(openssl rand -hex 32)}"
  : "${ENCRYPT_KEY:=$(openssl rand -hex 16)}"
  save_state
}

confirm_settings() {
  printf '\n%sCodeStats deployment%s\n' "$BOLD" "$RESET"
  printf '  Server IP        %s\n' "$SERVER_IP"
  printf '  Domain           %s\n' "$DOMAIN"
  printf '  Repository       %s (branch %s)\n' "$REPO_URL" "$RELEASE_BRANCH"
  printf '  Project folder   %s\n' "$PROJECT_DIR"
  printf '  Login mode       %s\n' "$LOGIN_MODE"
  printf '  Log file         %s\n' "$LOG_FILE"
  printf '  Saved secrets    %s (chmod 600)\n' "$STATE_FILE"
  if (( ASSUME_YES )); then return 0; fi
  [[ -t 0 ]] || return 0
  local answer
  read -r -p $'\nContinue? [y/N] ' answer
  [[ $answer == y || $answer == Y ]] || { printf 'Cancelled.\n'; exit 0; }
}

# -----------------------------------------------------------------------------
# MongoDB configuration helpers (take the file as an argument so they can be tested)
# SUDO is "sudo" on the server and empty in tests.
# -----------------------------------------------------------------------------
SUDO="${SUDO-sudo}"

conf_set_bind() {
  local file=$1
  if grep -Eq '^[[:space:]]*bindIp:[[:space:]]*127\.0\.0\.1[[:space:]]*$' "$file"; then
    return 0
  elif grep -Eq '^[[:space:]]*bindIp:' "$file"; then
    $SUDO sed -i -E 's/^([[:space:]]*)bindIp:.*/\1bindIp: 127.0.0.1/' "$file"
  else
    $SUDO sed -i -E 's/^([[:space:]]*)port:[[:space:]]*27017.*/&\n\1bindIp: 127.0.0.1/' "$file"
  fi
}

conf_set_auth() {
  local file=$1
  if grep -Eq '^[[:space:]]*authorization:[[:space:]]*"?enabled"?[[:space:]]*$' "$file"; then
    return 0
  elif grep -Eq '^[[:space:]]*authorization:' "$file"; then
    $SUDO sed -i -E 's/^([[:space:]]*)authorization:.*/\1authorization: enabled/' "$file"
  elif grep -Eq '^security:' "$file"; then
    $SUDO sed -i -E '/^security:/a\  authorization: enabled' "$file"
  elif grep -Eq '^#security:' "$file"; then
    $SUDO sed -i -E 's/^#security:.*/security:\n  authorization: enabled/' "$file"
  else
    printf '\nsecurity:\n  authorization: enabled\n' | $SUDO tee -a "$file" >/dev/null
  fi
}

# mongosh with the quiet flag, always on this machine and on MONGO_PORT
msh() { mongosh --quiet --host 127.0.0.1 --port "$MONGO_PORT" "$@"; }

wait_for_mongo() {
  local i
  for i in $(seq 1 40); do
    if msh --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -qx 1; then return 0; fi
    sleep 1
  done
  # Show why, instead of leaving the person to look for it
  say "The MongoDB service said:"
  { sudo systemctl status mongod --no-pager 2>&1 | sed -n 1,6p; sudo journalctl -u mongod -n 8 --no-pager 2>&1 | cut -c1-400; } | emit
  fail "MongoDB did not answer within 40 seconds (see the lines above). More detail: sudo journalctl -u mongod -n 50 --no-pager"
}

# MongoDB 8.0 refuses to start on Linux kernels 6.19 and newer (SERVER-121912, SERVER-125742):
# its start-up check logs "known incompatibility" and exits. Newer Ubuntu AWS kernels (for example
# 7.0.0-xxxx-aws) are affected. Switching off TCMalloc's per-CPU cache avoids the problem.
MONGO_OVERRIDE_DIR=/etc/systemd/system/mongod.service.d

mongo_hit_kernel_check() {
  sudo journalctl -u mongod -n 60 --no-pager 2>/dev/null | grep -q 'known incompatibility'
}

apply_mongo_kernel_workaround() {
  sudo mkdir -p "$MONGO_OVERRIDE_DIR"
  sudo tee "$MONGO_OVERRIDE_DIR/override.conf" >/dev/null <<'EOF'
[Service]
UnsetEnvironment=GLIBC_TUNABLES
Environment=MONGO_TCMALLOC_PER_CPU_CACHE_SIZE_BYTES=0
EOF
  sudo systemctl daemon-reload
  sudo systemctl restart mongod
}

# True while authentication is off (an unauthenticated listDatabases works)
mongo_auth_disabled() {
  msh --eval 'db.adminCommand({listDatabases:1}).ok' 2>/dev/null | grep -qx 1
}

mongo_uri() { printf 'mongodb://%s:%s@127.0.0.1:%s/%s?authSource=%s' "$MONGO_APP_USER" "$(urlencode "$DB_PASSWORD")" "$MONGO_PORT" "$MONGO_DB" "$MONGO_DB"; }

# True when nothing listens on the TCP port on a public address (loopback only, or not at all)
only_local() {
  ! ss -lnt 2>/dev/null | awk -v p="$1" '$4 ~ (":" p "$") { print $4 }' | grep -Evq '^(127\.0\.0\.1|\[::1\]):'
}

verify_app_user() {
  local who
  who=$(msh --username "$MONGO_APP_USER" --password "$DB_PASSWORD" \
    --authenticationDatabase "$MONGO_DB" "$MONGO_DB" \
    --eval 'db.runCommand({connectionStatus:1}).authInfo.authenticatedUsers.map(u => u.user).join(",")' 2>/dev/null || true)
  [[ $who == "$MONGO_APP_USER" ]] || fail "Could not sign in to MongoDB as ${MONGO_APP_USER}. If that user already existed with another password, reset it: mongosh -u admin -p --authenticationDatabase admin, then db.getSiblingDB('${MONGO_DB}').changeUserPassword('${MONGO_APP_USER}', passwordPrompt())"
  say "Signed in to MongoDB as ${MONGO_APP_USER}"
}

# =============================================================================
# STEPS
# =============================================================================

# 1 -------------------------------------------------------------------------
step_preflight() {
  [[ $EUID -ne 0 ]] || fail "Run this as the normal user (ubuntu), not as root. PM2 and Node.js belong to that user."

  # shellcheck disable=SC1091
  . /etc/os-release
  say "System: ${PRETTY_NAME:-unknown} ($(uname -m))"
  [[ ${ID:-} == ubuntu && ${VERSION_ID:-} == "24.04" ]] || fail "This script is written for Ubuntu 24.04 (the MongoDB repository it adds is for \"noble\")."

  if ! sudo -n true 2>/dev/null; then
    say "Checking sudo access (you may be asked for your password)"
    sudo -v || fail "This user cannot use sudo."
  fi
  say "sudo access: OK"

  curl -fsS --max-time 15 -o /dev/null https://github.com || fail "Cannot reach github.com. Check the instance's internet access."
  say "Internet access: OK"

  local free_gb mem_mb
  free_gb=$(df -BG --output=avail "$HOME" | tail -1 | tr -dc '0-9')
  mem_mb=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
  say "Free disk: ${free_gb} GB, memory: ${mem_mb} MB"
  (( free_gb >= 8 )) || fail "Less than 8 GB of free disk space."
  (( mem_mb >= 900 )) || warn "Very little memory. A swap file is added in step 3 and the frontend build may be slow."

  local resolved
  resolved=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)
  if [[ -z $resolved ]]; then
    warn "$DOMAIN does not resolve yet. HTTPS (step 14) needs a DNS A record pointing to $SERVER_IP."
  elif [[ $resolved != "$SERVER_IP" ]]; then
    warn "$DOMAIN resolves to $resolved, not $SERVER_IP. HTTPS (step 14) will be skipped until DNS matches."
  else
    say "DNS: $DOMAIN -> $resolved (matches the server IP)"
  fi
  note "Reminder: the AWS security group must allow inbound 22, 80 and 443 (and nothing else)."
}

# 2 -------------------------------------------------------------------------
step_os_update() {
  say "apt update"
  apt_get update
  say "apt upgrade (this can take a few minutes)"
  apt_get upgrade
  if [[ -f /var/run/reboot-required ]]; then
    warn "The updates ask for a reboot. Reboot after the deployment finishes: sudo reboot"
  fi
  say "Ubuntu is up to date"
}

# 3 -------------------------------------------------------------------------
step_packages() {
  apt_get install ca-certificates curl gnupg git build-essential openssl unzip lsb-release
  say "Installed: git $(git --version | awk '{print $3}'), curl, gnupg, build tools"

  local mem_kb swap_kb
  mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
  swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
  if (( mem_kb < 2000000 && swap_kb == 0 )); then
    say "Little memory and no swap: adding a 2 GB swap file so the frontend build does not run out"
    if [[ ! -f /swapfile ]]; then
      sudo fallocate -l 2G /swapfile
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
    fi
    sudo swapon /swapfile || true
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
}

# 4 -------------------------------------------------------------------------
step_node() {
  if [[ ! -s $HOME/.nvm/nvm.sh ]]; then
    say "Installing NVM $NVM_VERSION"
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  else
    say "NVM is already installed"
  fi
  load_nvm
  # nvm is written for plain shells: run it without "exit on error" and check the result ourselves
  local rc=0
  set +eu
  nvm install "$NODE_MAJOR" && nvm alias default "$NODE_MAJOR" && nvm use "$NODE_MAJOR"
  rc=$?
  set -eu
  (( rc == 0 )) || fail "nvm could not install Node.js ${NODE_MAJOR}."
  has_cmd node || fail "Node.js is not on the PATH after the install."
  say "Node.js $(node -v), npm $(npm -v)"
}

# 5 -------------------------------------------------------------------------
step_mongo_install() {
  if dpkg -s mongodb-org >/dev/null 2>&1; then
    say "MongoDB is already installed ($(mongod --version | sed -n 1p))"
  else
    say "Adding the MongoDB 8.0 repository"
    curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg --batch --yes -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" |
      sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
    apt_get update
    say "Installing mongodb-org"
    apt_get install mongodb-org
  fi
  sudo systemctl enable --now mongod || true
  sleep 3
  if ! systemctl is-active --quiet mongod && mongo_hit_kernel_check; then
    warn "MongoDB refused to start on this kernel ($(uname -r)): a known MongoDB 8.0 problem with Linux 6.19 and newer."
    say "Applying the documented workaround (TCMalloc per-CPU cache off) and starting it again"
    apply_mongo_kernel_workaround
    sleep 3
    note "To undo it later, once MongoDB ships a fix: delete ${MONGO_OVERRIDE_DIR}/override.conf, then run: sudo systemctl daemon-reload && sudo systemctl restart mongod"
  fi
  wait_for_mongo
  say "MongoDB is running: $(systemctl is-active mongod)"
}

# 6 -------------------------------------------------------------------------
step_mongo_secure() {
  local conf=${MONGOD_CONF:-/etc/mongod.conf}
  [[ -f $conf ]] || fail "$conf not found. Run step 5 first."
  wait_for_mongo

  if mongo_auth_disabled; then
    say "Authentication is off, so the users are created first"
    MONGO_ADMIN_PWD="$MONGO_ADMIN_PASSWORD" msh --eval '
      const admin = db.getSiblingDB("admin");
      if (admin.getUser("admin")) { print("administrator already exists"); }
      else {
        admin.createUser({ user: "admin", pwd: process.env.MONGO_ADMIN_PWD, roles: [ { role: "root", db: "admin" } ] });
        print("administrator created");
      }' | emit
    MONGO_APP_PWD="$DB_PASSWORD" msh --eval '
      const app = db.getSiblingDB("'"$MONGO_DB"'");
      if (app.getUser("'"$MONGO_APP_USER"'")) { print("application user already exists"); }
      else {
        app.createUser({ user: "'"$MONGO_APP_USER"'", pwd: process.env.MONGO_APP_PWD, roles: [ { role: "readWrite", db: "'"$MONGO_DB"'" } ] });
        print("application user created");
      }' | emit

    say "Turning authentication on and keeping MongoDB on 127.0.0.1 only"
    conf_set_bind "$conf"
    conf_set_auth "$conf"
    sudo systemctl restart mongod
    wait_for_mongo
  else
    say "Authentication is already on"
  fi

  verify_app_user
  only_local "$MONGO_PORT" || fail "MongoDB listens on a public address. Set net.bindIp to 127.0.0.1 in $conf and restart mongod."
  say "MongoDB listens on 127.0.0.1:${MONGO_PORT} only"
  note "Administrator password is saved in $STATE_FILE (user: admin)"
}

# 7 -------------------------------------------------------------------------
step_redis() {
  if has_cmd redis-server; then
    say "Redis is already installed"
  else
    apt_get install redis-server
  fi
  sudo systemctl enable --now redis-server
  local i
  for i in $(seq 1 15); do
    if [[ $(redis-cli ping 2>/dev/null || true) == PONG ]]; then break; fi
    sleep 1
  done
  [[ $(redis-cli ping 2>/dev/null || true) == PONG ]] || fail "Redis did not answer PONG."
  say "Redis answers PONG"
  only_local 6379 || warn "Redis listens on a public address. Set \"bind 127.0.0.1\" in /etc/redis/redis.conf."
}

# 8 -------------------------------------------------------------------------
step_clone() {
  export GIT_TERMINAL_PROMPT=0
  if [[ -d $PROJECT_DIR/.git ]]; then
    say "The repository already exists in $PROJECT_DIR, updating it"
    cd "$PROJECT_DIR"
    if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
      fail "There are local changes to tracked files in $PROJECT_DIR. Commit or discard them (the automatic deploy would discard them), then run this step again."
    fi
    git fetch origin "$RELEASE_BRANCH"
    git checkout "$RELEASE_BRANCH"
    git pull --ff-only origin "$RELEASE_BRANCH"
  else
    if [[ -e $PROJECT_DIR && -n $(ls -A "$PROJECT_DIR" 2>/dev/null) ]]; then
      fail "$PROJECT_DIR exists but is not a git checkout. Move it away (mv $PROJECT_DIR ${PROJECT_DIR}.old) and run this step again."
    fi
    say "Cloning $REPO_URL (branch $RELEASE_BRANCH)"
    git clone --branch "$RELEASE_BRANCH" "$REPO_URL" "$PROJECT_DIR" ||
      fail "Could not clone the repository. For a private repository add a read-only deploy key to the server and use the SSH URL (see DEPLOYEMENT.md, section 6)."
    cd "$PROJECT_DIR"
  fi
  [[ -f backend/package.json && -f frontend/package.json ]] || fail "backend/ or frontend/ is missing in $PROJECT_DIR."
  say "On branch $(git rev-parse --abbrev-ref HEAD) at commit $(git rev-parse --short HEAD)"
}

# 9 -------------------------------------------------------------------------
write_backend_env() {
  : >"$1"
  chmod 600 "$1"
  {
    echo "# CodeStats backend environment, written by codestats-deploy.sh on $(date '+%F %T')."
    echo "# After editing run: pm2 restart ${PM2_NAME}"
    echo
    echo "# Server"
    env_line NODE_ENV production
    env_line PORT "$BACKEND_PORT"
    env_line API_BASE_URL "https://${DOMAIN}/api"
    env_line FRONTEND_URL "https://${DOMAIN}"
    echo
    echo "# Database and cache"
    env_line MONGODB_URI "$(mongo_uri)"
    env_line REDIS_URL "redis://127.0.0.1:6379"
    echo
    echo "# Authentication"
    env_line JWT_SECRET "$JWT_SECRET"
    env_line SESSION_SECRET "$SESSION_SECRET"
    env_line GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
    env_line GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET"
    echo
    echo "# Who can sign in: domain or allowlist"
    env_line LOGIN_MODE "$LOGIN_MODE"
    env_line ALLOWED_EMAIL_DOMAINS "$ALLOWED_EMAIL_DOMAINS"
    echo
    echo "# Code execution (Judge0)"
    env_optional JUDGE0_HOST "$JUDGE0_HOST"
    env_optional JUDGE0_AUTH_HEADER "$JUDGE0_AUTH_HEADER"
    env_optional JUDGE0_AUTH_TOKEN "$JUDGE0_AUTH_TOKEN"
    echo
    echo "# SQL judge and speech judge"
    env_optional SQLJUDGE_BASE_URL "$SQLJUDGE_BASE_URL"
    env_optional SQLJUDGE_ADMIN_TOKEN "$SQLJUDGE_ADMIN_TOKEN"
    env_optional SPEECHJUDGE_BASE_URL "$SPEECHJUDGE_BASE_URL"
    env_optional SPEECHJUDGE_API_KEY "$SPEECHJUDGE_API_KEY"
    echo
    echo "# Integrations"
    env_optional GITHUB_ACCESS_TOKEN "$GITHUB_ACCESS_TOKEN"
    env_optional MAIL_HOST "$MAIL_HOST"
    env_optional MAIL_PORT "$MAIL_PORT"
    env_optional MAIL_USER "$MAIL_USER"
    env_optional MAIL_PASS "$MAIL_PASS"
    env_optional MAIL_TO "$MAIL_TO"
  } >"$1"
  chmod 600 "$1"
}

step_backend_env() {
  local file=$PROJECT_DIR/backend/.env
  [[ -d $PROJECT_DIR/backend ]] || fail "$PROJECT_DIR/backend not found. Run step 8 first."
  if [[ -f $file && $FORCE_ENV != 1 ]]; then
    say "$file already exists and is kept (FORCE_ENV=1 rewrites it)"
    local k missing=""
    for k in NODE_ENV PORT API_BASE_URL FRONTEND_URL MONGODB_URI JWT_SECRET SESSION_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
      grep -Eq "^${k}=" "$file" || missing+="$k "
    done
    [[ -z $missing ]] || warn "Missing in the existing file: $missing"
    grep -Eq '^LOGIN_MODE=' "$file" || warn "LOGIN_MODE is not set in the existing file, so the default (domain) applies."
    return 0
  fi
  if [[ -f $file ]]; then
    cp -p "$file" "$file.bak-$(date +%Y%m%d-%H%M%S)"
    say "The previous file was saved as $file.bak-*"
  fi
  write_backend_env "$file"
  say "Wrote $file (permissions 600)"
  local empty=""
  for k in JUDGE0_HOST SQLJUDGE_BASE_URL SPEECHJUDGE_BASE_URL GITHUB_ACCESS_TOKEN MAIL_USER; do
    [[ -n ${!k} ]] || empty+="$k "
  done
  [[ -z $empty ]] || warn "Not set yet (those features stay off until you add them to $file): $empty"
}

# 10 ------------------------------------------------------------------------
step_backend_deps() {
  need_node
  cd "$PROJECT_DIR/backend"
  say "npm install (backend)"
  npm install --no-audit --no-fund
  node --check server.js
  say "server.js has no syntax errors"

  say "Checking the environment file"
  if ! node -e "require('dotenv').config({ path: '.env' }); require('./config/validateEnv')();" 2>&1 | emit; then
    fail "backend/.env is missing a required value (see the lines above)."
  fi

  say "Connecting to MongoDB with the URI from .env"
  if ! node -e "
    require('dotenv').config({ path: '.env' });
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .then(() => { console.log('MongoDB connection OK'); process.exit(0); })
      .catch((e) => { console.error('MongoDB connection FAILED: ' + e.message); process.exit(1); });
  " 2>&1 | emit; then
    fail "The backend could not connect to MongoDB (see the lines above)."
  fi
}

# 11 ------------------------------------------------------------------------
step_frontend() {
  need_node
  local dir=$PROJECT_DIR/frontend file=$PROJECT_DIR/frontend/.env
  [[ -d $dir ]] || fail "$dir not found. Run step 8 first."

  if [[ -f $file && $FORCE_ENV != 1 ]]; then
    say "$file already exists and is kept (FORCE_ENV=1 rewrites it)"
    grep -Eq '^VITE_API_URL=' "$file" || warn "VITE_API_URL is missing in $file"
    grep -Eq '^VITE_PLATFORM=' "$file" || note "$file has no VITE_PLATFORM / VITE_INSTITUTION lines, so the defaults (codestats, mlrit) apply. See frontend/.env.example."
  else
    [[ ! -f $file ]] || cp -p "$file" "$file.bak-$(date +%Y%m%d-%H%M%S)"
    (
      umask 077
      {
        env_line VITE_API_URL "https://${DOMAIN}/api"
        env_line VITE_GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
        env_line VITE_ENCODING_ENCRYPT_KEY "$ENCRYPT_KEY"
        env_line VITE_PLATFORM "$BRAND_PLATFORM"
        env_line VITE_INSTITUTION "$BRAND_INSTITUTION"
        env_line VITE_PLATFORM_NAME "$BRAND_PLATFORM_NAME"
        env_line VITE_INSTITUTION_NAME "$BRAND_INSTITUTION_NAME"
      } >"$file"
    )
    say "Wrote $file"
  fi

  cd "$dir"
  say "npm install (frontend)"
  if [[ -f package-lock.json ]] && npm ci --no-audit --no-fund; then :; else npm install --no-audit --no-fund; fi

  say "Building the frontend (vite build)"
  export NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP_MB:-1536}"
  npm run build
  [[ -f dist/index.html ]] || fail "The build finished but dist/index.html is missing."
  say "Build output: $(du -sh dist | awk '{print $1}') in $dir/dist"
}

# 12 ------------------------------------------------------------------------
step_publish() {
  local dist=$PROJECT_DIR/frontend/dist
  [[ -f $dist/index.html ]] || fail "$dist/index.html not found. Run step 11 first."
  sudo mkdir -p "$WEB_ROOT"
  sudo rm -rf "${WEB_ROOT:?}"/*
  sudo cp -R "$dist"/. "$WEB_ROOT"/
  sudo chown -R www-data:www-data "$WEB_ROOT"
  sudo chmod -R 755 "$WEB_ROOT"
  say "Published $(find "$WEB_ROOT" -type f | wc -l) files to $WEB_ROOT"
}

# 13 ------------------------------------------------------------------------
nginx_site() {
  cat <<'NGINX'
server {
    listen 80;
    server_name __DOMAIN__;

    root __WEB_ROOT__;
    index index.html;

    # Speech recordings are uploaded in the request body (up to 8 MB); Nginx's default of 1 MB
    # would reject them. Keep this at or above the backend BODY_LIMIT.
    client_max_body_size 10m;

    # The React app. Unknown paths return index.html so React Router can handle them.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # The API
    location /api/ {
        proxy_pass http://127.0.0.1:__PORT__;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Code, SQL and speech judging can take minutes; the default of 60 seconds would cut them off.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Real-time notifications and exam timers (Socket.IO over WebSocket)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:__PORT__;
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
NGINX
}

step_nginx() {
  local site=/etc/nginx/sites-available/codestats
  if has_cmd nginx; then say "Nginx is already installed"; else apt_get install nginx; fi

  if [[ -f $site ]] && grep -q 'ssl_certificate' "$site" && [[ $FORCE_NGINX != 1 ]]; then
    say "The site already has HTTPS from Certbot, so its configuration is kept (FORCE_NGINX=1 rewrites it)"
  else
    nginx_site | sed -e "s|__DOMAIN__|${DOMAIN}|g" -e "s|__WEB_ROOT__|${WEB_ROOT}|g" -e "s|__PORT__|${BACKEND_PORT}|g" | sudo tee "$site" >/dev/null
    say "Wrote $site"
  fi
  sudo ln -sf "$site" /etc/nginx/sites-enabled/codestats
  sudo rm -f /etc/nginx/sites-enabled/default

  sudo nginx -t 2>&1 | emit
  sudo systemctl enable nginx
  sudo systemctl restart nginx
  say "Nginx is $(systemctl is-active nginx) and serves $DOMAIN from $WEB_ROOT"
}

# 14 ------------------------------------------------------------------------
step_https() {
  local site=/etc/nginx/sites-available/codestats resolved
  [[ -f $site ]] || fail "The Nginx site is missing. Run step 13 first."

  if have_cert; then
    say "A certificate for $DOMAIN already exists"
  else
    resolved=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)
    if [[ $resolved != "$SERVER_IP" && $FORCE_CERTBOT != 1 ]]; then
      warn_step "HTTPS skipped: $DOMAIN resolves to \"${resolved:-nothing}\", not $SERVER_IP. Point the DNS A record at the server, then run:  ./$(basename "$0") --only 14"
    fi
    has_cmd certbot || apt_get install certbot python3-certbot-nginx
    local email_args=(--register-unsafely-without-email)
    [[ -z $CERTBOT_EMAIL ]] || email_args=(-m "$CERTBOT_EMAIL")
    say "Requesting a Let's Encrypt certificate for $DOMAIN"
    if ! sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${email_args[@]}"; then
      warn_step "Certbot failed. Check that ports 80 and 443 are open in the security group and that DNS points here, then run:  ./$(basename "$0") --only 14"
    fi
  fi

  sudo nginx -t 2>&1 | emit
  local block
  for block in 'location /socket.io/' 'location /api/' 'client_max_body_size'; do
    grep -q "$block" "$site" || warn "\"$block\" is missing from $site after Certbot. Compare it with DEPLOYEMENT.md, section 15."
  done
  sudo systemctl reload nginx
  if sudo certbot renew --dry-run >/dev/null 2>&1; then say "Automatic renewal test passed"; else warn "The renewal test failed. Check: sudo certbot renew --dry-run"; fi
  say "HTTPS is active: https://$DOMAIN"
}

# 15 ------------------------------------------------------------------------
step_pm2() {
  need_node
  has_cmd pm2 || npm install -g pm2
  say "PM2 $(pm2 -v)"
  cd "$PROJECT_DIR/backend"

  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    say "Restarting $PM2_NAME"
    pm2 restart "$PM2_NAME" --update-env
  else
    say "Starting $PM2_NAME"
    pm2 start npm --name "$PM2_NAME" -- start
  fi
  pm2 save

  say "Making PM2 start after a reboot"
  sudo env PATH="$PATH:$(dirname "$(command -v node)")" "$(command -v pm2)" startup systemd -u "$(id -un)" --hp "$HOME" >/dev/null
  pm2 save

  local i
  for i in $(seq 1 40); do
    if [[ $(http_code "http://127.0.0.1:${BACKEND_PORT}/api/health") == 200 ]]; then break; fi
    sleep 1
  done
  pm2 status --no-color | emit
  [[ $(http_code "http://127.0.0.1:${BACKEND_PORT}/api/health") == 200 ]] ||
    fail "The backend did not answer on port ${BACKEND_PORT} within 40 seconds. See: pm2 logs ${PM2_NAME} --lines 50"
  say "The backend answers http://127.0.0.1:${BACKEND_PORT}/api/health"
}

# 16 ------------------------------------------------------------------------
step_backup() {
  [[ $SKIP_BACKUP != 1 ]] || skip_step "Skipped (SKIP_BACKUP=1)"
  local conf=$HOME/.mongodump.conf dir=$HOME/mongodb-backups
  mkdir -p "$dir"
  (
    umask 077
    printf "uri: '%s'\n" "$(mongo_uri)" >"$conf"
  )
  chmod 600 "$conf"

  say "Taking a first backup to prove the setup works"
  mongodump --config="$conf" --gzip --archive="$dir/codestats-first-$(date +%F).gz" 2>&1 | tail -3 | emit

  local line="30 2 * * * mongodump --config=$conf --gzip --archive=$dir/codestats-\$(date +\\%F).gz && find $dir -name 'codestats-*.gz' -mtime +14 -delete # codestats-backup"
  { crontab -l 2>/dev/null | grep -v '# codestats-backup' || true; echo "$line"; } | crontab -
  say "Nightly backup at 02:30, kept 14 days, in $dir"
  note "Copy the backups off this server (for example to S3) so a failed disk does not take them too."
}

# 17 ------------------------------------------------------------------------
REPORT_FAILURES=0
check() { # label, command...
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    say "${GREEN}OK${RESET}    $label"
  else
    say "${RED}FAIL${RESET}  $label"
    REPORT_FAILURES=$((REPORT_FAILURES + 1))
  fi
}

# curl_is REGEX CURL_ARGS...   true when the HTTP status matches (certificates are not checked)
curl_is() {
  local want=$1 got
  shift
  got=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$@" 2>/dev/null || true)
  [[ $got =~ $want ]]
}

pm2_online() { pm2 jlist 2>/dev/null | tr -d '\n' | grep -Eq "\"name\":\"${PM2_NAME}\".*\"status\":\"online\""; }

step_verify() {
  load_nvm
  REPORT_FAILURES=0

  say "Services"
  check "MongoDB is running" systemctl is-active --quiet mongod
  check "Redis is running" systemctl is-active --quiet redis-server
  check "Nginx is running" systemctl is-active --quiet nginx

  say "Processes"
  if has_cmd pm2; then pm2 status --no-color | emit; fi
  check "PM2 shows ${PM2_NAME} online" pm2_online

  say "Network"
  check "Backend answers on port ${BACKEND_PORT}" curl_is '^200$' "http://127.0.0.1:${BACKEND_PORT}/api/health"
  check "Nginx serves the frontend" curl_is '^(200|301)$' -H "Host: ${DOMAIN}" http://127.0.0.1/
  if have_cert; then
    check "Nginx forwards /api over HTTPS" curl_is '^200$' -H "Host: ${DOMAIN}" https://127.0.0.1/api/health
  else
    check "Nginx forwards /api" curl_is '^200$' -H "Host: ${DOMAIN}" http://127.0.0.1/api/health
  fi
  check "MongoDB listens on 127.0.0.1 only" only_local "$MONGO_PORT"
  check "Redis listens locally only" only_local 6379
  note "In the AWS security group only ports 22, 80 and 443 should be open (this script cannot see that)."

  say "HTTPS"
  if have_cert; then
    check "https://${DOMAIN}/api/health answers 200" curl_is '^200$' "https://${DOMAIN}/api/health"
    check "Real-time endpoint https://${DOMAIN}/socket.io answers" curl_is '^200$' "https://${DOMAIN}/socket.io/?EIO=4&transport=polling"
    local end
    end=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2 || true)
    say "Certificate valid until: ${end:-unknown}"
  else
    warn "No certificate yet, the site is only on http://${DOMAIN}"
    REPORT_FAILURES=$((REPORT_FAILURES + 1))
  fi

  say "Login mode: $(grep -E '^LOGIN_MODE=' "$PROJECT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo unknown)"
  (( REPORT_FAILURES == 0 )) || warn_step "${REPORT_FAILURES} check(s) need attention (see above)."
  say "Everything is healthy"
}
# =============================================================================
# Step table and runner
# =============================================================================
STEPS=(
  "Check the server and settings|step_preflight"
  "Update Ubuntu (OS updates)|step_os_update"
  "Install base packages|step_packages"
  "Install Node.js ${NODE_MAJOR} with NVM|step_node"
  "Install MongoDB 8.0|step_mongo_install"
  "Secure MongoDB and create the database users|step_mongo_secure"
  "Install Redis|step_redis"
  "Clone the GitHub repository|step_clone"
  "Write the backend .env|step_backend_env"
  "Install backend dependencies and test the database connection|step_backend_deps"
  "Write the frontend .env and build the frontend|step_frontend"
  "Publish the frontend to the web root|step_publish"
  "Install and configure Nginx|step_nginx"
  "Add HTTPS with Certbot|step_https"
  "Install PM2 and start the backend|step_pm2"
  "Set up the nightly database backup|step_backup"
  "Verify the deployment|step_verify"
)
TOTAL=${#STEPS[@]}
declare -a RESULT=()

run_step() {
  # Separate statements: all words of one "local" are expanded before any of them is assigned
  local n=$1
  local entry=${STEPS[$((n - 1))]}
  local title=${entry%%|*} fn=${entry##*|}
  local started rc=0 pid answer elapsed

  printf '\n%s[%d/%d] %s%s\n' "$BOLD" "$n" "$TOTAL" "$title" "$RESET"
  if (( PAUSE )) && [[ -t 0 ]]; then
    read -r -p "      Enter = run, s = skip, q = quit: " answer || answer=q
    case $answer in
      s | S) RESULT[n]="SKIPPED"; printf '      %s[SKIP]%s skipped by you\n' "$YELLOW" "$RESET"; return 0 ;;
      q | Q) printf 'Stopped before step %d. Continue later with --from %d\n' "$n" "$n"; exit 0 ;;
    esac
  fi

  printf '\n===== [%d/%d] %s (%s) =====\n' "$n" "$TOTAL" "$title" "$(date '+%F %T')" >>"$LOG_FILE"
  started=$SECONDS
  if (( VERBOSE )); then
    ( trap 'echo "ERROR on line $LINENO: $BASH_COMMAND" >&2' ERR; set -Eeuo pipefail; "$fn" ) > >(tee -a "$LOG_FILE") 2>&1 &
  else
    ( trap 'echo "ERROR on line $LINENO: $BASH_COMMAND" >&2' ERR; set -Eeuo pipefail; "$fn" ) >>"$LOG_FILE" 2>&1 &
  fi
  pid=$!
  wait "$pid" && rc=0 || rc=$?
  if (( VERBOSE )); then sleep 0.3; fi
  elapsed=$((SECONDS - started))

  case $rc in
    0) RESULT[n]="OK"; printf '      %s[ OK ]%s %s (%ss)\n' "$GREEN" "$RESET" "$title" "$elapsed" ;;
    "$RC_SKIP") RESULT[n]="SKIPPED"; printf '      %s[SKIP]%s %s (%ss)\n' "$YELLOW" "$RESET" "$title" "$elapsed" ;;
    "$RC_WARN") RESULT[n]="WARNING"; printf '      %s[WARN]%s %s (%ss)\n' "$YELLOW" "$RESET" "$title" "$elapsed" ;;
    *)
      RESULT[n]="FAILED"
      printf '      %s[FAIL]%s %s (%ss)\n' "$RED" "$RESET" "$title" "$elapsed"
      if (( ! VERBOSE )); then
        printf '\n      Last lines of the log:\n'
        tail -n 25 "$LOG_FILE" | sed 's/^/        /'
      fi
      printf '\n      Full log: %s\n' "$LOG_FILE"
      printf '      Fix the problem, then continue with:  ./%s --from %d\n' "$(basename "$0")" "$n"
      print_summary
      exit 1
      ;;
  esac
}

print_summary() {
  local i mark
  printf '\n%sSummary%s\n' "$BOLD" "$RESET"
  for ((i = 1; i <= TOTAL; i++)); do
    case ${RESULT[i]:-} in
      OK) mark="${GREEN}[ OK ]${RESET}" ;;
      SKIPPED) mark="${YELLOW}[SKIP]${RESET}" ;;
      WARNING) mark="${YELLOW}[WARN]${RESET}" ;;
      FAILED) mark="${RED}[FAIL]${RESET}" ;;
      *) mark="${DIM}[ -- ]${RESET}" ;;
    esac
    printf '  %s %2d. %s\n' "$mark" "$i" "${STEPS[$((i - 1))]%%|*}"
  done
}

print_next_steps() {
  printf '\n%sNext steps%s\n' "$BOLD" "$RESET"
  cat <<EOF
  1. AWS security group: inbound 22, 80 and 443 only. Ports 5000, 27017 and 6379 must stay closed.
  2. Google Cloud Console -> APIs & Services -> Credentials -> your OAuth client:
       Authorized JavaScript origins:  https://${DOMAIN}
       Authorized redirect URIs:       https://${DOMAIN}/api/auth/google/callback
     Google Auth Platform -> Audience: use "External" and publish it if people outside the
     college organisation will sign in.
  3. Create the first admin, then sign in with Google at https://${DOMAIN}/login :
       ./$(basename "$0") create-admin you@example.com "Your Name"
  4. Optional features (code runs, SQL and speech tests, GitHub stats, contact form): add the
     missing values to ${PROJECT_DIR}/backend/.env, then:  pm2 restart ${PM2_NAME}
  5. Automatic deploys from GitHub: add these repository secrets (Settings -> Secrets and variables -> Actions):
       FRONTEND_ENV  the contents of ${PROJECT_DIR}/frontend/.env
       EC2_HOST      ${SERVER_IP}
       EC2_USER      $(id -un)
       EC2_SSH_KEY   a private key whose public key is in ~/.ssh/authorized_keys
     The workflow deploys from the branch "${RELEASE_BRANCH}".
  6. Secrets this script created are in ${STATE_FILE} and the .env files (all chmod 600).
     Copy the database backups off the server. Log of this run: ${LOG_FILE}
EOF
  if [[ -f /var/run/reboot-required ]]; then printf '  7. The OS updates ask for a reboot:  sudo reboot  (PM2, Nginx and MongoDB start again by themselves)\n'; fi
}

# =============================================================================
# create-admin
# =============================================================================
create_admin() {
  local email=${1:-} name=${2:-}
  [[ -n $email ]] || die "Usage: $0 create-admin EMAIL [NAME]"
  [[ $email =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die "\"$email\" is not a valid email address."
  local given=${DB_PASSWORD:-}
  load_state
  [[ -z $given ]] || DB_PASSWORD=$given
  [[ -n ${DB_PASSWORD:-} ]] || ask_secret DB_PASSWORD "Password of the MongoDB user ${MONGO_APP_USER}"
  has_cmd mongosh || die "mongosh is not installed. Run the deployment first."

  ADMIN_EMAIL=$email ADMIN_NAME=${name:-${email%%@*}} msh \
    --username "$MONGO_APP_USER" --password "$DB_PASSWORD" --authenticationDatabase "$MONGO_DB" "$MONGO_DB" --eval '
      const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
      const now = new Date();
      const existing = db.users.findOne({ email });
      if (existing) {
        db.users.updateOne({ email }, { $set: { userType: "admin", updatedAt: now } });
        print("Existing account " + email + " is now an admin.");
      } else {
        const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "admin";
        let handle = base, n = 2;
        while (db.users.findOne({ username: handle })) { handle = base + "-" + n; n += 1; }
        db.users.insertOne({
          name: process.env.ADMIN_NAME, email, username: handle, userType: "admin",
          rollNumber: "ADMIN-" + new ObjectId().toString(), department: "CSE",
          newUser: false, profileCompleted: true, signupIntent: "student",
          createdAt: now, updatedAt: now
        });
        print("Admin account created for " + email + ".");
      }
      print("Sign in with Google using exactly this address; the account is linked on first sign-in.");'
}

# =============================================================================
# main
# =============================================================================
usage() { awk 'NR > 1 && /^# =+$/ { next } NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"; }

main() {
  local from=1 only=""

  case "${1:-}" in
    help | -h | --help) usage; return 0 ;;
    create-admin) shift; create_admin "$@"; return 0 ;;
    status) shift; only=$TOTAL; STATUS_ONLY=1 ;;
  esac

  while (( $# )); do
    case $1 in
      --pause) PAUSE=1 ;;
      --verbose | -v) VERBOSE=1 ;;
      --yes | -y) ASSUME_YES=1 ;;
      --from) shift; from=${1:-}; [[ $from =~ ^[0-9]+$ ]] || die "--from needs a step number" ;;
      --only) shift; only=${1:-}; [[ $only =~ ^[0-9]+$ ]] || die "--only needs a step number" ;;
      --list)
        local i
        for ((i = 1; i <= TOTAL; i++)); do printf '%2d. %s\n' "$i" "${STEPS[$((i - 1))]%%|*}"; done
        return 0
        ;;
      *) die "Unknown option: $1 (try: $0 help)" ;;
    esac
    shift
  done

  (( from >= 1 && from <= TOTAL )) || die "Step numbers go from 1 to $TOTAL."
  if [[ -n $only ]]; then (( only >= 1 && only <= TOTAL )) || die "Step numbers go from 1 to $TOTAL."; fi

  # Secrets given on the command line win over the saved ones
  DB_PASSWORD_ENV=${DB_PASSWORD:-}
  GOOGLE_CLIENT_SECRET_ENV=${GOOGLE_CLIENT_SECRET:-}
  DB_PASSWORD=""
  GOOGLE_CLIENT_SECRET=""

  : >"$LOG_FILE"
  chmod 600 "$LOG_FILE"
  if (( STATUS_ONLY )); then
    load_state
  else
    collect_settings
    confirm_settings
  fi

  local n
  if [[ -n $only ]]; then
    run_step "$only"
  else
    for ((n = from; n <= TOTAL; n++)); do run_step "$n"; done
  fi

  print_summary
  if (( ! STATUS_ONLY )) && [[ -z $only || $only -eq $TOTAL ]]; then print_next_steps; fi
  printf '\n'
}

# Run only when executed, so the functions can be loaded by tests with "source"
if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
