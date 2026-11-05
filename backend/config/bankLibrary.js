/**
 * Settings of the bank library (banks of questions kept in an S3 bucket, see
 * services/bankLibrary/). Everything comes from backend/.env:
 *
 *   BANK_LIBRARY_S3_BUCKET             the bucket name. Empty = the library is switched off.
 *   BANK_LIBRARY_S3_REGION             the bucket's region, for example ap-south-1
 *   BANK_LIBRARY_S3_ACCESS_KEY_ID      access key of an IAM user that may use the bucket
 *   BANK_LIBRARY_S3_SECRET_ACCESS_KEY  its secret. Leave both empty on EC2 to use the instance's IAM
 *                                      role (recommended: no key to store or rotate).
 *   BANK_LIBRARY_S3_PREFIX             optional folder inside the bucket, for example "prod/"
 *   BANK_LIBRARY_S3_ENDPOINT           optional, only for an S3-compatible server (MinIO, LocalStack)
 *
 *   BANK_LIBRARY_IMPORT_CHUNK          questions written to the database at once (1 to 100, default 50)
 *   BANK_LIBRARY_FETCH_CONCURRENCY     questions read from S3 at once (default 10)
 *   BANK_LIBRARY_IMPORT_JOBS           imports that run at the same time (default 2, the rest wait)
 *   BANK_LIBRARY_IMPORT_MAX_QUESTIONS  most questions one import may bring in (default 5000)
 *
 * The settings are read when they are asked for, so a test can change process.env.
 */

const int = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const text = (name) => String(process.env[name] || "").trim();

/** "prod" and "/prod/" both become "prod/"; empty stays empty */
function normalizePrefix(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return cleaned ? `${cleaned}/` : "";
}

function getConfig() {
  const accessKeyId = text("BANK_LIBRARY_S3_ACCESS_KEY_ID");
  const secretAccessKey = text("BANK_LIBRARY_S3_SECRET_ACCESS_KEY");
  return {
    bucket: text("BANK_LIBRARY_S3_BUCKET"),
    region: text("BANK_LIBRARY_S3_REGION") || text("AWS_REGION") || "ap-south-1",
    prefix: normalizePrefix(process.env.BANK_LIBRARY_S3_PREFIX),
    endpoint: text("BANK_LIBRARY_S3_ENDPOINT"),
    // Both or neither: half a key pair would fail every request with a confusing message
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    hasPartialCredentials: Boolean(accessKeyId) !== Boolean(secretAccessKey),
    importChunk: int(process.env.BANK_LIBRARY_IMPORT_CHUNK, 50, { min: 1, max: 100 }),
    fetchConcurrency: int(process.env.BANK_LIBRARY_FETCH_CONCURRENCY, 10, { min: 1, max: 50 }),
    importJobs: int(process.env.BANK_LIBRARY_IMPORT_JOBS, 2, { min: 1, max: 5 }),
    importMaxQuestions: int(process.env.BANK_LIBRARY_IMPORT_MAX_QUESTIONS, 5000, { min: 1 }),
  };
}

/** Whether the library is switched on: a bucket is named */
const isConfigured = () => Boolean(getConfig().bucket);

module.exports = { getConfig, isConfigured, normalizePrefix };
