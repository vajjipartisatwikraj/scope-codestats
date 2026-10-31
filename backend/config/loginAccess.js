/**
 * Who may sign in: the settings, read from backend/.env.
 *
 *   LOGIN_MODE             "domain" (default) or "allowlist"
 *   ALLOWED_EMAIL_DOMAINS  comma separated, the college domains
 *                          (default: mlrit.ac.in,mlrinstitutions.ac.in)
 *
 *   domain     Only addresses on the college domains can create an account. Accounts that
 *              already exist are not checked again. This is the behaviour before the
 *              access list existed, and it is what you get when LOGIN_MODE is not set.
 *   allowlist  Only addresses on the access list (any domain) can sign in, new and existing
 *              accounts alike. Admins are always let in so nobody can lock themselves out.
 *              The list is managed by admins, see services/accessListService.js.
 *
 * This file only reads settings and has no database access, so models can use it.
 * The functions read process.env on every call, so they work no matter when dotenv ran.
 */

const MODES = ["domain", "allowlist"];
const DEFAULT_DOMAINS = ["mlrit.ac.in", "mlrinstitutions.ac.in"];

/** Same shape check everywhere an email is accepted (the user model, the access list). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/** The value in .env, lower case. Empty when it is not set. */
const rawMode = (env = process.env) => String(env.LOGIN_MODE || "").trim().toLowerCase();

/** "domain" or "allowlist". A missing value means "domain"; validateEnv rejects typos at start-up. */
function loginMode(env = process.env) {
  return rawMode(env) === "allowlist" ? "allowlist" : "domain";
}

/** True when LOGIN_MODE is empty or one of the known modes. */
const isValidMode = (env = process.env) => rawMode(env) === "" || MODES.includes(rawMode(env));

/** The college domains, lower case and without "@". */
function institutionDomains(env = process.env) {
  const listed = String(env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return listed.length > 0 ? listed : DEFAULT_DOMAINS;
}

/** Lower case, no spaces: how an email is compared and stored. */
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/** The part after the last "@", or "". */
const domainOf = (email) => {
  const text = normalizeEmail(email);
  const at = text.lastIndexOf("@");
  return at > 0 ? text.slice(at + 1) : "";
};

/** True for an address on one of the college domains (exact match: no sub-domains). */
const isInstitutionEmail = (email) => institutionDomains().includes(domainOf(email));

const isValidEmail = (email) => {
  const text = normalizeEmail(email);
  return text.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(text);
};

/** What the sign-in pages need to know, safe to show anyone. */
function publicConfig() {
  const mode = loginMode();
  const domains = institutionDomains();
  return {
    loginMode: mode,
    // Only the domain mode tells people which addresses work
    domains: mode === "domain" ? domains : [],
    domainHint: domains.map((domain) => `@${domain}`).join(" or "),
  };
}

module.exports = {
  MODES,
  DEFAULT_DOMAINS,
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  loginMode,
  isValidMode,
  institutionDomains,
  normalizeEmail,
  domainOf,
  isInstitutionEmail,
  isValidEmail,
  publicConfig,
};
